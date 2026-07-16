'use strict';

/**
 * Lightweight XML helpers for canonical comparison (no full DOM needed).
 * Uses SaxonJS for parse/serialize when available.
 */

function stripXmlDecl(xml) {
  return String(xml).replace(/^\s*<\?xml[^?]*\?>\s*/i, '').trim();
}

/** Collapse whitespace between tags and trim text nodes for stable compare. */
function canonicalizeXml(xml) {
  let s = stripXmlDecl(xml);
  // remove indentation / newlines between tags
  s = s.replace(/>\s+</g, '><');
  // normalize whitespace inside text
  s = s.replace(/>([^<]*)</g, (_, text) => {
    const norm = text.replace(/\s+/g, ' ').trim();
    return `>${norm}<`;
  });
  // self-heal empty: <a></a> stays
  return s;
}

function wrapDiffingInput(oldXml, newXml) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<diffing>
  <old-version>
${stripXmlDecl(oldXml)}
  </old-version>
  <new-version>
${stripXmlDecl(newXml)}
  </new-version>
</diffing>`;
}

module.exports = {
  stripXmlDecl,
  canonicalizeXml,
  wrapDiffingInput,
};
