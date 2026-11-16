# PROJ-111: Baukasten – Eine Bedienstelle statt drei

## Status: In Review
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Im Baukasten gibt es für jede Aktion genau eine Stelle. Die Text-Leiste bleibt nach „Fertig“ nicht stehen, und das Formular zeigt nichts, was die Leiste in der Seite schon kann.

Teil der Reihe „Baukasten direkt“ (Leitbild: PROJ-101: Die Seite meldet, die App entscheidet).

## Anlass
Beim Arbeiten am Material „Basics rund um den LKW (Kopie)“ meldete der Nutzer (2026-11-16): Es sei „unübersichtlich“, mit „2 Bearbeitungsboxen“. Auf dem Bild standen gleichzeitig: die Text-Leiste (F, K, H2 …), die Block-Leiste (Bearbeiten, Darunter, Duplizieren …) und die Schublade mit denselben Aktionen noch einmal.

## Ursache (gefunden im Code)
1. **Text-Leiste blieb sichtbar.** `schreibwerk/eintritt.ts` setzt nach „Fertig“ oder Klick daneben `leiste.hidden = true`. Das CSS `.wk-format{display:flex}` überstimmt das Attribut `hidden`, die Leiste blieb stehen, bis die (langsame) Vorschau neu geladen war. Sie lag dann neben der Block-Leiste und verdeckte den Text.
2. **Doppelte Aktionen.** Die Schublade hatte unten „Block darunter einfügen“ und „Block löschen“, dazu zwei Schließen-Knöpfe (X und „Fertig“). Die Block-Leiste in der Seite und das ⋯-Menü der Gliederung bieten dasselbe.
3. **„Bearbeiten“ doppelt.** Die Block-Leiste zeigte „Bearbeiten“, auch wenn das Formular für diesen Block schon offen war.

## Entscheidungen
- **E1 – Aktionen:** Einfügen, Duplizieren, Löschen, Verschieben liegen in der Block-Leiste (Seite) und im ⋯-Menü (Gliederung). Die Schublade enthält nur das Formular.
- **E2 – Schließen:** Die Schublade schließt mit dem X in der Kopfzeile (bleibt beim Scrollen sichtbar) oder per Esc. Das zweite „Fertig“ entfällt.
- **E3 – „Bearbeiten“ in der Leiste** ist am Desktop ausgeblendet, solange die Schublade offen ist. Am Handy bleibt es, weil dort die Schublade ein Blatt von unten ist.
- **E4 – Layout bleibt:** Die Spalten (Gliederung, Vorschau, Schublade) bleiben wie in PROJ-96, weil das Layout in Gebrauch ist. Wer mehr Platz will, nutzt „Vorschau über die ganze Breite“.

## Acceptance Criteria
- [x] Nach „Fertig“, Esc oder Klick daneben ist die Text-Leiste sofort weg (Regel `.wk-format[hidden]`), auch bevor die Vorschau neu geladen ist.
- [x] Die Schublade zeigt kein „Block darunter einfügen“, kein „Block löschen“ und kein zweites „Fertig“.
- [x] Ist die Schublade offen, fehlt „Bearbeiten“ in der Block-Leiste (Desktop); beim Schließen erscheint es wieder.
- [x] Alle bisherigen Wege zum Einfügen und Löschen funktionieren weiter (Leiste, ⋯-Menü, Tasten).
- [x] Das gebaute Schreibwerk (`schreibwerk-bundle.generated.ts`) passt zu den Quellen (Test `schreibwerk.test.ts`).

## Tests
`schreib-design.test.ts` (Regel im CSS und im Bündel), `vorschau-skript.test.ts` (Leiste bei offener Schublade), `baukasten-editor.test.tsx` (keine doppelten Aktionen, Zustand an die Seite).

## Nicht Teil dieser Spec
- Die Spalten zusammenlegen oder die Schublade als Überlagerung: bewusst nicht angefasst, siehe E4.
- Langsamkeit: siehe PROJ-112.

## Zugehöriger Fehler im Kern
Die Tipp-Box der KI (`<div class="tipp">`) schrumpfte auf 20 px, weil `.tipp` auch für den „?“-Knopf im Lückentext galt (`width:20px;height:20px`). Behoben im Kern (`button.tipp`, Test `kern_tippbox_test.py`), live seit 2026-11-16. Betrifft auch den Druck: Dort wurden alle Tipp-Boxen ausgeblendet.

## Implementation Notes (2026-11-16)
- `schreib-design.ts`: Regel für `[hidden]`; Bündel neu gebaut (`npm run schreibwerk:bauen`).
- `editor-schublade.tsx`: Fußleiste und zweites „Fertig“ entfernt, Props `onBlockDarunter`/`onBlockLoeschen` gestrichen.
- `baukasten-editor.tsx`: Hilfsfunktionen für die Schublade entfernt, `schubladeOffen` an die Vorschau.
- `editor-vorschau.tsx` / `vorschau-skript.ts`: neues Feld `schublade` in der Nachricht `wkZustand`.
