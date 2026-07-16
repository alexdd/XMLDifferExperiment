# XMLDiffer (Node.js / SaxonJS package)

ID-based XML version compare for editor documents.  
**Product overview:** see the [repository root README](../README.md).

Grew out of the original XSLT experiment archived on branch
[`original`](https://github.com/alexdd/XMLDifferExperiment/tree/original).

## Setup

```bash
git submodule update --init --recursive   # from repo root
cd nodejs-xmldiff
npm install
npm test
```

## API

```js
const { diffDocuments, roundtripCheck, runDiff, reconstruct } = require('./src/diffEngine');

const merged = await diffDocuments(oldXml, newXml, {
  ignore: { attributes: ['rev'], elements: ['draft-comment'] },
  textDiff: true,
});
```

| Function | Purpose |
|---|---|
| `runDiff(old, new, options?)` | Structural merge (+ mixed refine) |
| `diffDocuments(old, new, options?)` | Full pipeline including optional word diff |
| `roundtripCheck(old, new, options?)` | Verify reconstruct(old) / reconstruct(new) |
| `reconstruct(merged, 'old' \| 'new')` | Project one side from the merge |

**Options:** `ignore`, `textDiff`, `refineMixed` (default `true`), `wordDiff`.  
Scenario fixtures may set `"ignore"` in `meta.json`.

## Layout

- `src/` — engine, LCS moves, mixed refine, ignore set, prep helpers  
- `xslt/` — analyze / merge / roundtrip (XSLT 3.0)  
- `test/` — unit tests + progressive scenario runner  
- `testdata/` — `L*` `S*` `D*` `X*` `M*` fixtures  
- `REPORT.md` — technical status notes  

## License

LGPL-3.0-or-later · Copyright (C) 2011–2026 Tektur — [www.tekturcms.de](https://www.tekturcms.de)  
See [`../LICENSE`](../LICENSE) and [`../NOTICE`](../NOTICE).
