'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  tokenize,
  lcsAlign,
  tokenEqual,
  refineMixedContent,
  wordDiff,
} = require('../../src/mixedContentDiff');
const { DOMParser } = require('@xmldom/xmldom');
const { runDiff, roundtripCheck, applyTextDiff } = require('../../src/diffEngine');
const { canonicalizeXml } = require('../../src/xmlutil');

describe('mixedContentDiff primitives', () => {
  it('tokenizes text and identified elements', () => {
    const doc = new DOMParser().parseFromString(
      '<p id="p">Hello <em id="e">world</em> today</p>',
      'application/xml'
    );
    const toks = tokenize(doc.documentElement);
    assert.deepEqual(
      toks.map((t) => (t.kind === 'text' ? t.value : t.id)),
      ['Hello ', 'e', ' today']
    );
  });

  it('aligns changed trailing text around stable element', () => {
    const a = [
      { kind: 'text', value: 'Hello ' },
      { kind: 'el', id: 'e' },
      { kind: 'text', value: ' today' },
    ];
    const b = [
      { kind: 'text', value: 'Hello ' },
      { kind: 'el', id: 'e' },
      { kind: 'text', value: ' tomorrow' },
    ];
    const ops = lcsAlign(a, b, tokenEqual);
    assert.equal(ops.filter((o) => o.op === 'eq').length, 2);
    assert.equal(ops.some((o) => o.op === 'del' && o.a.value === ' today'), true);
    assert.equal(ops.some((o) => o.op === 'ins' && o.b.value === ' tomorrow'), true);
  });

  it('wordDiff splits on whitespace', () => {
    const ops = wordDiff('hello world', 'hello there');
    assert.ok(ops.some((o) => o.op === 'del' && o.a === 'world'));
    assert.ok(ops.some((o) => o.op === 'ins' && o.b === 'there'));
  });
});

describe('refineMixedContent', () => {
  it('emits _diff_text markers for surrounding text changes', () => {
    const oldXml = '<doc id="d"><p id="p">Hello <em id="e">world</em> today</p></doc>';
    const newXml = '<doc id="d"><p id="p">Hello <em id="e">world</em> tomorrow</p></doc>';
    // merge-like input: new text only (as XSLT merge would leave it)
    const merged =
      '<doc id="d" diffing="changed"><p id="p" diffing="changed">' +
      'Hello <em id="e" diffing="unchanged">world</em> tomorrow</p></doc>';
    const out = refineMixedContent(merged, oldXml, newXml, { wordDiff: false });
    assert.match(out, /<_diff_text diffing-version="old"> today<\/_diff_text>/);
    assert.match(out, /<_diff_text diffing-version="new"> tomorrow<\/_diff_text>/);
    assert.match(out, /<em[^>]*id="e"/);
  });

  it('roundtrips mixed content with identified children via engine', async () => {
    const oldXml =
      '<?xml version="1.0"?><doc id="d"><p id="p">Hello <em id="e">world</em> today</p></doc>';
    const newXml =
      '<?xml version="1.0"?><doc id="d"><p id="p">Hello <em id="e">universe</em> tomorrow</p></doc>';
    const r = await roundtripCheck(oldXml, newXml);
    assert.equal(r.ok, true, `oldOk=${r.oldOk} newOk=${r.newOk}`);
    assert.match(r.merged, /_diff_text/);
  });
});

describe('applyTextDiff on _diff_text', () => {
  it('collapses adjacent _diff_text into del/ins', () => {
    const xml =
      '<p id="p">Hello <_diff_text diffing-version="old">today</_diff_text>' +
      '<_diff_text diffing-version="new">tomorrow</_diff_text></p>';
    const out = applyTextDiff(xml);
    assert.match(out, /<del>today<\/del>/);
    assert.match(out, /<ins>tomorrow<\/ins>/);
    assert.doesNotMatch(out, /_diff_text/);
  });
});

describe('ignore + mixed via engine', () => {
  it('roundtrip ignores rev attribute differences', async () => {
    const oldXml = '<doc id="d" rev="1"><p id="p">A</p></doc>';
    const newXml = '<doc id="d" rev="2"><p id="p">A</p></doc>';
    const r = await roundtripCheck(oldXml, newXml, { ignore: { attributes: ['rev'] } });
    assert.equal(r.ok, true);
    assert.equal(canonicalizeXml(r.expectedOld), canonicalizeXml('<doc id="d"><p id="p">A</p></doc>'));
  });

  it('runDiff produces no change markers when only ignored attrs differ', async () => {
    const oldXml = '<doc id="d" rev="1"><p id="p">A</p></doc>';
    const newXml = '<doc id="d" rev="2"><p id="p">A</p></doc>';
    const merged = await runDiff(oldXml, newXml, { ignore: { attributes: ['rev'] } });
    assert.doesNotMatch(merged, /diffing-version="old"/);
  });
});
