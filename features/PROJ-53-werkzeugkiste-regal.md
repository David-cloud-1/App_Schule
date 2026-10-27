# PROJ-53: Werkzeugkiste – Regal des Kollegiums

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Kontext
Teil des Werkzeugkiste-Umzugs (Übersicht in PROJ-51). In der alten Werkzeugkiste gab es das „Regal des Kollegiums“: Eine Lehrkraft konnte fertiges Material schulweit freigeben, andere konnten es herunterladen. Das hochgeladene Ausgangsskript blieb immer privat, weil es oft aus Verlagsmaterial stammt.

In der App wird das Regal zum dritten Reiter der Werkzeugkiste. Neu ist, dass die Lehrkraft **pro Material** bestimmt, wer es sehen darf.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1 – Sichtbarkeit pro Material, vier Stufen:** Die Lehrkraft entscheidet für jedes Material selbst:
  1. **Nur ich** (Standard, nicht im Regal)
  2. **Mein Fachbereich**: alle Lehrkräfte, die im selben Fachbereich unterrichten
  3. **Alle Lehrkräfte** der Schule
  4. **Ausgewählte Kolleginnen und Kollegen**: namentlich ausgewählt
- **E2 – Skript bleibt privat:** Geteilt wird ausschließlich das fertige Material. Skripttext, Skriptdatei und KI-Antwort sieht nur die Besitzerin oder der Besitzer (wie bisher).
- **E3 – Freiwillig:** Nichts wird automatisch geteilt.

## Dependencies
- Requires: PROJ-51 (Rahmen), PROJ-52 (Meine Materialien: geteilt wird von dort aus)
- Requires: PROJ-48 (Fach-Zuständigkeiten) bzw. PROJ-22/24 (Fachbereich), um zu bestimmen, wer „im selben Fachbereich“ ist

## User Stories
- Als **Lehrkraft** möchte ich ein gelungenes Material mit meinem Fachbereich teilen, damit Kolleginnen und Kollegen nicht dasselbe noch einmal erstellen müssen.
- Als **Lehrkraft** möchte ich Material nur mit bestimmten Kolleginnen und Kollegen teilen, z. B. mit der Parallelklassen-Lehrkraft, ohne es gleich der ganzen Schule zu zeigen.
- Als **Lehrkraft** möchte ich jederzeit ändern oder zurücknehmen, wer mein Material sieht.
- Als **Lehrkraft** möchte ich im Regal nach Fach und Werkzeug filtern, damit ich schnell Passendes finde.
- Als **Lehrkraft** möchte ich ein Material aus dem Regal herunterladen oder als Ausgangspunkt für mein eigenes übernehmen und anpassen.
- Als **Lehrkraft** möchte ich sehen, wie oft mein geteiltes Material geladen wurde, als kleine Bestätigung.

## Acceptance Criteria

### Teilen
- [ ] In „Meine Materialien“ (Menü ⋯) und in Schritt 5 des Ablaufs gibt es **„Teilen …“**. Es öffnet einen Dialog.
- [ ] Der Dialog bietet die vier Stufen als Auswahl (E1) mit je einem erklärenden Satz:
  - Nur ich: „Nur du siehst dieses Material.“
  - Mein Fachbereich: „Alle Lehrkräfte in [Fachbereich] sehen es im Regal.“ Bei mehreren Fachbereichen kann die Lehrkraft einen oder mehrere ankreuzen.
  - Alle Lehrkräfte: „Alle Lehrkräfte der Schule sehen es im Regal.“
  - Ausgewählte: Suchfeld zur Auswahl von Lehrkräften nach Name, die Ausgewählten erscheinen als Chips mit ✕.
- [ ] Wird geteilt (Stufe 2–4), sind zusätzlich wählbar: **Fach** (aus den Fächern der App bzw. den eigenen Zuständigkeiten, optional) und eine **kurze Notiz** (höchstens 200 Zeichen, z. B. „Für die 11. Klasse, ca. 2 Doppelstunden“).
- [ ] Der Dialog weist sichtbar darauf hin: „Geteilt wird nur das fertige Material. Dein Skript bleibt privat.“ (E2)
- [ ] Speichern zeigt einen Toast („Mit deinem Fachbereich geteilt“). Die Spalte „Regal“ in „Meine Materialien“ zeigt die Stufe als Pill (privat · Fachbereich · alle · N Personen).
- [ ] Die Stufe lässt sich jederzeit ändern. „Nur ich“ nimmt das Material sofort aus dem Regal.

### Regal ansehen
- [ ] Der Reiter „Regal des Kollegiums“ zeigt alle Materialien, die die angemeldete Lehrkraft sehen darf: eigener Fachbereich, alle Lehrkräfte, namentlich freigegeben. Eigene geteilte Materialien erscheinen ebenfalls, als „von dir“ gekennzeichnet.
- [ ] Jede Karte zeigt Werkzeug · Format, Fach (falls gesetzt), Titel, Notiz, „von [Name]“, „N× geladen“ und **„Herunterladen“** sowie **„Anpassen“**.
- [ ] Ist ein Material namentlich mit mir geteilt, steht auf der Karte „mit dir geteilt“.
- [ ] Filter als Chips über der Liste: **Fach** (alle Fächer, die im sichtbaren Regal vorkommen) und **Werkzeug**. Dazu Sortierung „Neueste zuerst“ / „Am häufigsten geladen“ und ein Suchfeld (Titel, Notiz).
- [ ] Raster mit 3 Spalten auf dem Desktop, 1 Spalte auf dem Handy. Ab 30 Einträgen wird nachgeladen.
- [ ] Leerzustand: „Noch nichts geteilt. Teile dein erstes Material aus Meine Materialien.“ Der Link führt zum Reiter.

### Herunterladen & Anpassen
- [ ] „Herunterladen“ lädt die fertige Datei und erhöht den Zähler um 1. Eigene Downloads zählen nicht.
- [ ] **„Anpassen“** legt eine **Kopie** in „Meine Materialien“ der ladenden Lehrkraft an (Titel „[Titel] (Kopie)“, gleiches Werkzeug, gleiche KI-Antwort, **ohne** Skript) und öffnet sie bei Schritt 4 zum Überarbeiten. Das Original bleibt unverändert.
- [ ] Bei einer angepassten Kopie ist „Gleiches Skript, anderes Werkzeug“ ausgegraut (kein Skript, E2).

### Rechte
- [ ] Nur Lehrer-Rollen sehen das Regal. Azubis nie, auch nicht über direkte Aufrufe (404).
- [ ] Was eine Lehrkraft nach den Regeln nicht sehen darf, erscheint weder in der Liste noch über direkte Aufrufe oder Download-Links (404).
- [ ] Nur die Besitzerin oder der Besitzer kann die Sichtbarkeit ändern oder das Material löschen.
- [ ] Der **Super-Admin** kann jedes geteilte Material aus dem Regal nehmen (z. B. bei Urheberrechtsproblemen), aber nicht löschen. Die Besitzerin oder der Besitzer sieht danach „vom Admin aus dem Regal genommen“. Der Vorgang wird im Änderungsprotokoll erfasst.

## Edge Cases
- **Lehrkraft wechselt den Fachbereich oder trägt sich aus:** „Mein Fachbereich“-Freigaben gelten immer für die aktuelle Zuordnung. Wer nicht mehr im Bereich unterrichtet, sieht das Material nicht mehr, außer es ist anders freigegeben.
- **Lehrkraft ohne Fachbereich** (PROJ-46): Die Stufe „Mein Fachbereich“ ist ausgegraut mit dem Hinweis „Trage dich unter Meine Fächer ein“. Die anderen Stufen gehen.
- **Ausgewählte Person verliert die Lehrer-Rolle:** Sie sieht das Material nicht mehr. In der Freigabeliste erscheint sie als „kein Zugang mehr“ und kann entfernt werden.
- **Besitzerin oder Besitzer verliert die Rolle oder löscht das Konto:** Bei Rollenentzug verschwindet das Material aus dem Regal. Bei Kontolöschung wird es mitgelöscht. Bereits angelegte „Anpassen“-Kopien anderer bleiben bestehen.
- **Material wird überarbeitet, während es geteilt ist:** Das Regal zeigt automatisch die neue Fassung, die Freigabe bleibt.
- **Viele Ausgewählte:** Höchstens 50 Personen pro Material. Darüber hinaus ist „Fachbereich“ oder „Alle“ gedacht.
- **Download-Zähler-Missbrauch** (eine Person lädt 100-mal): Mehrfach-Downloads derselben Person am selben Tag zählen einmal.

## Technical Requirements
- **Sicherheit:** Die Sichtbarkeitsregeln werden serverseitig bzw. in der Datenbank durchgesetzt, nicht nur in der Oberfläche. Skript und KI-Antwort sind für Nicht-Besitzer technisch nicht abrufbar (E2).
- **Datenschutz:** Im Regal erscheint der Anzeigename der Lehrkraft, nicht die E-Mail-Adresse. Die Personensuche im Teilen-Dialog zeigt nur Lehrer-Rollen.
- **Leistung:** Das Regal mit 500 sichtbaren Einträgen lädt die erste Seite in unter einer Sekunde.

## Abgrenzung (nicht Teil dieses Features)
- Öffentliche Links für Personen ohne Konto
- Bewertungen oder Kommentare im Regal
- Gemeinsames Bearbeiten desselben Materials durch mehrere Lehrkräfte

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
