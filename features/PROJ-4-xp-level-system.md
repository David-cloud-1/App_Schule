# PROJ-4: XP & Level System

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication) – XP gehört zu einem Nutzer-Profil
- Requires: PROJ-3 (Daily Learning Session) – XP wird nach Sessions vergeben

## User Stories
- Als Azubi möchte ich für jede richtig beantwortete Frage XP (Erfahrungspunkte) verdienen, damit ich Fortschritt spüre.
- Als Azubi möchte ich in Level aufsteigen, wenn ich genug XP gesammelt habe, damit ich ein Gefühl von Wachstum habe.
- Als Azubi möchte ich meinen aktuellen Level und XP-Fortschritt immer sehen (im Header oder Dashboard), damit ich motiviert bleibe.
- Als Azubi möchte ich eine Level-Aufstieg-Animation sehen, damit sich der Aufstieg besonders anfühlt.

## Acceptance Criteria
- [ ] Jede richtige Antwort gibt +10 XP
- [ ] Jede falsche Antwort gibt +0 XP (kein Abzug)
- [ ] Bonus XP für Streak: +5 XP pro Frage wenn Streak ≥ 7 Tage
- [ ] Level-System: Level 1–50, XP-Schwellen steigen progressiv (z.B. Level 1→2: 100 XP, Level 2→3: 200 XP, ...)
- [ ] Aktueller Level und XP-Fortschrittsbalken sind im Nutzer-Profil und Dashboard sichtbar
- [ ] Level-Aufstieg zeigt eine Animations-/Konfetti-Meldung
- [ ] XP-Vergabe wird in der Session-Zusammenfassung angezeigt ("+50 XP verdient")
- [ ] XP und Level werden in der Datenbank persistiert und sind geräteübergreifend synchron

## Edge Cases
- Was passiert, wenn ein Nutzer Level 50 erreicht? → Level bleibt bei 50, XP läuft weiter (kein Cap auf XP)
- Was passiert, wenn eine Session abbricht? → Kein XP vergeben (nur vollständig abgeschlossene Sessions zählen)
- Was passiert, wenn XP-Vergabe fehlschlägt (Netzwerkfehler)? → Lokal gecachte XP werden beim nächsten Laden synchronisiert

## Technical Requirements
- XP und Level werden in der `profiles`-Tabelle gespeichert
- Level-Berechnung erfolgt clientseitig aus der gespeicherten XP-Summe
- XP-Vergabe als atomare DB-Operation (kein doppeltes Vergeben bei Refresh)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
