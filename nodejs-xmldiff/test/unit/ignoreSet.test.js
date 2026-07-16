'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { applyIgnoreSet, isEmptyIgnore, normalizeIgnore } = require('../../src/ignoreSet');
const { canonicalizeXml } = require('../../src/xmlutil');

describe('ignoreSet', () => {
  it('isEmptyIgnore for missing/empty config', () => {
    assert.equal(isEmptyIgnore(null), true);
    assert.equal(isEmptyIgnore({}), true);
    assert.equal(isEmptyIgnore({ attributes: [], elements: [] }), true);
  });

  it('normalizeIgnore builds sets', () => {
    const n = normalizeIgnore({ attributes: ['rev'], elements: ['draft-comment'] });
    assert.equal(n.attributes.has('rev'), true);
    assert.equal(n.elements.has('draft-comment'), true);
  });

  it('strips ignored attributes', () => {
    const xml = '<doc id="d" rev="1"><p id="p" rev="2">x</p></doc>';
    const out = applyIgnoreSet(xml, { attributes: ['rev'] });
    assert.equal(
      canonicalizeXml(out),
      canonicalizeXml('<doc id="d"><p id="p">x</p></doc>')
    );
  });

  it('removes ignored elements', () => {
    const xml =
      '<doc id="d"><draft-comment id="c">secret</draft-comment><p id="p">ok</p></doc>';
    const out = applyIgnoreSet(xml, { elements: ['draft-comment'] });
    assert.equal(
      canonicalizeXml(out),
      canonicalizeXml('<doc id="d"><p id="p">ok</p></doc>')
    );
  });

  it('combines attribute and element ignores', () => {
    const xml =
      '<doc id="d" rev="9"><meta id="m">x</meta><p id="p" rev="1">y</p></doc>';
    const out = applyIgnoreSet(xml, { attributes: ['rev'], elements: ['meta'] });
    assert.equal(
      canonicalizeXml(out),
      canonicalizeXml('<doc id="d"><p id="p">y</p></doc>')
    );
  });
});
