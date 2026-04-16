# PROJ-5: Streak System

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication) – Streak gehört zu einem Nutzer
- Requires: PROJ-3 (Daily Learning Session) – Streak wird nach Sessions aktualisiert

## User Stories
- Als Azubi möchte ich eine Tagesserie (Streak) aufbauen, wenn ich täglich lerne, damit ich motiviert bin, keine Pause zu machen.
- Als Azubi möchte ich meinen aktuellen Streak deutlich sehen (z.B. Flammen-Symbol wie bei Duolingo).
- Als Azubi möchte ich eine Warnung erhalten, wenn ich heute noch nicht gelernt habe und mein Streak in Gefahr ist.
- Als Azubi möchte ich meine längste Streak-Serie sehen, damit ich stolz auf meinen Rekord sein kann.

## Acceptance Criteria
- [ ] Streak-Zähler erhöht sich um 1, wenn der Nutzer an einem Kalendertag mindestens 1 Session abschließt
- [ ] Streak wird auf 0 zurückgesetzt, wenn der Nutzer einen vollen Kalendertag ohne Session verpasst
- [ ] Aktueller Streak ist im Dashboard und im Nutzer-Profil sichtbar (Flammen-Icon + Zahl)
- [ ] Längster Streak (persönlicher Rekord) wird dauerhaft gespeichert
- [ ] Push-/Browser-Notification oder In-App-Hinweis wenn heute noch keine Session (optional, P1)
- [ ] Streak-Anzeige im Header der App (immer sichtbar nach Login)
- [ ] Am Ende einer Session wird der neue Streak-Stand angezeigt ("🔥 5 Tage Streak!")

## Edge Cases
- Was passiert, wenn der Nutzer um Mitternacht lernt? → Zeitzone des Nutzers (oder Bayern = Europe/Berlin) wird für den Tageswechsel verwendet
- Was passiert, wenn eine Session fehlschlägt zu speichern? → Streak-Update erst nach erfolgreicher Speicherung
- Was passiert am ersten Tag (Streak = 0)? → Erste abgeschlossene Session setzt Streak auf 1
- Was passiert, wenn der Nutzer heute zweimal lernt? → Streak bleibt bei 1 für diesen Tag (kein doppeltes Erhöhen)

## Technical Requirements
- Streak-Daten in der `profiles`-Tabelle: `current_streak`, `longest_streak`, `last_session_date`
- Zeitzone-Handling: alle Timestamps in UTC, Streak-Berechnung mit Europe/Berlin

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
