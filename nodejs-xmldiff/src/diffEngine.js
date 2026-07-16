'use strict';

const fs = require('fs');
const path = require('path');
const SaxonJS = require('saxon-js');
const Diff = require('diff');
const { wrapDiffingInput, canonicalizeXml, stripXmlDecl } = require('./xmlutil');
const { findMovedIds } = require('./moveDetect');
const { applyIgnoreSet, isEmptyIgnore } = require('./ignoreSet');
const { refineMixedContent } = require('./mixedContentDiff');

const XSLT_DIR = path.join(__dirname, '..', 'xslt');
const SEF_DIR = path.join(__dirname, '..', 'sef');

async function ensureSef(xslName) {
  const xslPath = path.join(XSLT_DIR, xslName);
  const sefPath = path.join(SEF_DIR, xslName.replace(/\.xsl$/, '.sef.json'));
  fs.mkdirSync(SEF_DIR, { recursive: true });

  const xslStat = fs.statSync(xslPath);
  let needsCompile = !fs.existsSync(sefPath);
  if (!needsCompile) {
    const sefStat = fs.statSync(sefPath);
    needsCompile = xslStat.mtimeMs > sefStat.mtimeMs;
  }
  if (needsCompile) {
    await SaxonJS.transform(
      {
        stylesheetFileName: xslPath,
        destination: 'raw',
        stylesheetBaseURI: xslPath,
      },
      'async'
    ).catch(() => null);

    const { execFileSync } = require('child_process');
    const xslt3 = require.resolve('xslt3/xslt3.js');
    execFileSync(
      process.execPath,
      [xslt3, `-xsl:${xslPath}`, `-export:${sefPath}`, '-nogo', '-t'],
      { stdio: 'pipe' }
    );
  }
  return sefPath;
}

async function compileAll() {
  await ensureSef('diff.xsl');
  await ensureSef('roundtrip.xsl');
}

/**
 * @param {string} oldXml
 * @param {string} newXml
 * @param {{ ignore?: object, refineMixed?: boolean, wordDiff?: boolean }} [options]
 */
async function runDiff(oldXml, newXml, options = {}) {
  const ignore = options.ignore;
  const refineMixed = options.refineMixed !== false;
  const wordDiff = Boolean(options.wordDiff);

  let oldIn = oldXml;
  let newIn = newXml;
  if (ignore && !isEmptyIgnore(ignore)) {
    oldIn = applyIgnoreSet(oldXml, ignore);
    newIn = applyIgnoreSet(newXml, ignore);
  }

  const sefPath = await ensureSef('diff.xsl');
  const sourceText = wrapDiffingInput(oldIn, newIn);
  const movedIds = findMovedIds(oldIn, newIn);
  const output = await SaxonJS.transform(
    {
      stylesheetFileName: sefPath,
      sourceText,
      destination: 'serialized',
      stylesheetParams: {
        'moved-ids': movedIds,
      },
    },
    'async'
  );
  let merged = output.principalResult;
  if (refineMixed) {
    merged = refineMixedContent(merged, oldIn, newIn, { wordDiff });
  }
  return merged;
}

async function reconstruct(mergedXml, view) {
  const sefPath = await ensureSef('roundtrip.xsl');
  const output = await SaxonJS.transform(
    {
      stylesheetFileName: sefPath,
      sourceText: mergedXml.startsWith('<?xml')
        ? mergedXml
        : `<?xml version="1.0"?>${mergedXml}`,
      destination: 'serialized',
      stylesheetParams: {
        view,
      },
    },
    'async'
  );
  return output.principalResult;
}

/**
 * Apply character-level textdiff to paired old/new changed leaves and _diff_text pairs.
 */
function applyTextDiff(mergedXml) {
  let out = mergedXml;

  // Fine mixed-content markers (`_diff_text` with diffing-version)
  out = out.replace(
    /<_diff_text\s+diffing-version="old">([\s\S]*?)<\/_diff_text>\s*<_diff_text\s+diffing-version="new">([\s\S]*?)<\/_diff_text>/g,
    (_, oldText, newText) => wordDiffHtml(oldText, newText)
  );

  // Leaf dual elements
  const re =
    /<([A-Za-z_][\w.-]*)([^>]*)\sdiffing-version="old"([^>]*)>([\s\S]*?)<\/\1>\s*<\1([^>]*)\sdiffing-version="new"([^>]*)>([\s\S]*?)<\/\1>/g;

  out = out.replace(re, (match, name, a1, a2, oldText, b1, b2, newText) => {
    const attrs = `${a1}${a2}`
      .replace(/\sdiffing-version="old"/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `<${name} ${attrs}>${wordDiffHtml(oldText, newText)}</${name}>`;
  });

  return out;
}

function wordDiffHtml(oldText, newText) {
  const parts = Diff.diffWords(oldText, newText);
  let inner = '';
  for (const part of parts) {
    const escaped = escapeXml(part.value);
    if (part.added) inner += `<ins>${escaped}</ins>`;
    else if (part.removed) inner += `<del>${escaped}</del>`;
    else inner += escaped;
  }
  return inner;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Full pipeline: structural diff + mixed refine + optional word-level textdiff.
 */
async function diffDocuments(oldXml, newXml, options = {}) {
  const { textDiff = false, ignore, wordDiff = false } = options;
  let merged = await runDiff(oldXml, newXml, {
    ignore,
    refineMixed: true,
    wordDiff: wordDiff && !textDiff,
  });
  if (textDiff) merged = applyTextDiff(merged);
  return merged;
}

/**
 * Roundtrip check. When ignore is set, both sides are filtered first and
 * reconstruction is compared to the filtered originals.
 */
async function roundtripCheck(oldXml, newXml, options = {}) {
  const ignore = options.ignore;
  let oldExpect = oldXml;
  let newExpect = newXml;
  if (ignore && !isEmptyIgnore(ignore)) {
    oldExpect = applyIgnoreSet(oldXml, ignore);
    newExpect = applyIgnoreSet(newXml, ignore);
  }

  const merged = await runDiff(oldXml, newXml, {
    ignore,
    refineMixed: options.refineMixed !== false,
    wordDiff: false, // roundtrip needs _diff_text duals, not display del/ins
  });
  const gotOld = await reconstruct(merged, 'old');
  const gotNew = await reconstruct(merged, 'new');
  const oldOk = canonicalizeXml(gotOld) === canonicalizeXml(oldExpect);
  const newOk = canonicalizeXml(gotNew) === canonicalizeXml(newExpect);
  return {
    ok: oldOk && newOk,
    oldOk,
    newOk,
    merged,
    gotOld,
    gotNew,
    expectedOld: canonicalizeXml(oldExpect),
    expectedNew: canonicalizeXml(newExpect),
    actualOld: canonicalizeXml(gotOld),
    actualNew: canonicalizeXml(gotNew),
  };
}

module.exports = {
  compileAll,
  runDiff,
  reconstruct,
  applyTextDiff,
  diffDocuments,
  roundtripCheck,
  canonicalizeXml,
  stripXmlDecl,
};
