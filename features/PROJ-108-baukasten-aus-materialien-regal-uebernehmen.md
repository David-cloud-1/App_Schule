# PROJ-108: Baukasten – Blöcke und Themen aus eigenen Materialien & Regal übernehmen

## Status: Planned
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Im Baukasten öffnet „Aus Material übernehmen“ eine Auswahl der eigenen Materialien und des Regals des Kollegiums. Dort sieht man Themen und Blöcke als Vorschau und holt einzelne davon mit einem Klick an die gewünschte Stelle.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101. Schon in PROJ-89 als „später: Themen aus anderen Materialien oder dem Regal übernehmen“ vorgemerkt.

## Entscheidungen (Nutzer, 2026-11-16)
- **E1:** Übernehmen aus eigenen Materialien und aus dem Regal gehört in den Umfang.

## Dependencies
- Requires: PROJ-102 (Einfüge-Logik für Blöcke mit Bildern, Kopie der Bilder, 8-MB-Prüfung), PROJ-52 (Meine Materialien), PROJ-53 (Regal)
- Berührt: PROJ-101 (Leerzustände bieten „Aus Material übernehmen“ an), PROJ-47/70 (Protokoll: Übernahme aus dem Regal ist eine Kopie, das Original bleibt unberührt)

## User Stories
- Als **Lehrkraft** möchte ich ein gutes Thema aus meinem alten Material in das neue holen, ohne es neu zu bauen.
- Als **Lehrkraft** möchte ich im Regal eine passende Aufgabe einer Kollegin finden und in mein Material übernehmen.
- Als **Lehrkraft** möchte ich vorher sehen, wie der Block aussieht, bevor ich ihn übernehme.
- Als **Lehrkraft** möchte ich mehrere Blöcke aus einem Material in einem Rutsch übernehmen.

## Acceptance Criteria
- [ ] „Aus Material übernehmen“ steht im Katalog (eigener Reiter), im „+“-Menü der Einfügestellen, in den Leerzuständen und im Editor-„⋯“-Menü.
- [ ] Der Dialog hat zwei Reiter „Meine Materialien“ und „Regal“ (`AdminTabs`), eine Suche nach Titel und einen Filter nach Werkzeug.
- [ ] Angezeigt werden nur Materialien im Format Interaktive Seite (die der Baukasten bearbeiten kann).
- [ ] Nach Wahl eines Materials zeigt der Dialog seine Gliederung (Themen mit Blöcken) und rechts eine Vorschau des angeklickten Themas oder Blocks.
- [ ] Ganze Themen und einzelne Blöcke sind per Kontrollkästchen wählbar, auch gemischt aus mehreren Themen.
- [ ] „N übernehmen“ fügt die Auswahl an der Stelle ein, von der der Dialog geöffnet wurde (Blöcke hinter dem gewählten Block, Themen hinter dem aktuellen Thema). Ein Hinweis bestätigt das, und die Übernahme ist ein Schritt für Rückgängig.
- [ ] Bilder werden in die Ablage des eigenen Kontos kopiert. Die 8-MB-Grenze und die 2-GB-Grenze des Kontos werden vorher geprüft, mit klarer Meldung.
- [ ] Übernommene Inhalte sind eine unabhängige Kopie. Spätere Änderungen am Quell-Material wirken nicht nach, und umgekehrt.
- [ ] Bei Übernahme aus dem Regal wird die Quelle („aus: Titel, Lehrkraft“) im Änderungsverlauf vermerkt.
- [ ] Leere Zustände: keine eigenen Materialien bzw. nichts im Regal, mit einem Satz und dem Hinweis auf die Werkzeuge.

## Edge Cases
- **Quell-Material in einem anderen Werkzeug** (Arbeitsblatt statt Kreative Einheit): Übernommen werden alle Blöcke, die der Ziel-Typ kennt. Der Rest wird mit Hinweis ausgelassen (wie PROJ-102).
- **Lernzielkontrolle der Quelle:** Ihre Fragen lassen sich als einzelne Aufgaben übernehmen, nicht als zweite Lernzielkontrolle.
- **Bilder der Quelle nicht mehr erreichbar** (Skript entfernt, Bild-Auszug fehlt): Der Block kommt mit Platzhalter „Bild nicht gefunden“, mit Hinweis.
- **Regal-Material wurde zurückgezogen**, während der Dialog offen ist: Übernehmen schlägt mit verständlicher Meldung fehl, und nichts wird halb eingefügt.
- **Sehr großes Quell-Material:** Die Gliederung lädt schnell, die Vorschau wird erst beim Anklicken gebaut.
- **Schreibgeschütztes Ziel:** Der Menüpunkt fehlt.

## Nicht Teil dieses Features
- Verknüpfte Inhalte, die sich mit der Quelle mitändern.
- Übernehmen aus H5P- oder Word-Materialien.

## Technical Requirements
- Sicherheit: Nur Materialien, die die Lehrkraft lesen darf (eigene und freigegebene Regal-Materialien). Die Server-Prüfung erfolgt beim Übernehmen, nicht nur im Dialog.
- Performance: Dialog und Gliederung laden in unter 1 s bei 50 Materialien.

## Offene Punkte für `/architecture`
- Neue Lehrkraft-API braucht Einträge in beiden Proxy-Freigabelisten (`roles.ts`, siehe Memory „Lehrkraft-Freigabelisten“).
- Vorschau eines fremden Themas: Bau über den Kern oder Ausschnitt aus der gespeicherten Seite?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
