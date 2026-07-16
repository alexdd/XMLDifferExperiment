# Node.js / SaxonJS XML Diff Port

Port and progressive exploration of the ID-based XSLT XML diffing algorithm from the repository root (`diff.xsl`, `README.md`).

## Product invariant

Every **element** in editor documents has a unique `@id` (assigned at insert time).
Diffing is an output format only; it does not write back into the editor.
Default fixtures (`L*` and `S*`) all satisfy this. Cases without element ids live under
`testdata/out-of-scope/`.

## S1000D bike samples (submodule)

Official ASD bike ZIPs are not published as a git repo. This project vendors
[`sheeksha/s1000d-bike-mini-csdb-explorer`](https://github.com/sheeksha/s1000d-bike-mini-csdb-explorer)
as a submodule under `vendor/s1000d-bike-mini-csdb-explorer` (contains
`data/S1000D_4-1_Bike_Samples/`).

```bash
git submodule update --init --recursive
cd nodejs-xmldiff
npm run generate:s1000d   # rebuild S01… fixtures from bike DMs
```

## Setup

```bash
# from repo root
git submodule update --init --recursive
cd nodejs-xmldiff
npm install
npm test
```

## Run progressive scenarios

```bash
npm test                       # L* + S*, enforces @id invariant
npm run test:level -- S10      # one level
npm run generate:s1000d        # regenerate S1000D fixtures from submodule
npm run test:out-of-scope      # anonymous / no-id documentation cases
```

## Layout

- `xslt/diff.xsl` – analyze / merge / textdiff prep
- `xslt/roundtrip.xsl` – reconstruct old or new from merge
- `src/diffEngine.js` – SaxonJS driver + jsdiff word diff
- `src/moveDetect.js` – LCS move detection
- `src/idInvariant.js` – unique `@id` checks for fixtures
- `src/s1000dPrep.js` – load/stamp bike DM `<content>`
- `scripts/generate-s1000d-scenarios.js` – build S01… from bike samples
- `testdata/LNN-*` – synthetic progressive fixtures
- `testdata/SNN-*` – S1000D bike-derived fixtures
- `testdata/out-of-scope/` – non-product cases without ids
- `../vendor/s1000d-bike-mini-csdb-explorer` – bike sample submodule
- `REPORT.md` – analysis and recommendations

## Roundtrip criterion

`diff(old, new)` → merge → reconstruct `old` / `new` → canonical XML equality.
