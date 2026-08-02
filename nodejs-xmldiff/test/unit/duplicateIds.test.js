'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { diffDocuments } = require('../../src/diffEngine');

const FIX = path.join(
  __dirname,
  '..',
  '..',
  'testdata',
  'out-of-scope',
  'U01-duplicate-ids'
);

describe('duplicate @id resilience (UWE)', () => {
  it('diffDocuments succeeds when chapter and title share @id', async () => {
    const oldXml = fs.readFileSync(path.join(FIX, 'old.xml'), 'utf8');
    const newXml = fs.readFileSync(path.join(FIX, 'new.xml'), 'utf8');
    const merged = await diffDocuments(oldXml, newXml, { textDiff: true });
    assert.match(merged, /<del>world<\/del>/);
    assert.match(merged, /<ins>universe<\/ins>/);
  });
});
