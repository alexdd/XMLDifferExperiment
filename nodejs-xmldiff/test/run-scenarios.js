'use strict';

const fs = require('fs');
const path = require('path');
const { roundtripCheck, compileAll } = require('../src/diffEngine');
const { assertEditorDocumentIds } = require('../src/idInvariant');

const DATA = path.join(__dirname, '..', 'testdata');
const OUT_OF_SCOPE = path.join(DATA, 'out-of-scope');

function loadPair(levelDir) {
  const oldXml = fs.readFileSync(path.join(levelDir, 'old.xml'), 'utf8');
  const newXml = fs.readFileSync(path.join(levelDir, 'new.xml'), 'utf8');
  const metaPath = path.join(levelDir, 'meta.json');
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    : { name: path.basename(levelDir) };
  return { oldXml, newXml, meta, levelDir };
}

function listLevels(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((d) => fs.statSync(path.join(dir, d)).isDirectory())
    .filter((d) => d.match(/^[LS]\d+/))
    .sort();
}

async function runLevel(levelName, levelDir, { enforceIds }) {
  const { oldXml, newXml, meta } = loadPair(levelDir);
  console.log(`\n=== ${levelName}: ${meta.name || meta.description || ''} ===`);
  if (meta.description) console.log(`  ${meta.description}`);

  if (enforceIds) {
    try {
      assertEditorDocumentIds(oldXml, newXml);
    } catch (err) {
      if (err.code === 'ID_INVARIANT') {
        console.log('  ID INVARIANT FAILED');
        console.log(err.message);
        return { levelName, ok: false, meta, invariantFailure: true };
      }
      throw err;
    }
  }

  const result = await roundtripCheck(oldXml, newXml);

  const outDir = path.join(levelDir, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'merged.xml'), result.merged);
  fs.writeFileSync(path.join(outDir, 'reconstructed-old.xml'), result.gotOld);
  fs.writeFileSync(path.join(outDir, 'reconstructed-new.xml'), result.gotNew);

  if (result.ok) {
    if (meta.expectedFailure) {
      console.log('  ROUNDTRIP OK (UNEXPECTED — marked expectedFailure)');
      return { levelName, ok: false, unexpectedPass: true, meta };
    }
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
  if (meta.expectedFailure) {
    console.log('  EXPECTED METHODOLOGICAL LIMIT');
    if (meta.failureReason) console.log('  ' + meta.failureReason);
    return { levelName, ok: true, expectedFailure: true, meta, result };
  }
  return { levelName, ok: false, meta, result };
}

async function main() {
  const args = process.argv.slice(2);
  const runOutOfScope = args.includes('--out-of-scope');
  const only = args.find((a) => !a.startsWith('--'));

  await compileAll();

  /** @type {{ name: string, dir: string, enforceIds: boolean }[]} */
  let jobs = listLevels(DATA).map((name) => ({
    name,
    dir: path.join(DATA, name),
    enforceIds: true,
  }));

  if (runOutOfScope) {
    jobs = listLevels(OUT_OF_SCOPE).map((name) => ({
      name,
      dir: path.join(OUT_OF_SCOPE, name),
      enforceIds: false,
    }));
  }

  if (only) {
    // allow addressing either in-scope or out-of-scope by name
    const inScope = jobs.filter((j) => j.name === only || j.name.startsWith(only));
    if (inScope.length) {
      jobs = inScope;
    } else {
      const oos = listLevels(OUT_OF_SCOPE)
        .filter((n) => n === only || n.startsWith(only))
        .map((name) => ({
          name,
          dir: path.join(OUT_OF_SCOPE, name),
          enforceIds: false,
        }));
      jobs = oos;
    }
  }

  if (jobs.length === 0) {
    console.error('No levels found' + (only ? ` matching ${only}` : ''));
    process.exit(2);
  }

  if (!runOutOfScope && !only) {
    console.log(
      'Product invariant: every element in fixtures has a unique @id (editor documents).'
    );
  }

  const results = [];
  for (const job of jobs) {
    const r = await runLevel(job.name, job.dir, { enforceIds: job.enforceIds });
    results.push(r);
    if (!r.ok && !only) {
      console.log(
        `\nStopped at ${job.name} (progressive suite: do not continue past unexpected failure).`
      );
      break;
    }
  }

  const failed = results.filter((r) => !r.ok);
  const expectedLimits = results.filter((r) => r.expectedFailure);
  console.log(
    `\nSummary: ${results.length - failed.length}/${results.length} passed` +
      (expectedLimits.length
        ? ` (${expectedLimits.length} expected methodological limit(s))`
        : '')
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
