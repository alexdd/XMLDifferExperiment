'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  stripDoctype,
  parseXml,
  serialize,
  stampEditorIds,
  findAll,
  localName,
} = require('../../src/s1000dPrep');

describe('s1000dPrep', () => {
  it('stripDoctype removes DTD subset', () => {
    const xml = `<!DOCTYPE dmodule[ <!ENTITY x SYSTEM "a"> ]><dmodule/>`;
    assert.equal(stripDoctype(xml).trim(), '<dmodule/>');
  });

  it('stampEditorIds assigns missing ids and keeps existing', () => {
    const doc = parseXml('<root><a id="keep"/><b/><c/></root>');
    stampEditorIds(doc.documentElement);
    const ids = findAll(doc.documentElement, 'a')
      .concat(findAll(doc.documentElement, 'b'))
      .concat(findAll(doc.documentElement, 'c'))
      .map((e) => e.getAttribute('id'));
    assert.equal(ids[0], 'keep');
    assert.ok(ids[1]);
    assert.ok(ids[2]);
    assert.notEqual(ids[1], ids[2]);
  });

  it('serialize roundtrips element name', () => {
    const doc = parseXml('<topic id="t"><title id="x">Hi</title></topic>');
    const out = serialize(doc.documentElement);
    assert.match(out, /<topic /);
    assert.equal(localName(doc.documentElement), 'topic');
  });
});
