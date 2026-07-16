# Abschlussreport: ID-basiertes XML Diffing (XSLT → Node.js / SaxonJS)

## Produktannahme

Der Editor vergibt beim Einfügen für **jedes Element** eine stabile, eindeutige `@id`.
Diese IDs leben in den Dokumentversionen (nicht im Diff-Ausgabeformat). Diffing ist
eine reine Ausgabe und fließt nicht zurück in den Editor.

**Alle Kern-Testdaten (`L*` und `S*`) setzen diese Invariante voraus.** Fixtures ohne IDs
liegen unter `testdata/out-of-scope/` und sind nicht Teil der Default-Suite.

## Kurzfazit

Unter der ID-Invariante ist der Port nach **Node.js + SaxonJS** für die progressive
Suite **L01–L18 + S01–S14 Roundtrip-grün**, inklusive S1000D-4.1-Bike-Inhalte
(descriptive/procedural), tiefer Verschachtelung, Moves, Reorders, Wrap/Unwrap,
Attribute und Mixed Content (Textknoten brauchen keine ID).

## S1000D-Quellen

Offizielles ASD „Bike sample data set“ liegt nur als ZIP vor, nicht als Git-Repo.
Als Submodule eingebunden:

`vendor/s1000d-bike-mini-csdb-explorer` → `data/S1000D_4-1_Bike_Samples/`

Daraus generiert `npm run generate:s1000d` die Szenarien **S01–S14** (Editor-IDs
auf jedes Element gestempelt, Edits von einfach → komplex).

## Ursprünglicher Algorithmus (Repo-Root)

1. **Analyze** – per `@id`: `new` / `deleted` / `changed` / `unchanged`
2. **Merge** – gelöschte Geschwister per preceding/trailing-Anker in die neue Version
3. **Textdiff** – geänderte PCDATA-Leaves doppelt ausgeben, dann Zeichen-Diff
4. Voraussetzung: *every node must have a unique identifier* (Editor-Elemente)

## Port (`nodejs-xmldiff/`)

| Komponente | Rolle |
|---|---|
| `xslt/diff.xsl` | Analyze + Merge + Textdiff-Prep (XSLT 3.0, SaxonJS) |
| `xslt/roundtrip.xsl` | Rekonstruktion old/new aus dem Merge |
| `src/moveDetect.js` | LCS-basierte Move-Erkennung (Child-ID-Sequenzen) |
| `src/idInvariant.js` | Prüft eindeutige `@id` auf allen Elementen |
| `src/diffEngine.js` | SaxonJS-Treiber, jsdiff für Wort-Diff |
| `testdata/L01…L18` | Progressive Roundtrip-Szenarien (mit IDs) |
| `testdata/out-of-scope/` | Dokumentiert Grenzen ohne IDs (nicht Default) |

## Erweiterungen entlang der Testleiter

| Level | Fall | Erweiterung |
|---|---|---|
| L01–L05 | Text, Sibling-Delete/Insert, Nested | Basis-Port |
| L06 | Alle Kinder ersetzt | Absent-Children ohne Survivor-Anker |
| L09 | Move über Parents | `diffing=moved` + Ghost an alter Stelle |
| L10 | Sibling-Reorder | LCS der Child-ID-Sequenzen |
| L12–L13 | Wrap/Unwrap | Moved in gelöschtem Parent |
| L15 | Insert vor Survivor | LCS statt Predecessor-Heuristik |
| L17 | Nur Attribute | Attributvergleich + Dual/Marker |
| L18 | Mixed Content | Dual-Snapshot wenn Textknoten am Element hängen |

## Was bewusst out-of-scope ist

Ohne Element-`@id` (anonyme Elemente / ganz ohne IDs) kann Analyze/Merge nicht
korrelieren. Das widerspricht der Produktannahme und wird nicht als Kernpfad getestet.
Siehe `testdata/out-of-scope/`.

## Empfehlung für die vollständige Lösung im Produkt

1. Editor stempelt `@id` auf jedes Element (bereits geplant).
2. Diffing nutzt Analyze → Merge → Textdiff wie hier portiert.
3. Diff-Ausgabe bleibt read-only Visualisierung; kein Roundtrip in den Editor nötig.
4. Optional später: feinerer Inline-Textdiff in Mixed Content statt Parent-Snapshot,
   solange alle Elemente IDs behalten.
