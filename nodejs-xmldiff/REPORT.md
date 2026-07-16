# Abschlussreport: ID-basiertes XML Diffing (XSLT → Node.js / SaxonJS)

## Kurzfazit

Der Port des ursprünglichen ID-basierten Algorithmus nach **Node.js + SaxonJS** funktioniert für alle Szenarien, in denen stabile `@id`-Attribute existieren — inklusive tiefer Verschachtelung, Moves, Reorders, Wrap/Unwrap, Attribute und Mixed Content. **Ab L21 (keine IDs im Dokument) ist das Problem mit dieser Methodik nicht mehr lösbar**, weil die zentrale Invariante fehlt.

Progressive Suite: **L01–L20 Roundtrip OK**, Stop bei **L21**.

## Ursprünglicher Algorithmus (Repo-Root)

1. **Analyze** – per `@id`: `new` / `deleted` / `changed` / `unchanged`
2. **Merge** – gelöschte Geschwister per preceding/trailing-Anker in die neue Version kopieren
3. **Textdiff** – geänderte PCDATA-Leaves doppelt ausgeben, dann Zeichen-Diff
4. Voraussetzung (README): *every node must have a unique identifier*

## Port (`nodejs-xmldiff/`)

| Komponente | Rolle |
|---|---|
| `xslt/diff.xsl` | Analyze + Merge + Textdiff-Prep (XSLT 3.0, SaxonJS) |
| `xslt/roundtrip.xsl` | Rekonstruktion old/new aus dem Merge |
| `src/moveDetect.js` | LCS-basierte Move-Erkennung (Child-ID-Sequenzen) |
| `src/diffEngine.js` | SaxonJS-Treiber, jsdiff für Wort-Diff |
| `testdata/L01…L21` | Progressive Roundtrip-Szenarien |

## Erweiterungen entlang der Testleiter

| Level | Fall | Erweiterung |
|---|---|---|
| L01–L05 | Text, Sibling-Delete/Insert, Nested | Basis-Port |
| L06 | Alle Kinder ersetzt | Absent-Children ohne Survivor-Anker einfügen |
| L09 | Move über Parents | `diffing=moved` + Ghost an alter Stelle |
| L10 | Sibling-Reorder | Move-Erkennung (zuerst Predecessor, dann LCS) |
| L12–L13 | Wrap/Unwrap | Moved in gelöschtem Parent ohne Version |
| L15 | Insert vor Survivor | LCS statt Predecessor (keine False Positives) |
| L17 | Nur Attribute | Attributvergleich + Dual/Marker |
| L18–L20 | Mixed Content / anonyme Nodes | Dual-Snapshot des Parents als Escape Hatch |
| **L21** | **Keine IDs** | **Unlösbar in dieser Methodik** |

## Warum L21 die Methodik bricht

Ohne `@id`:

1. **Analyze** markiert nichts (kein Korrelationsschlüssel).
2. **Merge** findet keine Deleted-Anker (Anker = ID-Survivors).
3. **Dual-Snapshot** startet nicht (kein `diffing=changed` auf benannten Knoten).
4. Ausgabe = Kopie der New-Version → Old ist nicht rekonstruierbar.

Das ist keine Implementierungslücke, sondern die **Vorbedingung** des Algorithmus. Sobald Knoten keine stabile Identität haben, wird aus „ID-Diffing“ das allgemeine **XML Tree Edit Distance**-Problem.

Escape Hatches (Parent-Snapshot bei anonymen Kindern) retten Roundtrips nur, solange ein benannter, `changed`-markierter Vorfahr existiert. Fehlt jede ID, gibt es keinen solchen Vorfahr.

## Weitere strukturelle Grenzen (auch mit IDs)

- **Semantik vs. Roundtrip**: Ab L18–L20 rettet oft ein grober Parent-Snapshot den Roundtrip, verliert aber feingranulare Diff-Markierungen.
- **Anzeige-Merge kann „messy“ werden**: Moves erzeugen Dual-Knoten; L14 zeigt mehrfache Subtree-Kopien. Roundtrip ≠ schönes Unified Diff.
- **Namespaces / PIs / Comments**: nicht modelliert.
- **ID-Kollisionen / fehlende Eindeutigkeit**: undefiniert.
- **Sehr große Child-Listen**: LCS ist O(n·m) pro Parent — ok für Editor-Dokumente, nicht für riesige Daten-XML.

## Vorschläge für eine vollständige Lösung

### A. Methodik beibehalten (UWE/Editor-Kontext) — empfohlen, wenn IDs erzwungen werden

1. **IDs verpflichtend** im WYSIWYG beim Einfügen (wie im README).
2. Schema/CI-Check: jedes Element braucht `@id`.
3. Algorithmus wie hier (Analyze → Merge → Textdiff) für Change-UI.
4. Kein Anspruch, anonymes XML zu diffen.

### B. Hybrid: IDs + Fallback Tree Matching

1. ID-Matching wie bisher für benannte Knoten.
2. Für anonyme Geschwister unter demselben Parent: **LCS/Myers auf serialisierten Kindern** oder Zhang-Shasha auf kleinen Subtrees.
3. Synthetische Match-IDs nur für die Diff-Session vergeben.
4. Damit wird L21 lösbar, aber Komplexität und Mehrdeutigkeit steigen.

### C. Vollständiges Tree Diffing (wissenschaftlicher Ansatz)

- **Zhang-Shasha** / **Kyoto** Tree Edit Distance  
- **X-Diff**, **DiffXML**, **microsoft XmlDiff**  
- GumTree (AST-orientiert)  

Eigenschaften: keine ID-Voraussetzung, teurer, Matchings können heuristisch/mehrdeutig sein, schlechter an „Editor hat IDs vergeben“ gekoppelt.

### D. Patch-basiertes Modell statt Merge-Dokument

Statt ein Annotated Merge-Dokument mit Roundtrip:

1. Edits als Operationsliste (`insert`/`delete`/`move`/`update` mit Pfad oder ID).
2. Old + Patch ⇒ New (und inverse).
3. UI rendert Operationsliste. Oft robuster als Dual-Node-Merge.

## Empfehlung

Für den ursprünglichen UWE-Anwendungsfall: **Variante A** — IDs erzwingen, diesen Algorithmus nutzen. L01–L20 zeigen, dass die Methodik dann auch für komplexe, tief verschachtelte Editor-Szenarien trägt.

Für allgemeines XML ohne Identitäten: **Variante B oder C**; die reine ID+Sibling-Anker-XSLT-Methodik ist dort prinzipiell unvollständig.
