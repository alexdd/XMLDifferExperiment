'use strict';

const fs = require('fs');
const path = require('path');
const SaxonJS = require('saxon-js');
const Diff = require('diff');
const { wrapDiffingInput, canonicalizeXml, stripXmlDecl } = require('./xmlutil');

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
    // Use SaxonJS compile API (same as xslt3 CLI)
    const result = await SaxonJS.transform(
      {
        stylesheetFileName: xslPath,
        destination: 'raw',
        // Compiling to SEF:
        stylesheetBaseURI: xslPath,
      },
      'async'
    ).catch(() => null);

    // Prefer xslt3 CLI for reliable SEF export
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

async function runDiff(oldXml, newXml) {
  const sefPath = await ensureSef('diff.xsl');
  const sourceText = wrapDiffingInput(oldXml, newXml);
  const output = await SaxonJS.transform(
    {
      stylesheetFileName: sefPath,
      sourceText,
      destination: 'serialized',
    },
    'async'
  );
  return output.principalResult;
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
 * Apply character-level textdiff to paired old/new changed leaves.
 * Mirrors textdiff.xsl + Python difflib step using jsdiff.
 */
function applyTextDiff(mergedXml) {
  // Replace consecutive old/new pairs with a single element containing <del>/<ins>
  // Work on serialized XML with a simple regex-safe approach via DOM from SaxonJS.
  // For robustness we use a lightweight scan.
  const re =
    /<([A-Za-z_][\w.-]*)([^>]*)\sdiffing-version="old"([^>]*)>([\s\S]*?)<\/\1>\s*<\1([^>]*)\sdiffing-version="new"([^>]*)>([\s\S]*?)<\/\1>/g;

  return mergedXml.replace(re, (match, name, a1, a2, oldText, b1, b2, newText) => {
    const attrs = `${a1}${a2}`
      .replace(/\sdiffing-version="old"/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const parts = Diff.diffWords(oldText, newText);
    let inner = '';
    for (const part of parts) {
      const escaped = escapeXml(part.value);
      if (part.added) inner += `<ins>${escaped}</ins>`;
      else if (part.removed) inner += `<del>${escaped}</del>`;
      else inner += escaped;
    }
    return `<${name} ${attrs}>${inner}</${name}>`;
  });
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Full pipeline: structural diff + optional word-level textdiff.
 * Roundtrip checks use structural merge (before word textdiff).
 */
async function diffDocuments(oldXml, newXml, { textDiff = false } = {}) {
  let merged = await runDiff(oldXml, newXml);
  if (textDiff) merged = applyTextDiff(merged);
  return merged;
}

async function roundtripCheck(oldXml, newXml) {
  const merged = await runDiff(oldXml, newXml);
  const gotOld = await reconstruct(merged, 'old');
  const gotNew = await reconstruct(merged, 'new');
  const oldOk = canonicalizeXml(gotOld) === canonicalizeXml(oldXml);
  const newOk = canonicalizeXml(gotNew) === canonicalizeXml(newXml);
  return {
    ok: oldOk && newOk,
    oldOk,
    newOk,
    merged,
    gotOld,
    gotNew,
    expectedOld: canonicalizeXml(oldXml),
    expectedNew: canonicalizeXml(newXml),
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
