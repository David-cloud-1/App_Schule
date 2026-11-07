# PROJ-73: Meldungs-Inbox für Lehrkräfte (mit Rückmeldung & Belohnung)

## Status: Planned
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-72 (Frage melden) — liefert die Meldungen
- Requires: PROJ-44 (Lehrkraft-Rolle), PROJ-24 (Fachbereichs-Rechte), PROJ-70 (Inhalte offen für alle Lehrkräfte)
- Requires: PROJ-47 (Änderungsverlauf) — Korrekturen sind dort protokolliert
- Requires: PROJ-19 (Frachtmünzen) — Belohnung
- Requires: PROJ-42 („Heute“-Screen) — Rückmeldung an den Azubi

## Summary
Lehrkräfte und Bereichs-Admins sehen alle gemeldeten Fragen ihres Fachbereichs in einer Inbox, springen direkt in die Frage, korrigieren sie und schließen die Meldung ab. Der Melder bekommt eine kurze Rückmeldung; bei berechtigten Meldungen erhält er eine Belohnung.

## User Stories
- Als **Lehrkraft** möchte ich gemeldete Fragen meines Fachbereichs gesammelt sehen, damit nichts untergeht.
- Als **Lehrkraft** möchte ich aus der Meldung direkt in die Frage springen und sie ändern, damit die Korrektur in Sekunden erledigt ist.
- Als **Lehrkraft** möchte ich sehen, ob ein Kollege eine Meldung schon bearbeitet, damit wir nicht doppelt arbeiten.
- Als **Lehrkraft** möchte ich dem Melder kurz antworten können, damit er sich ernst genommen fühlt.
- Als **Azubi** möchte ich eine Belohnung bekommen, wenn meine Meldung die Frage verbessert hat.

## Acceptance Criteria

### Inbox
- [ ] Unter `/admin` gibt es „Gemeldete Fragen“ (in der Navigation unter Inhalte). Sichtbar für Lehrkräfte, Bereichs-Admins und Super-Admin.
- [ ] Standardansicht: offene Meldungen des eigenen Fachbereichs (Super-Admin: Bereichs-Umschalter PROJ-29), nach Anzahl der Meldungen je Frage absteigend, dann nach Alter.
- [ ] Mehrere Meldungen zur selben Frage werden zu **einer Zeile** gebündelt (Anzahl, Gründe als Chips, älteste Meldung); Aufklappen zeigt jede Einzelmeldung mit Grund und Freitext.
- [ ] Filter: Status (offen, in Prüfung, korrigiert, nicht übernommen), Fach, Thema, Grund. Tabelle mit `ws-table-scroll`, sticky Fragespalte, Zustände nach `admin-states.tsx`.
- [ ] Zeile zeigt Fragetext (gekürzt, voller Text im `title`), die von Azubis meistgewählte falsche Antwort und die Lösungsquote der Frage (aus PROJ-74-Daten, falls vorhanden).

### Bearbeiten
- [ ] „Frage öffnen“ führt in den bestehenden Frage-Editor; nach dem Speichern erscheint oben ein Hinweis „Meldung abschließen?“ mit den Optionen „Korrigiert“ und „Später“.
- [ ] Wer eine Meldung öffnet, wird als Bearbeiter mit Zeitstempel eingetragen („Frau X prüft“, Status „in Prüfung“). Andere sehen das; die Sperre ist nur ein Hinweis, kein Zwang, und läuft nach 24 Stunden ab.
- [ ] Abschlussarten: **Korrigiert** (Frage wurde geändert; Verweis auf den Eintrag im Änderungsverlauf) und **Nicht übernommen** (Kurzbegründung aus Vorlagen wie „Frage ist korrekt, siehe Erklärung“, wählbar oder frei, höchstens 200 Zeichen).
- [ ] Beim Abschluss gelten die Meldungen aller Melder dieser Frage mit demselben Ergebnis; die Lehrkraft kann einzelne Meldungen abweichend schließen.
- [ ] Sammelaktion: mehrere Zeilen markieren und gemeinsam „Nicht übernommen“ schließen (mit AlertDialog).
- [ ] Jeder Abschluss wird protokolliert (wer, wann, Ergebnis) und erscheint im Änderungsverlauf PROJ-47.

### Rückmeldung & Belohnung
- [ ] Der Melder bekommt zu jedem Abschluss eine Hinweiskarte im „Heute“-Screen (PROJ-42): bei Korrigiert „Danke, deine Meldung hat die Frage verbessert“, bei Nicht übernommen die Kurzbegründung.
- [ ] Bei **Korrigiert** erhält jeder Melder einmalig eine Belohnung in Frachtmünzen (Menge im Architekturschritt festgelegt) und eine Meldung im Hof-/Münzverlauf.
- [ ] Die Belohnung wird je Meldung genau einmal vergeben, auch bei erneutem Öffnen oder Klick auf „Korrigiert“. Eine zurückgenommene Korrektur (PROJ-47) nimmt die Belohnung **nicht** zurück.
- [ ] Bei **Nicht übernommen** gibt es keine Belohnung und keine Strafe.
- [ ] Pro Azubi sind höchstens 5 belohnte Meldungen pro Woche möglich, danach bleibt die Rückmeldung, aber ohne Münzen (verhindert Münz-Farmen).

## Edge Cases
- Zwei Lehrkräfte schließen gleichzeitig dieselbe Meldung: die zweite sieht „bereits abgeschlossen von …“ ohne doppelte Belohnung.
- Frage wurde zwischenzeitlich gelöscht: Meldung wird automatisch als „Frage entfällt“ geschlossen, ohne Belohnung, Rückmeldung „Die Frage gibt es nicht mehr“.
- Frage wurde geändert, ohne dass jemand die Meldung abgeschlossen hat: Die Zeile zeigt „Frage seit der Meldung geändert“ mit Link zum Verlauf, damit man schnell abschließen kann.
- Melder hat sein Konto gelöscht: Abschluss funktioniert, Belohnung und Rückmeldung entfallen.
- Sehr viele offene Meldungen (> 200): Seitenweise laden, Filter und Sortierung bleiben serverseitig.
- Freitext enthält Beleidigungen: Lehrkraft kann Meldung ohne Rückmeldung an den Melder schließen („still schließen“).

## Technical Requirements
- Security: Zugriff nur für Lehrkräfte/Admins; Fachbereichsprüfung vor jedem Service-Client-Zugriff; Rückmeldungen an Azubis enthalten keine Namen von Lehrkräften.
- Performance: Inbox lädt unter 500 ms bei 1000 offenen Meldungen (gebündelt, serverseitige Seiten).
- Keine KI, keine laufenden Kosten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
