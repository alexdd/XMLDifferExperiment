'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { execFileSync } = require('child_process');
const fs = require('fs');
const SaxonJS = require('saxon-js');

const XSLT = path.join(__dirname, '..', '..', 'xslt');
const SEF = path.join(__dirname, '..', '..', 'sef', 'test-diff-lib.sef.json');

describe('XSLT diff-lib functions', () => {
  before(() => {
    fs.mkdirSync(path.dirname(SEF), { recursive: true });
    const xslt3 = require.resolve('xslt3/xslt3.js');
    execFileSync(
      process.execPath,
      [
        xslt3,
        `-xsl:${path.join(XSLT, 'test-diff-lib.xsl')}`,
        `-export:${SEF}`,
        '-nogo',
      ],
      { stdio: 'pipe' }
    );
  });

  it('all function unit tests pass', async () => {
    const out = await SaxonJS.transform(
      {
        stylesheetFileName: SEF,
        // dummy source; stylesheet ignores it
        sourceText: '<?xml version="1.0"?><dummy/>',
        destination: 'serialized',
        stylesheetParams: {
          'moved-ids': ['m1', 'm2'],
        },
      },
      'async'
    );
    const xml = out.principalResult;
    assert.match(xml, /ok="true"/, xml);
    assert.match(xml, /failed="0"/, xml);
    // spot-check individual cases present
    assert.match(xml, /name="attrs-ignore-id" pass="true"/);
    assert.match(xml, /name="is-absent-moved" pass="true"/);
    assert.match(xml, /name="has-text-mixed" pass="true"/);
  });
});
