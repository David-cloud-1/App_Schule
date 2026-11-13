# PROJ-98: Werkzeugkiste – Baukasten: Löschen & Einfügen an der Bearbeitungsstelle

## Status: Deployed
**Created:** 2026-11-13
**Last Updated:** 2026-11-13

## Idee in einem Satz
Wer einen Block bearbeitet, kann ihn dort auch löschen oder einen neuen Block (Aufgabe, Infobox …) darunter einfügen; im Lehrtext-Editor lassen sich Boxen neben- und untereinander setzen und wieder entfernen.

## Kontext
Rückmeldung des Nutzers (2026-11-13) mit Screenshots des Lehrtext-Blocks (Schublade und Vorschau):
- „Hier sollte ich doch auch noch was einfügen können – Aufgabe, Infobox o. Ä.“ Im Lehrtext-Editor wandelte „Box: Tipp“ (Cursor in einer Box) nur die vorhandene Box um; eine neue Box oder ein Block darunter war von dort nicht erreichbar.
- „Es fehlt eine Funktion zum Löschen“: Löschen gab es nur im ⋯-Menü der Gliederung, nicht in der Schublade und nicht in der Vorschau.

## Abhängigkeiten
PROJ-89 (Editor), PROJ-90 (Katalog), PROJ-96 (Schublade), PROJ-97 (Knopfzeile in der Vorschau, `postMessage`-Rückkanal).

## Acceptance Criteria
- [x] Schublade eines Blocks: „Block darunter einfügen“ öffnet den Katalog hinter dem gewählten Block; „Block löschen“ (rot) entfernt den Block, schließt die Schublade und zeigt „Rückgängig“.
- [x] Vorschau: An jedem Block steht neben „Bearbeiten“ und „+ Darunter“ ein „Löschen“ (nicht an Themen, nicht an der Lernzielkontrolle). Nachricht `{ wkLoesche: marke }`, geprüft wie `wkWaehle` (eigener Rahmen, gültige Marke, Block existiert, Vorschau aktuell, nicht schreibgeschützt). Hinweis „Rückgängig“ wie in der Gliederung. Nicht im Druck.
- [x] Lehrtext-Editor, Cursor in einer Box: „Neue Box darunter einfügen“, „Box auflösen (Text bleibt)“, „Box samt Inhalt löschen“.
- [x] Lehrtext-Editor: Ist ein „unverändert übernommener“ Block (Tabelle, Bild) markiert, löscht ein Papierkorb-Knopf ihn.
- [x] Schreibgeschützt: Alle neuen Wege sind wirkungslos.

## Entscheidungen
- Löschen fragt wie in der Gliederung nicht nach, sondern bietet „Rückgängig“ an (ein Schritt, schnell, kein Datenverlust).
- Themen löschen bleibt in der Gliederung (mit Bestätigung), weil dabei viele Blöcke verschwinden.

## Umsetzung (Frontend, 2026-11-13)
`editor-schublade.tsx` (Fußzeile mit zwei Knöpfen), `baukasten-editor.tsx` (`blockDarunter`, `blockLoeschenAusSchublade`, `beiVorschauLoesche`), `editor-vorschau.tsx` (Nachricht `wkLoesche`), `vorschau-skript.ts` (Löschen-Knopf, rot, ≥ 4,5 : 1), `text-editor.tsx` (Box-Menü, Papierkorb). Keine Datenbank-, Kern- oder API-Änderung.
Tests: 2 Schubladen-Tests, 1 Vorschau-Nachrichten-Test, 1 Hilfsskript-Test. **Offen:** Browser-Test (Optik der Löschen-Knöpfe, Handy, Box-Menü im Lehrtext).
