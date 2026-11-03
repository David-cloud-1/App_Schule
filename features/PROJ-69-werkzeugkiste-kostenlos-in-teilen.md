# PROJ-69: Werkzeugkiste – kostenloser Weg in Teilen (lange Skripte)

## Status: Planned
**Created:** 2026-11-03
**Last Updated:** 2026-11-03

## Kontext
Im kostenlosen Weg (Prompt kopieren → eigene KI → Antwort zurückkopieren) bekommt die Lehrkraft heute **einen** Prompt für das ganze Skript. Bei langen Skripten scheitert das zweifach:
- Die KI nimmt die Eingabe nicht vollständig an (Praxistest 2026-10-28: 117.000 Zeichen Skript + 37.000 Zeichen Anweisung, ChatGPT Free kürzte die Anweisung weg).
- Die **Antwort bricht ab**, weil sie zu lang wird (Nutzer, 2026-11-03: „bricht irgendwann immer ab“).

PROJ-68 macht Prompt und Antwort kürzer, aber ein dickes Heft bleibt zu lang für eine einzige Antwort. Der bezahlte Weg (PROJ-64) zerlegt lange Skripte schon in Teile. Der Kern kann das (`teilen`, `zusammenfuegen`) und kann aus einer abgeschnittenen Antwort die vollständigen Kapitel retten (`retten`). Diese Spec bringt dasselbe in den kostenlosen Weg.

### Entscheidungen
- **E1 – Qualität vor Kürze (Nutzer, 2026-11-03):** wie PROJ-68 E1.
- **E2 – Automatisch, aber sichtbar (Annahme, Claude 2026-11-03):** Die App entscheidet anhand der Länge, ob geteilt wird. Die Lehrkraft muss nichts einstellen, sieht aber vor dem Kopieren, dass es z. B. „3 Teile“ sind und warum.
- **E3 – Erst die langen Werkzeuge (Annahme, Claude 2026-11-03):** Geteilt wird bei „Ganzes Skript“ und „Kreative Selbstlerneinheit“ (H5P und Seite). Andere Werkzeuge haben kurze Antworten und bleiben bei einem Prompt. Ob weitere folgen, wird nach der Praxis entschieden.
- **E4 – Teilgröße für kostenlose KIs (OFFEN, wird gemessen):** Die Teile sind kleiner als im bezahlten Weg (dort ~22.000 Zeichen Skript). Der Wert wird so festgelegt, dass die Antwort in **ChatGPT Free** mit dem gekürzten Prompt aus PROJ-68 vollständig ankommt. Gemessen an Heft 2, festgehalten in dieser Spec.

## Dependencies
- Requires: PROJ-51 (Ablauf, Schritte 3 und 4, Prüfstelle), PROJ-64 (Kern-Funktionen Teilen, Zusammenfügen, Retten)
- Sollte nach PROJ-68 kommen: Mit kürzerem Prompt passen größere Teile, also braucht es weniger Teile.
- Berührt: PROJ-52 (Meine Materialien): Entwürfe mit Teilen müssen sich speichern und fortsetzen lassen.

## User Stories
- Als **Lehrkraft mit langem Skript und kostenloser KI** möchte ich mehrere kurze Prompts nacheinander bekommen, damit jede Antwort vollständig ankommt.
- Als **Lehrkraft** möchte ich jede Teil-Antwort einzeln einfügen und sofort sehen, ob sie in Ordnung ist, damit ich einen kaputten Teil gleich wiederholen kann und nicht erst am Ende.
- Als **Lehrkraft** möchte ich am Ende **eine** fertige Datei bekommen, wie bei einem kurzen Skript, damit ich die Teile nicht selbst zusammenbauen muss.
- Als **Lehrkraft**, deren KI trotzdem mittendrin abbricht, möchte ich, dass die fertigen Kapitel erhalten bleiben und ich nur den Rest nachholen muss.
- Als **Lehrkraft** möchte ich die Arbeit unterbrechen (z. B. nach Teil 2 von 4) und später weitermachen, ohne die fertigen Teile zu verlieren.
- Als **Lehrkraft mit kurzem Skript** möchte ich, dass sich für mich nichts ändert.

## Acceptance Criteria

### Teilen
- [ ] Ist die Auswahl kürzer als die Teilgröße (E4), ändert sich nichts: ein Prompt, eine Antwort, wie heute.
- [ ] Ist sie länger, zerlegt die App sie an Kapitel-Überschriften bzw. Seitengrenzen in gleichmäßig große Teile (wie im bezahlten Weg). Ein Abschnitt wird nie mitten im Text zerschnitten.
- [ ] Vor dem ersten Kopieren steht ein Satz: „Dein Skript ist lang. Damit die Antwort deiner KI nicht abbricht, bekommst du es in X Teilen.“ Dazu je Teil die enthaltenen Kapitel bzw. Seiten.
- [ ] Jeder Teil-Prompt sagt der KI, welcher Teil es ist („Teil 2 von 3“), und bittet bei Teil 2 ff. um eine Antwort ohne Deckblatt. Deckblatt und Abschlusskapitel entstehen wie im bezahlten Weg.

### Kopieren und Einfügen je Teil
- [ ] Schritt 3/4 zeigt die Teile als Liste mit Zustand: offen, eingefügt und geprüft, mit Befund.
- [ ] Je Teil: „Prompt kopieren“ und ein eigenes Feld für die Antwort.
- [ ] Nach dem Einfügen prüft die App den Teil sofort mit der vorhandenen Prüfstelle und zeigt das Ergebnis in einem Satz.
- [ ] Ein Teil kann jederzeit neu eingefügt werden (ersetzt die alte Teil-Antwort).
- [ ] „Weiter zur Datei“ ist erst möglich, wenn alle Teile eingefügt sind und keiner einen Befund „hoch“ hat.
- [ ] Die App fügt die Teile zu **einer** Antwort zusammen (ein Deckblatt, alle Kapitel in Reihenfolge, ein Abschlusskapitel). Danach laufen Prüfen, Vorschau und Bauen wie heute.

### Abgebrochene Antwort retten
- [ ] Ist eine eingefügte (Teil-)Antwort mittendrin abgeschnitten, erkennt die App das, behält alle vollständigen Kapitel und sagt in einem Satz, welche Kapitel fehlen.
- [ ] Für die fehlenden Kapitel gibt es einen **Nachhol-Prompt** (nur die fehlenden Abschnitte). Dessen Antwort wird an derselben Stelle ergänzt.
- [ ] Das gilt auch bei einem Prompt ohne Teilung (kurzes Skript, KI bricht trotzdem ab).

### Speichern und Fortsetzen
- [ ] Eingefügte Teil-Antworten bleiben beim Verlassen der Seite erhalten. Beim Wiederöffnen des Ablaufs (auch über „Meine Materialien“) steht die Lehrkraft beim nächsten offenen Teil.
- [ ] Ändert die Lehrkraft Auswahl oder Einstellungen, nachdem schon Teile eingefügt sind, fragt die App vorher nach (`AlertDialog`), weil die Teile dann neu entstehen.

### Darstellung
- [ ] Nur vorhandene Bausteine (Button, AlertDialog, Hinweis-Box, Progress, `ws-*`-Farben), mobil bedienbar (44 px), Fortschritt in Worten („Teil 2 von 3 eingefügt“).

## Edge Cases
- **Teil in falscher Reihenfolge eingefügt** (Antwort zu Teil 3 im Feld von Teil 2): Die App vergleicht die Kapiteltitel mit den erwarteten Abschnitten und warnt in einem Satz. Die Lehrkraft entscheidet.
- **Gleiche Antwort zweimal eingefügt:** Warnung „Diese Antwort hast du schon bei Teil X eingefügt.“
- **KI liefert bei Teil 2 doch ein Deckblatt/Abschlusskapitel:** wird beim Zusammenfügen still verworfen bzw. eingesammelt wie im bezahlten Weg.
- **Kapitel überschneiden sich an der Teilgrenze** (gleicher Titel am Ende von Teil 1 und am Anfang von Teil 2): Hinweis in der Vorschau. Kein automatisches Löschen von Inhalt.
- **Skript ohne Überschriften/Seitenmarken** (z. B. .txt): kann nicht sinnvoll geteilt werden → ein Prompt wie heute, plus Hinweis „Bei sehr langen Texten kann die Antwort abbrechen. Dann hilft der Nachhol-Prompt.“
- **Ein einzelner Abschnitt ist allein länger als die Teilgröße:** bleibt ein Teil (nicht zerschnitten). Bricht er ab, greift „retten + Nachhol-Prompt“.
- **Nachhol-Prompt bricht wieder ab:** erneut retten, erneut nachholen. Es gibt keine Höchstzahl, aber ab dem zweiten Mal den Hinweis, den Abschnitt in den Einstellungen kleiner zu wählen.
- **Bilder:** Jeder Teil nennt nur die Bildmarker seiner Abschnitte. In der fertigen Datei sind alle Bilder vorhanden.
- **Bezahlter Weg (PROJ-64) ist eingeschaltet:** Er bleibt davon unberührt und nutzt weiter seine eigene Teilgröße.

## Technical Requirements
- Wiederverwendung der Kern-Funktionen `teilen`, `zusammenfuegen`, `retten` (mit eigener Teilgröße für den kostenlosen Weg). Kein zweiter Mechanismus.
- Sicherheit wie bisher: Lehrer-Rolle, nur eigene Abläufe, Teil-Antworten im privaten Speicher der Werkzeugkiste, Größengrenzen je Teil-Antwort.
- Kein Dev-Server/Browser-Test durch Claude (bringt den Rechner zum Absturz). Browser- und Handytest macht der Nutzer in Produktion.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
