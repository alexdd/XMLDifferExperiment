# Status report: ID-based XML diffing (XSLT → Node.js / SaxonJS)

**License:** LGPL-3.0-or-later · **Copyright:** Tektur · **Contact:** https://www.tekturcms.de

## Product assumption

The editor assigns a stable, unique `@id` to **every element** at insert time.
Those IDs live in the document versions (not in the diff output format). Diffing is
a read-only output and never writes back into the editor.

**All core fixtures (`L*`, `S*`, `D*`, `X*`, `M*`) assume this invariant.** Fixtures without IDs
live under `testdata/out-of-scope/` and are not part of the default suite.

## Summary

Under the ID invariant, the **Node.js + SaxonJS** port is **roundtrip-green** for the progressive
suite **L01–L18, S01–S14, D01–D10, X01–X04, M01–M03**, including S1000D 4.1 bike content
(descriptive/procedural), deep nesting, moves, reorders, wrap/unwrap,
attributes, and mixed content (text nodes do not need an ID).

## S1000D sources

The official ASD “Bike sample data set” is distributed only as a ZIP, not as a Git repo.
It is included via submodule:

`vendor/s1000d-bike-mini-csdb-explorer` → `data/S1000D_4-1_Bike_Samples/`

From that tree, `npm run generate:s1000d` builds scenarios **S01–S14** (editor IDs
stamped on every element; edits from simple → complex).

## Original algorithm (branch `original`)

The first XSLT experiment (`diff.xsl` / `textdiff.xsl`) is archived on branch
[`original`](https://github.com/alexdd/XMLDifferExperiment/tree/original):

1. **Analyze** – by `@id`: `new` / `deleted` / `changed` / `unchanged`
2. **Merge** – place deleted siblings into the new version via preceding/trailing anchors
3. **Textdiff** – emit changed PCDATA leaves twice, then run character/word diff
4. Precondition: *every node must have a unique identifier* (editor elements)

## Port (`nodejs-xmldiff/`)

| Component | Role |
|---|---|
| `xslt/diff.xsl` | Analyze + Merge + Textdiff prep (XSLT 3.0, SaxonJS) |
| `xslt/roundtrip.xsl` | Reconstruct old/new from the merge |
| `src/moveDetect.js` | LCS-based move detection (child-ID sequences) |
| `src/mixedContentDiff.js` | Fine mixed-content alignment → `_diff_text` markers |
| `src/ignoreSet.js` | Strip ignored attributes/elements before compare |
| `src/idInvariant.js` | Assert unique `@id` on every element |
| `src/diffEngine.js` | SaxonJS driver, optional word-level display diff |
| `testdata/L01…L18` | Progressive roundtrip scenarios (with IDs) |
| `testdata/S*`, `D*`, `X*`, `M*` | Domain and feature scenarios |
| `testdata/out-of-scope/` | Documents limits without IDs (not default) |

## Extensions along the test ladder

| Level | Case | Extension |
|---|---|---|
| L01–L05 | Text, sibling delete/insert, nested | Baseline port |
| L06 | All children replaced | Absent children without survivor anchors |
| L09 | Move across parents | `diffing=moved` + ghost at old location |
| L10 | Sibling reorder | LCS of child-ID sequences |
| L12–L13 | Wrap/unwrap | Moved nodes inside a deleted parent |
| L15 | Insert before survivor | LCS instead of predecessor heuristic |
| L17 | Attributes only | Attribute compare + dual/marker |
| L18 | Mixed content | Dual-snapshot only for anonymous child elements; text around `@id` children → JS `_diff_text` |
| M01 | Fine mixed textdiff | Token-align old/new → `_diff_text` instead of parent snapshot |
| M02–M03 | Ignore set | Strip attributes/elements before diff; roundtrip against filtered trees |

## Intentionally out of scope

Without element `@id` (anonymous elements / no IDs at all), Analyze/Merge cannot
correlate nodes. That violates the product assumption and is not tested as a core path.
See `testdata/out-of-scope/`.

## Product guidance

1. Editor stamps `@id` on every element (planned).
2. Diffing uses Analyze → Merge → Mixed refine → optional word textdiff.
3. Diff output stays a read-only visualization; no write-back into the editor.
4. Configure an ignore set for editor metadata (`rev`, draft comments, …).
