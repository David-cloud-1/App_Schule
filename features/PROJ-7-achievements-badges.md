# PROJ-7: Achievements & Badges

## Status: In Progress
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

### Component Structure

```
Profile Page (/profile)
+-- ProfileHeader
|   +-- Avatar, Username, Level Badge (reuse xp-level-badge.tsx)
|   +-- XP + Streak summary (reuse existing badge components)
+-- BadgeGallery
    +-- BadgeCard (×15+)
    |   +-- [Unlocked] colored icon, name, unlock date
    |   +-- [Locked]   greyed icon, name, unlock condition text
    +-- (Empty state if 0 badges)

Quiz Result Flow (existing quiz-client.tsx — extended)
+-- [after session saved]
    +-- BadgeUnlockQueue (new state)
        +-- BadgeUnlockModal (shown one-at-a-time)
            +-- Large animated badge icon
            +-- Badge name + condition description
            +-- "Weiter" button → shows next in queue or closes
```

### Data Model

**Table: `badges`** *(static reference data — seeded once)*
- `id` — unique badge identifier (e.g. `first_step`, `week_warrior`)
- `name` — display name (e.g. "Erster Schritt")
- `description` — unlock condition in plain text
- `icon` — emoji character (e.g. `🎯`)
- `sort_order` — display order in gallery

**Table: `user_badges`** *(one row per badge earned by a user)*
- `user_id` → foreign key to `profiles` (cascade delete)
- `badge_id` → foreign key to `badges`
- `unlocked_at` — timestamp when earned
- `is_retroactive` — `true` for migration awards (no modal), `false` for real-time awards (modal shown)
- UNIQUE constraint on `(user_id, badge_id)` — prevents duplicates

**Badge Definitions:** 15 badge definitions stored as a TypeScript constant in `src/lib/badges.ts`. The `badges` table is seeded from this constant.

### API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/badges` | Returns all badge definitions + user's unlocked badges (with dates) |
| `POST /api/badges/migrate` | One-time migration: awards all earned badges retroactively for all users |

**Badge-Check Logic** runs inside existing `POST /api/quiz/sessions` (after profile update). Checks all 15 conditions, inserts newly earned badges, and returns `new_badges: string[]` in the response.

### Frontend Flow

```
User completes quiz
  → POST /api/quiz/sessions returns { leveled_up, new_badges: ["week_warrior", ...] }
  → Frontend builds modal queue:
       1. If leveled_up → LevelUpDialog (existing)
       2. For each badge in new_badges → BadgeUnlockModal (new)
  → Each modal dismissed with "Weiter" before next appears
```

### Tech Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Badge definitions | TypeScript constant | 15 fixed items; no admin UI needed. Single source of truth. |
| Badge check timing | Server-side after session save | Same place XP/streak computed. Atomic, no extra client calls. |
| Modal queue | Client state array | Simple, no persistence needed. Same pattern as level-up dialog. |
| Retroactive migration | Dedicated `/api/badges/migrate` route | Called once at deploy; `is_retroactive: true` silences modals. |
| Gallery location | Embedded in new `/profile` page | Spec requires no separate `/badges` page. |

### What Gets Reused vs. New

| Reused | New |
|--------|-----|
| `level-up-dialog.tsx` (pattern reference) | `BadgeUnlockModal` component |
| `xp-level-badge.tsx`, `streak-badge.tsx` | `BadgeGallery` + `BadgeCard` components |
| `POST /api/quiz/sessions` (extended) | `GET /api/badges` route |
| `quiz-client.tsx` (modal queue added) | `POST /api/badges/migrate` route |
| shadcn `Dialog` | `/profile` page |
| | `src/lib/badges.ts` (badge definitions) |
| | DB tables: `badges`, `user_badges` |

### New Dependencies
None — Dialog, Lucide icons, Supabase, and Tailwind are already installed.

## Implementation Notes

### Frontend
- `src/lib/badges.ts` — 15 badge definitions as `BADGE_DEFINITIONS` constant + `checkAndAwardBadges()` function
- `src/components/badge-unlock-modal.tsx` — animated unlock modal (gold glow ring, emoji icon, "Weiter" button)
- `src/components/badge-gallery.tsx` — 3-column grid; unlocked badges colored with date, locked ones greyed out with condition text
- `src/app/profile/page.tsx` — new `/profile` page: profile card (avatar, name, XP/level, streak, progress bar) + badge gallery
- `src/app/quiz/quiz-client.tsx` — extended: `SessionResult.new_badges` field, badge queue state, modals shown one-at-a-time after level-up dialog
- `src/app/page.tsx` — added profile icon link in header

### Backend
- `src/app/api/badges/route.ts` — GET /api/badges: all definitions merged with user's unlocked badges + dates
- `src/app/api/badges/migrate/route.ts` — POST /api/badges/migrate: retroactive migration for all users (protected by `BADGE_MIGRATE_SECRET` env var)
- `src/app/api/quiz/sessions/route.ts` — extended: calls `checkAndAwardBadges()` after profile update, returns `new_badges` in response

### Database
- Applied migration `create_badges_and_user_badges`: tables `badges` (seeded with 15 rows) and `user_badges` with RLS policies and UNIQUE constraint on `(user_id, badge_id)`

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
