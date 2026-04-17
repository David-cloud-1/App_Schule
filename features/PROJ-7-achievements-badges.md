# PROJ-7: Achievements & Badges

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-17

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-3 (Daily Learning Session) – Session-basierte Achievements
- Requires: PROJ-4 (XP & Level System) – Level-basierte Achievements
- Requires: PROJ-5 (Streak System) – Streak-basierte Achievements

## Overview
Nutzer erhalten Badges für das Erreichen von Meilensteinen (Sessions, Streaks, Levels, Fach-Expertise). Badges werden automatisch nach Erfüllung der Bedingung vergeben und mit einem dramatischen Modal gefeiert. Die Badge-Galerie ist in die Profil-Seite eingebettet. Beim ersten Deployment wird eine einmalige Migration alle bestehenden Nutzerdaten rückwirkend prüfen.

## User Stories
- Als Azubi möchte ich Badges für besondere Leistungen erhalten (z.B. "7 Tage Streak"), damit ich mich für Meilensteine belohnt fühle.
- Als Azubi möchte ich nach dem Freischalten eines Badges ein dramatisches Modal sehen, damit sich der Moment besonders anfühlt.
- Als Azubi möchte ich alle verfügbaren Badges in meinem Profil sehen (freigeschaltet farbig, gesperrt ausgegraut), damit ich weiß, welche Meilensteine noch vor mir liegen.
- Als Azubi möchte ich das Datum sehen, an dem ich ein Badge freigeschaltet habe.
- Als Azubi möchte ich beim ersten Login nach dem Feature-Launch bereits verdiente Badges erhalten (rückwirkende Vergabe).

## Acceptance Criteria
- [ ] Mindestens 15 Badges definiert (siehe Badge-Set unten)
- [ ] Badge-Freischaltung löst ein dramatisches Modal aus (Badge-Icon groß, Name, Beschreibung, "Weiter"-Button)
- [ ] Mehrere gleichzeitig freigeschaltete Badges werden nacheinander als separate Modals angezeigt (Queue)
- [ ] Badge-Galerie ist in die Profil-Seite eingebettet: freigeschaltete Badges farbig, gesperrte ausgegraut
- [ ] Freischaltungsdatum wird unter jedem freigeschalteten Badge angezeigt
- [ ] Badge-Vergabe erfolgt automatisch nach jeder Session-Speicherung
- [ ] Einmalige Migrations-Funktion prüft beim ersten Deployment alle bestehenden Nutzerdaten rückwirkend

**Badge-Set (Minimum 15):**
| Badge | Icon | Bedingung |
|-------|------|-----------|
| Erster Schritt | 🎯 | Erste Session abgeschlossen |
| Auf dem Weg | 📚 | 10 Sessions abgeschlossen |
| Lernprofi | 🎓 | 50 Sessions abgeschlossen |
| Feuerstarter | 🔥 | 3 Tage Streak |
| Wochenkrieger | ⚔️ | 7 Tage Streak |
| Monatsmeister | 🏆 | 30 Tage Streak |
| Allrounder | 🌟 | Mindestens 10 Fragen in jedem Fach beantwortet |
| BGP-Experte | 📊 | 100 BGP-Fragen richtig beantwortet |
| KSK-Experte | 💰 | 100 KSK-Fragen richtig beantwortet |
| STG-Experte | 🚚 | 100 STG-Fragen richtig beantwortet |
| LOP-Experte | 📦 | 100 LOP-Fragen richtig beantwortet |
| Perfektionist | ✨ | Session mit 100% Trefferquote abgeschlossen |
| Level 10 | 🥉 | Level 10 erreicht |
| Level 25 | 🥈 | Level 25 erreicht |
| Prüfungsreif | 🥇 | Level 50 erreicht |

## Edge Cases
- **Mehrere Badges gleichzeitig:** Nacheinander als separate Modals anzeigen (Queue). Erst das nächste Modal zeigen, wenn der User "Weiter" drückt.
- **Rückwirkende Vergabe (Migration):** Einmalige Server-Funktion beim ersten Deployment prüft für alle User: Sessions-Anzahl, Streak-Länge, XP/Level, Fach-Antworten. Bereits verdiente Badges werden vergeben — ohne Modal (damit kein Spam beim nächsten Login).
- **Badge-Check schlägt fehl:** Stiller Fehler, kein Badge. Wird beim nächsten Trigger (nächste Session) erneut geprüft.
- **Badge bereits vorhanden:** Doppelte Vergabe wird durch `UNIQUE` Constraint in der DB verhindert (user_id + badge_id).
- **User löscht Konto:** Kaskadierendes Delete auf `user_badges`.
- **Neue Badges nach Deployment:** Neue Badge-Definitionen müssen eine eigene rückwirkende Vergabe auslösen können.

## UI Details
- **Unlock-Modal:** Vollbild-Modal mit Badge-Icon (groß, animiert), Badge-Name, Beschreibung der Bedingung, "+"-Animation, "Weiter"-Button. Ähnlich dem bestehenden `level-up-dialog.tsx`.
- **Badge-Galerie (Profil):** Grid-Layout im Profil. Freigeschaltete Badges: farbig mit Datum darunter. Gesperrte Badges: ausgegraut mit Bedingung als Tooltip/Text.
- **Keine eigene /badges-Seite** — alles embedded in der Profil-Seite.

## Technical Requirements
- Supabase-Tabellen: `badges` (Definitionen), `user_badges` (Freischaltungen mit `unlocked_at` Timestamp)
- Badge-Check-Logik läuft nach jeder Session-Speicherung (in App-Logik, nicht DB-Trigger)
- Migrations-Script als einmalige Server Action oder API-Route (`/api/badges/migrate`)
- Badge-Definitionen als statische Konstante im Code (kein Admin-UI in diesem Feature)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
