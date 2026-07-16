'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadStampedDita, loadMetadita, findAll, DITA_TEST_CASES, METADITA } =
  require('../../src/ditaPrep');

describe('ditaPrep', () => {
  it('vendor trees exist', () => {
    assert.ok(fs.existsSync(DITA_TEST_CASES));
    assert.ok(fs.existsSync(METADITA));
  });

  it('loadStampedDita stamps ids on task warehouse', () => {
    const doc = loadStampedDita(
      'content-references/conkeyref/topics/task-warehouse-01.dita'
    );
    assert.equal(doc.documentElement.localName || doc.documentElement.nodeName, 'task');
    const all = [];
    (function walk(el) {
      if (el.nodeType === 1) {
        all.push(el);
        for (let c = el.firstChild; c; c = c.nextSibling) walk(c);
      }
    })(doc.documentElement);
    assert.ok(all.every((e) => e.getAttribute('id')));
    assert.ok(findAll(doc.documentElement, 'cmd').length >= 1);
  });

  it('loadMetadita loads nested olul topic', () => {
    const doc = loadMetadita('nesting/olul.dita');
    assert.ok(findAll(doc.documentElement, 'ol').length >= 1);
  });
});
