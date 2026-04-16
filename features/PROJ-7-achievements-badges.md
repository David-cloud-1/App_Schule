# PROJ-7: Achievements & Badges

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-4 (XP & Level System) – Level-basierte Achievements
- Requires: PROJ-5 (Streak System) – Streak-basierte Achievements
- Requires: PROJ-3 (Daily Learning Session) – Session-basierte Achievements

## User Stories
- Als Azubi möchte ich Badges für besondere Leistungen erhalten (z.B. "7 Tage Streak"), damit ich mich für Meilensteine belohnt fühle.
- Als Azubi möchte ich alle verfügbaren Badges sehen (auch noch nicht freigeschaltete), damit ich weiß, wofür ich lernen kann.
- Als Azubi möchte ich eine Benachrichtigung erhalten, wenn ich ein neues Badge freischalte.

## Acceptance Criteria
- [ ] Mindestens 15 definierte Badges (siehe Liste unten)
- [ ] Freigeschaltete Badges werden im Profil angezeigt (farbig), noch nicht freigeschaltete ausgegraut
- [ ] Badge-Freischaltung löst eine In-App-Benachrichtigung/Animation aus
- [ ] Badge-Vergabe erfolgt automatisch nach Erfüllung der Bedingung
- [ ] Datum der Freischaltung wird gespeichert und angezeigt

**Starter-Badge-Set:**
| Badge | Bedingung |
|-------|-----------|
| Erster Schritt | Erste Session abgeschlossen |
| Auf dem Weg | 10 Sessions abgeschlossen |
| Lernprofi | 50 Sessions abgeschlossen |
| Feuerstarter | 3 Tage Streak |
| Wochenkrieger | 7 Tage Streak |
| Monatsmeister | 30 Tage Streak |
| Allrounder | Mindestens 10 Fragen in jedem Fach beantwortet |
| BGP-Experte | 100 BGP-Fragen richtig |
| KSK-Experte | 100 KSK-Fragen richtig |
| STG-Experte | 100 STG-Fragen richtig |
| LOP-Experte | 100 LOP-Fragen richtig |
| Perfektionist | Session mit 10/10 abgeschlossen |
| Level 10 | Level 10 erreicht |
| Level 25 | Level 25 erreicht |
| Prüfungsreif | Level 50 erreicht |

## Edge Cases
- Was passiert, wenn mehrere Badges gleichzeitig freigeschaltet werden? → Nacheinander anzeigen (Queue)
- Was passiert, wenn Bedingung rückwirkend erfüllt wird (Daten vor Badge-Feature)? → Einmalige Migration prüft bestehende Daten
- Was passiert, wenn Badge-Check fehlschlägt? → Stiller Fehler, kein Badge — wird beim nächsten Trigger erneut geprüft

## Technical Requirements
- Supabase-Tabellen: `badges` (Definitionen), `user_badges` (Freischaltungen)
- Badge-Check läuft nach jeder Session-Speicherung (DB Trigger oder App-Logik)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
