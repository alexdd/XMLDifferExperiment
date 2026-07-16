# Node.js / SaxonJS XML Diff Port

Port and progressive exploration of the ID-based XSLT XML diffing algorithm from the repository root (`diff.xsl`, `README.md`).

## Product invariant

Every **element** in editor documents has a unique `@id` (assigned at insert time).
Diffing is an output format only; it does not write back into the editor.
Default fixtures (`L*` and `S*`) all satisfy this. Cases without element ids live under
`testdata/out-of-scope/`.

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
npm test                       # unit + L*/S*/D*/X* scenarios
npm run test:unit              # JS + XSLT function tests
npm run test:scenarios         # progressive roundtrips only
npm run test:level -- D10      # one level
npm run generate:fixtures      # regenerate from submodules
```

## Layout

- `xslt/diff-lib.xsl` – shared XSLT functions (unit-tested)
- `xslt/diff.xsl` / `roundtrip.xsl` – analyze / merge / reconstruct
- `xslt/test-diff-lib.xsl` – XSLT function test harness
- `src/*.js` – SaxonJS driver, LCS moves, prep helpers
- `test/unit/` – Node unit tests
- `testdata/L*` – synthetic ladder
- `testdata/S*` – S1000D bike-derived
- `testdata/D*` – DITA sample-derived
- `testdata/X*` – invented deep/mixed stress cases
- `REPORT.md` – analysis and recommendations

## Roundtrip criterion

`diff(old, new)` → merge → reconstruct `old` / `new` → canonical XML equality.
