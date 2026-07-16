# Node.js / SaxonJS XML Diff Port

Port and progressive exploration of the ID-based XSLT XML diffing algorithm from the repository root (`diff.xsl`, `README.md`).

## Product invariant

Every **element** in editor documents has a unique `@id` (assigned at insert time).
Diffing is an output format only; it does not write back into the editor.
Default fixtures (L01–L18) all satisfy this. Cases without element ids live under
`testdata/out-of-scope/`.

## Setup

```bash
cd nodejs-xmldiff
npm install
npm test
```

## Run progressive scenarios

```bash
npm test                       # L01–L18, enforces @id invariant
npm run test:level -- L14      # one level
npm run test:out-of-scope      # anonymous / no-id documentation cases
```

## Layout

- `xslt/diff.xsl` – analyze / merge / textdiff prep
- `xslt/roundtrip.xsl` – reconstruct old or new from merge
- `src/diffEngine.js` – SaxonJS driver + jsdiff word diff
- `src/moveDetect.js` – LCS move detection
- `src/idInvariant.js` – unique `@id` checks for fixtures
- `testdata/LNN-*` – progressive fixtures with ids
- `testdata/out-of-scope/` – non-product cases without ids
- `REPORT.md` – analysis and recommendations

## Roundtrip criterion

`diff(old, new)` → merge → reconstruct `old` / `new` → canonical XML equality.
