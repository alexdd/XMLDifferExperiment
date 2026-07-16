# Node.js / SaxonJS XML Diff Port

Port and progressive exploration of the ID-based XSLT XML diffing algorithm from the repository root (`diff.xsl`, `README.md`).

## Setup

```bash
cd nodejs-xmldiff
npm install
npm test
```

## Run progressive scenarios

```bash
npm test                  # stops at first roundtrip failure
npm run test:level -- L14 # run one level
```

## Layout

- `xslt/diff.xsl` – analyze / merge / textdiff prep
- `xslt/roundtrip.xsl` – reconstruct old or new from merge
- `src/diffEngine.js` – SaxonJS driver + jsdiff word diff
- `src/moveDetect.js` – LCS move detection
- `testdata/LNN-*` – progressive fixtures (`old.xml`, `new.xml`, `meta.json`)
- `REPORT.md` – limits of the methodology and next-step proposals

## Roundtrip criterion

`diff(old, new)` → merge → reconstruct `old` / `new` → canonical XML equality.
