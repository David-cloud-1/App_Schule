# PROJ-119: Meine Materialien – „Bearbeiten“ (Baukasten) als Hauptaktion

## Status: Deployed
**Created:** 2026-11-18
**Last Updated:** 2026-11-18

## Hintergrund
In „Meine Materialien“ stand bei Interaktiven Seiten „Herunterladen“ als Hauptknopf, der Baukasten steckte hinter einem unbeschrifteten Symbol, und „Überarbeiten“ im Menü öffnete den Generator. Die eigentliche Hauptüberarbeitung (Baukasten) war nicht zu finden.

## Dependencies
- Requires: PROJ-52/100 (Meine Materialien), PROJ-89 (Baukasten), PROJ-94 (Eigene Seite)

## User Stories
- Als Lehrkraft will ich bei einer Interaktiven Seite sofort „Bearbeiten“ lesen und damit in den Baukasten kommen.
- Als Lehrkraft will ich im Menü erkennen, dass der Generator die Seite aus dem Skript **neu** aufbaut, und nicht mit der Feinarbeit verwechseln.

## Acceptance Criteria
- [x] Seiten mit Baukasten (`baukasten: 'bearbeiten'`): grüner Hauptknopf „Bearbeiten“ (Tabelle und Handykarte), wie „Fortsetzen“ bei Entwürfen.
- [x] „Herunterladen“ wird dort ein Symbolknopf (`aria-label`, Tooltip, 44 px); nur sichtbar, wenn es eine Datei gibt und die Seite schon veröffentlicht ist.
- [x] Das alte unbeschriftete Baukasten-Symbol entfällt bei diesen Zeilen (kein Doppel).
- [x] Der Titel ist ein Link in den Baukasten.
- [x] Menüpunkt „Überarbeiten“ heißt bei diesen Zeilen „Mit KI neu erzeugen …“ mit Zusatz „Baut die Seite aus dem Skript neu auf“ (gleiche Sperrregeln wie zuvor).
- [x] Unverändert: H5P (Symbol mit Kopie-Dialog), Materialien ohne Baukasten (Herunterladen bleibt Hauptknopf, Menü „Überarbeiten“), Entwürfe („Fortsetzen“).

## Implementation Notes
- Nur `src/components/werkzeugkiste/meine-materialien.tsx` (`Hauptknopf`, `DownloadSymbol`, `BaukastenKnopf`, `ZeilenMenue`, `TitelZelle`); keine API, keine Migration.
- Tests: neue Gruppe in `meine-materialien.test.tsx`, `editor/einstiege.test.tsx` angepasst.
- Bekannt, nicht von dieser Änderung: `src/lib/werkzeugkiste-auszug.test.ts` („nennt die Urheberin …“) schlägt schon vorher fehl (Altlast aus PROJ-100).
