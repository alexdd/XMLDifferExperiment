# Node.js / SaxonJS XML Diff Port

Port and progressive exploration of the ID-based XSLT XML diffing algorithm from the repository root (`diff.xsl`, `README.md`).

## Product invariant

Every **element** in editor documents has a unique `@id` (assigned at insert time).
Diffing is an output format only; it does not write back into the editor.
Default fixtures (`L*`, `S*`, `D*`, `X*`, `M*`) all satisfy this. Cases without element ids live under
`testdata/out-of-scope/`.

## Mixed-content refine + ignore set

- **Fine mixed-content textdiff** (`src/mixedContentDiff.js`): after the structural XSLT merge, identified parents with text + `@id` children are realigned from old/new. Text changes become `_diff_text` markers (`diffing-version` old/new) instead of dual-snapshotting the whole parent. Anonymous (no-id) element children still use XSLT dual-snapshots.
- **Configurable ignore set** (`src/ignoreSet.js`): pass `{ attributes: [...], elements: [...] }` to `runDiff` / `roundtripCheck` / `diffDocuments`, or set `"ignore"` in a scenario `meta.json`. Ignored attrs/elements are stripped before compare; roundtrip expects the filtered trees.

```js
const { diffDocuments, roundtripCheck } = require('./src/diffEngine');

await diffDocuments(oldXml, newXml, {
  ignore: { attributes: ['rev'], elements: ['draft-comment'] },
  textDiff: true, // collapse paired markers to <del>/<ins>
});
```

## Sample data submodules

```bash
git submodule update --init --recursive
```

| Submodule | Source |
|---|---|
| `vendor/s1000d-bike-mini-csdb-explorer` | S1000D 4.1 Bike Samples |
| `vendor/dita-test-cases` | [dita-community/dita-test-cases](https://github.com/dita-community/dita-test-cases) (Apache-2.0) |
| `vendor/metadita-sampledocs` | [robander/metadita-sampledocs](https://github.com/robander/metadita-sampledocs) (Apache-2.0) |

```bash
cd nodejs-xmldiff
npm run generate:fixtures   # rebuild S* + D* + X* from vendor samples
```

## Setup

```bash
# from repo root
git submodule update --init --recursive
cd nodejs-xmldiff
npm install
npm test                    # unit tests + scenario roundtrips
```

## Run tests

```bash
npm test                       # unit + L*/S*/D*/X*/M* scenarios
npm run test:unit              # JS + XSLT function tests
npm run test:scenarios         # progressive roundtrips only
npm run test:level -- M01      # one level
npm run generate:fixtures      # regenerate from submodules
```

## Layout

- `xslt/diff-lib.xsl` – shared XSLT functions (unit-tested)
- `xslt/diff.xsl` / `roundtrip.xsl` – analyze / merge / reconstruct
- `xslt/test-diff-lib.xsl` – XSLT function test harness
- `src/*.js` – SaxonJS driver, LCS moves, mixed refine, ignore set, prep helpers
- `test/unit/` – Node unit tests
- `testdata/L*` – synthetic ladder
- `testdata/S*` – S1000D bike-derived
- `testdata/D*` – DITA sample-derived
- `testdata/X*` – invented deep/mixed stress cases
- `testdata/M*` – fine mixed-content + ignore-set scenarios
- `REPORT.md` – analysis and recommendations

## Roundtrip criterion

`diff(old, new)` → merge → reconstruct `old` / `new` → canonical XML equality.
