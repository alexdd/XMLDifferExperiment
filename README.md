# XMLDiffer — ID-based XML version compare

**See every change. Trust every match.**

XMLDiffer compares two versions of a structured document when your editor already
knows what each element is. Stamp a unique `@id` on every paragraph, list item,
table cell, or procedure step at insert time — and version compare becomes
deterministic, fast, and faithful to authoring intent.

Built for WYSIWYG technical-documentation editors. Proven against S1000D and DITA
fixtures. Implemented with XSLT 3.0 (SaxonJS) plus a thin Node.js pipeline for
moves, mixed content, and ignore rules.

The runnable package lives in [`nodejs-xmldiff/`](nodejs-xmldiff/).

---

## Why IDs change the game

Generic XML diff tries to *guess* which nodes correspond across versions.
That guesswork breaks on wraps, reorders, and cross-parent moves — the edits
authors make every day.

XMLDiffer does not guess. **The editor identity is the match key.**

| Without stable IDs | With editor `@id` |
|---|---|
| Heuristic tree matching | Exact element identity |
| False moves on simple inserts | LCS over child-ID sequences |
| Opaque mixed-content blobs | Fine `_diff_text` markers around inlines |
| Diff that “almost” roundtrips | Reconstruct old *and* new from one merge |

Diffing is an **output format** for review and history — it never writes back
into the live document.

---

## What you get

- **Structural truth** — new, deleted, changed, unchanged, and moved elements
- **Cross-parent moves & sibling reorders** — LCS on identified child sequences
- **Wrap / unwrap** — identity survives when authors regroup content
- **Attribute awareness** — attribute-only edits with roundtrip restore markers
- **Fine mixed-content text** — text around identified inlines, not whole-parent snapshots
- **Configurable ignore set** — strip noise like `rev` or draft-only elements before compare
- **Optional word-level display** — collapse paired markers to `<del>` / `<ins>` for UI
- **Roundtrip-verified** — merge reconstructs both versions (canonical equality)

---

## Quick start

```bash
git submodule update --init --recursive
cd nodejs-xmldiff
npm install
npm test
```

```js
const { diffDocuments, roundtripCheck } = require('./src/diffEngine');

const merged = await diffDocuments(oldXml, newXml, {
  ignore: { attributes: ['rev'], elements: ['draft-comment'] },
  textDiff: true, // word-level <del>/<ins> for display
});

const check = await roundtripCheck(oldXml, newXml);
// check.ok === true when old and new reconstruct cleanly
```

Every element in both inputs must carry a unique `@id`. That is the product contract.

---

## Pipeline

```
old.xml + new.xml
        │
        ▼
  ignore set (optional)
        │
        ▼
  Analyze  →  Merge  →  Textdiff prep   (XSLT / SaxonJS)
        │
        ▼
  Mixed-content refine   (Node — `_diff_text`)
        │
        ▼
  Optional word diff     (display <del>/<ins>)
        │
        ▼
   merge result  ──►  reconstruct old | new
```

---

## Proven on real schemas

| Suite | Focus |
|---|---|
| **L\*** | Synthetic ladder — text, nest, moves, wrap, attributes, mixed content |
| **S\*** | S1000D 4.1 bike samples — descriptive & procedural |
| **D\*** | DITA tasks, lists, figures, nested topics |
| **X\*** | Deep invented stress cases |
| **M\*** | Fine mixed textdiff + ignore-set scenarios |

Sample data comes from git submodules under `vendor/`. Regenerate derived fixtures with:

```bash
cd nodejs-xmldiff && npm run generate:fixtures
```

Cases that violate the ID invariant are kept under `nodejs-xmldiff/testdata/out-of-scope/`
for documentation only — not the default suite.

Technical status notes: [`nodejs-xmldiff/REPORT.md`](nodejs-xmldiff/REPORT.md)

---

## Project layout

```
.
├── LICENSE / NOTICE     LGPL-3.0-or-later (Tektur)
├── diff.xsl             Original XSLT experiment
└── nodejs-xmldiff/      Production port (SaxonJS + tests)
    ├── src/             Engine, moves, mixed refine, ignore set
    ├── xslt/            Analyze / merge / roundtrip
    ├── test/            Unit + progressive scenario runner
    └── testdata/        L* S* D* X* M* fixtures
```

---

## License

**GNU Lesser General Public License v3.0 or later** (`LGPL-3.0-or-later`)

Copyright (C) 2011–2026 Tektur — [www.tekturcms.de](https://www.tekturcms.de)

XMLDiffer is free software: you can redistribute and/or modify it under the
LGPL. You may embed and use it from larger applications (including commercial
products); changes to this library itself remain under the LGPL.

Full text: [`LICENSE`](LICENSE) · Notices: [`NOTICE`](NOTICE)
