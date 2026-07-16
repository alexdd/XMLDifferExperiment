'use strict';

/**
 * Product invariant: every element in editor documents has a unique @id.
 * Text/comment/PI nodes are exempt (they are not addressable editor elements).
 */

function checkUniqueIds(xml, label) {
  const errors = [];
  const seen = new Set();
  const tokenizer = /<\/?([A-Za-z_][\w.-]*)([^>]*?)\/?>/g;
  let match;
  while ((match = tokenizer.exec(xml))) {
    const full = match[0];
    if (full.startsWith('</')) continue;
    const name = match[1];
    // skip internal diff bookkeeping elements if present
    if (name.startsWith('_diff') || name === 'merge-result') continue;
    const attrs = match[2] || '';
    const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/);
    if (!idMatch) {
      errors.push(`${label}: <${name}> missing @id`);
      continue;
    }
    const id = idMatch[1];
    if (seen.has(id)) {
      errors.push(`${label}: duplicate @id "${id}"`);
    }
    seen.add(id);
  }
  return errors;
}

function assertEditorDocumentIds(oldXml, newXml) {
  const errors = [
    ...checkUniqueIds(oldXml, 'old'),
    ...checkUniqueIds(newXml, 'new'),
  ];
  if (errors.length) {
    const err = new Error(
      'Product invariant violated (every element must have a unique @id):\n  ' +
        errors.join('\n  ')
    );
    err.code = 'ID_INVARIANT';
    throw err;
  }
}

module.exports = { checkUniqueIds, assertEditorDocumentIds };
