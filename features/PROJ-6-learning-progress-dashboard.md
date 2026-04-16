# PROJ-6: Learning Progress Dashboard

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-2 (Subject & Question Structure) – Fächer als Kategorien
- Requires: PROJ-3 (Daily Learning Session) – Session-Daten als Grundlage
- Requires: PROJ-4 (XP & Level System) – XP/Level-Anzeige
- Requires: PROJ-5 (Streak System) – Streak-Anzeige

## User Stories
- Als Azubi möchte ich auf meinem Dashboard meinen Gesamtfortschritt sehen (Level, XP, Streak), damit ich weiß, wo ich stehe.
- Als Azubi möchte ich den Fortschritt pro Fach sehen (z.B. BGP: 68% beantwortet), damit ich erkennen kann, in welchem Fach ich noch Nachholbedarf habe.
- Als Azubi möchte ich meine letzten Lernsessions einsehen, damit ich sehe, wie konsistent ich gelernt habe.
- Als Azubi möchte ich sehen, wie viele Fragen ich insgesamt richtig/falsch beantwortet habe.

## Acceptance Criteria
- [ ] Dashboard ist die Startseite nach dem Login
- [ ] Anzeige: aktueller Level, XP (mit Fortschrittsbalken zum nächsten Level), aktueller Streak
- [ ] Fortschrittsring oder -balken pro Fach (BGP, KSK, STG, LOP): % der gesehenen Fragen
- [ ] Gesamtstatistik: Anzahl richtige Antworten, Anzahl falsche Antworten, Gesamtgenauigkeit in %
- [ ] Anzeige der letzten 7 Lerntage als Kalender-Heatmap oder einfache Streak-Visualisierung
- [ ] "Jetzt lernen"-Button prominent sichtbar auf dem Dashboard
- [ ] Responsive für Mobile (Cards untereinander, nicht nebeneinander auf kleinen Screens)

## Edge Cases
- Was passiert, wenn der Nutzer noch keine Sessions hat? → Dashboard zeigt Onboarding-Hinweis "Starte deine erste Lerneinheit!"
- Was passiert, wenn ein Fach 0% hat? → Fortschrittsbalken zeigt 0%, kein Fehler
- Was passiert bei sehr großen Zahlen (z.B. 9999 richtige Antworten)? → Kompakt formatiert (z.B. "9.999")

## Technical Requirements
- Dashboard-Daten: Aggregation aus `sessions`-Tabelle (serverseitig oder via Supabase-View)
- Performance: Dashboard-Load < 500ms (gecachte Aggregation)
- Mobile-first: Touch-Ziele ≥ 44px

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
