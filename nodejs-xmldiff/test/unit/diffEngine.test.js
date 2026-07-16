'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  runDiff,
  reconstruct,
  roundtripCheck,
  applyTextDiff,
  canonicalizeXml,
} = require('../../src/diffEngine');

describe('diffEngine', () => {
  it('runDiff marks changed leaf text', async () => {
    const oldXml = '<doc id="d"><p id="p">A</p></doc>';
    const newXml = '<doc id="d"><p id="p">B</p></doc>';
    const merged = await runDiff(oldXml, newXml);
    assert.match(merged, /diffing-version="old"/);
    assert.match(merged, /diffing-version="new"/);
  });

  it('roundtripCheck succeeds for text change', async () => {
    const oldXml = '<doc id="d"><p id="p">Hello</p></doc>';
    const newXml = '<doc id="d"><p id="p">World</p></doc>';
    const r = await roundtripCheck(oldXml, newXml);
    assert.equal(r.ok, true);
  });

  it('reconstruct drops deleted nodes for new view', async () => {
    const oldXml = '<doc id="d"><p id="p1">A</p><p id="p2">B</p></doc>';
    const newXml = '<doc id="d"><p id="p1">A</p></doc>';
    const merged = await runDiff(oldXml, newXml);
    const neu = await reconstruct(merged, 'new');
    assert.equal(canonicalizeXml(neu), canonicalizeXml(newXml));
    const alt = await reconstruct(merged, 'old');
    assert.equal(canonicalizeXml(alt), canonicalizeXml(oldXml));
  });

  it('applyTextDiff inserts del/ins tags', () => {
    const xml =
      '<p diffing="changed" id="p" diffing-version="old">hello world</p>' +
      '<p diffing="changed" id="p" diffing-version="new">hello there</p>';
    const out = applyTextDiff(xml);
    assert.match(out, /<del>/);
    assert.match(out, /<ins>/);
    assert.doesNotMatch(out, /diffing-version/);
  });
});
