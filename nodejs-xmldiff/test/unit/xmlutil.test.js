'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  stripXmlDecl,
  canonicalizeXml,
  wrapDiffingInput,
} = require('../../src/xmlutil');

describe('xmlutil', () => {
  it('stripXmlDecl removes declaration', () => {
    assert.equal(stripXmlDecl('<?xml version="1.0"?><a/>'), '<a/>');
  });

  it('canonicalizeXml collapses whitespace between tags', () => {
    const a = canonicalizeXml('<doc>\n  <p>Hi</p>\n</doc>');
    const b = canonicalizeXml('<doc><p>Hi</p></doc>');
    assert.equal(a, b);
  });

  it('wrapDiffingInput embeds old and new', () => {
    const w = wrapDiffingInput('<a id="1"/>', '<a id="1"/>');
    assert.match(w, /<old-version>/);
    assert.match(w, /<new-version>/);
    assert.match(w, /<a id="1"\/>/);
  });
});
