'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lcsSet, findMovedIds, indexById } = require('../../src/moveDetect');

describe('moveDetect.lcsSet', () => {
  it('keeps common subsequence', () => {
    const s = lcsSet(['a', 'b', 'c'], ['a', 'x', 'b', 'c']);
    assert.deepEqual([...s], ['a', 'b', 'c']);
  });

  it('marks reorder outsiders', () => {
    const s = lcsSet(['a', 'b', 'c'], ['c', 'a', 'b']);
    assert.ok(s.has('a') && s.has('b'));
    assert.equal(s.has('c'), false);
  });
});

describe('moveDetect.indexById', () => {
  it('indexes parent/child relations', () => {
    const { byId, children } = indexById(
      '<doc id="d"><p id="p1"/><p id="p2"/></doc>'
    );
    assert.equal(byId.get('p1').parentId, 'd');
    assert.deepEqual(children.get('d'), ['p1', 'p2']);
  });
});

describe('moveDetect.findMovedIds', () => {
  it('detects cross-parent move', () => {
    const oldXml = '<d id="r"><s id="s1"><p id="p"/></s><s id="s2"/></d>';
    const newXml = '<d id="r"><s id="s1"/><s id="s2"><p id="p"/></s></d>';
    assert.deepEqual(findMovedIds(oldXml, newXml), ['p']);
  });

  it('does not false-positive on insert before survivor', () => {
    const oldXml = '<d id="r"><p id="a"/><p id="b"/><p id="c"/></d>';
    const newXml = '<d id="r"><p id="a"/><p id="x"/><p id="b"/><p id="c"/></d>';
    assert.deepEqual(findMovedIds(oldXml, newXml), []);
  });

  it('detects sibling reorder', () => {
    const oldXml = '<d id="r"><p id="a"/><p id="b"/><p id="c"/></d>';
    const newXml = '<d id="r"><p id="c"/><p id="a"/><p id="b"/></d>';
    const moved = findMovedIds(oldXml, newXml);
    assert.ok(moved.includes('c'));
  });
});
