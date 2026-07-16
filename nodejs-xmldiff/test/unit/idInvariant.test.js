'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { checkUniqueIds, assertEditorDocumentIds } = require('../../src/idInvariant');

describe('idInvariant', () => {
  it('accepts unique ids', () => {
    assert.deepEqual(checkUniqueIds('<a id="1"><b id="2"/></a>', 't'), []);
  });

  it('reports missing id', () => {
    const errs = checkUniqueIds('<a id="1"><b/></a>', 't');
    assert.ok(errs.some((e) => e.includes('missing @id')));
  });

  it('reports duplicate id', () => {
    const errs = checkUniqueIds('<a id="1"><b id="1"/></a>', 't');
    assert.ok(errs.some((e) => e.includes('duplicate')));
  });

  it('assertEditorDocumentIds throws on violation', () => {
    assert.throws(
      () => assertEditorDocumentIds('<a/>', '<a id="1"/>'),
      (err) => err.code === 'ID_INVARIANT'
    );
  });

  it('assertEditorDocumentIds passes valid pair', () => {
    assert.doesNotThrow(() =>
      assertEditorDocumentIds('<a id="1"/>', '<a id="1"/>')
    );
  });
});
