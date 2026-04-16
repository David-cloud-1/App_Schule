# PROJ-11: Exam Simulation Mode

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-2 (Subject & Question Structure)
- Requires: PROJ-3 (Daily Learning Session) – Teilt Quiz-Grundstruktur

## User Stories
- Als Azubi möchte ich eine simulierte Abschlussprüfung absolvieren (zeitgebunden, wie die echte IHK-Prüfung), damit ich mich auf die Prüfungssituation vorbereiten kann.
- Als Azubi möchte ich nach der Simulation eine detaillierte Auswertung sehen (richtig/falsch pro Frage, Erklärungen).
- Als Azubi möchte ich zwischen den 3 Prüfungsteilen wählen oder alle 3 am Stück absolvieren.

## Acceptance Criteria
- [ ] Exam-Modus wählbar über Dashboard oder Navigationsmenü
- [ ] 3 Prüfungsteile simulierbar (einzeln oder kombiniert):
  - Teil 1: Leistungserstellung (STG/LOP) – 20 Fragen, 90 Min.
  - Teil 2: KSK – 15 Fragen, 90 Min.
  - Teil 3: WiSo (BGP) – 15 Fragen, 45 Min.
- [ ] Countdown-Timer sichtbar während der Simulation
- [ ] Kein sofortiges Feedback nach jeder Frage (wie echte Prüfung)
- [ ] Nach Ablauf der Zeit oder manuell beenden: vollständige Auswertung mit Ergebnissen
- [ ] Auswertung: Gesamtergebnis in %, richtige/falsche Antworten pro Frage, Erklärungen
- [ ] Exam-Sessions werden separat von normalen Sessions gespeichert (kein Streak/XP-Einfluss)
- [ ] Vergangene Exam-Ergebnisse einsehbar (Verlauf der Probeprüfungen)

## Edge Cases
- Was passiert, wenn der Nutzer die Prüfung abbricht? → Zwischenstand anzeigen, Ergebnis als "abgebrochen" markieren
- Was passiert, wenn nicht genug Fragen für einen Prüfungsteil vorhanden sind? → Hinweis, mit verfügbaren Fragen starten
- Was passiert, wenn der Timer abläuft während der Nutzer schreibt? → Automatisches Einreichen der bisherigen Antworten

## Technical Requirements
- Timer-Logik: clientseitig mit server-seitiger Startzeit (kein Cheat durch JS-Manipulation)
- Separate DB-Tabelle `exam_sessions` für Prüfungs-Ergebnisse
- Fragen-Auswahl: repräsentative Auswahl aus allen Schwierigkeitsgraden

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
