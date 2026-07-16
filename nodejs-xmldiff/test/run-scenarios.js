'use strict';

const fs = require('fs');
const path = require('path');
const { roundtripCheck, compileAll } = require('../src/diffEngine');

const DATA = path.join(__dirname, '..', 'testdata');

function loadPair(levelDir) {
  const oldXml = fs.readFileSync(path.join(levelDir, 'old.xml'), 'utf8');
  const newXml = fs.readFileSync(path.join(levelDir, 'new.xml'), 'utf8');
  const metaPath = path.join(levelDir, 'meta.json');
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    : { name: path.basename(levelDir) };
  return { oldXml, newXml, meta, levelDir };
}

async function runLevel(levelName) {
  const levelDir = path.join(DATA, levelName);
  const { oldXml, newXml, meta } = loadPair(levelDir);
  console.log(`\n=== ${levelName}: ${meta.name || meta.description || ''} ===`);
  if (meta.description) console.log(`  ${meta.description}`);

  const result = await roundtripCheck(oldXml, newXml);

  const outDir = path.join(levelDir, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'merged.xml'), result.merged);
  fs.writeFileSync(path.join(outDir, 'reconstructed-old.xml'), result.gotOld);
  fs.writeFileSync(path.join(outDir, 'reconstructed-new.xml'), result.gotNew);

  if (result.ok) {
    console.log('  ROUNDTRIP OK');
    return { levelName, ok: true, meta };
  }

  console.log('  ROUNDTRIP FAILED');
  console.log(`  oldOk=${result.oldOk} newOk=${result.newOk}`);
  if (!result.oldOk) {
    console.log('  --- expected old ---');
    console.log('  ' + result.expectedOld);
    console.log('  --- actual old ---');
    console.log('  ' + result.actualOld);
  }
  if (!result.newOk) {
    console.log('  --- expected new ---');
    console.log('  ' + result.expectedNew);
    console.log('  --- actual new ---');
    console.log('  ' + result.actualNew);
  }
  return { levelName, ok: false, meta, result };
}

async function main() {
  const only = process.argv[2]; // optional level name
  await compileAll();

  const levels = fs
    .readdirSync(DATA)
    .filter((d) => fs.statSync(path.join(DATA, d)).isDirectory())
    .filter((d) => d.match(/^L\d+/))
    .sort();

  const selected = only ? levels.filter((l) => l === only || l.startsWith(only)) : levels;
  if (selected.length === 0) {
    console.error('No levels found' + (only ? ` matching ${only}` : ''));
    process.exit(2);
  }

  const results = [];
  for (const level of selected) {
    const r = await runLevel(level);
    results.push(r);
    // Stop on first failure when running the progressive suite
    if (!r.ok && !only) {
      console.log(`\nStopped at ${level} (progressive suite: do not continue past failure).`);
      break;
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
