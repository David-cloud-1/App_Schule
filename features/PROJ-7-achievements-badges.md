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
- `src/app/api/badges/route.test.ts` — 6 unit tests: auth, all-locked, specific unlock, graceful fallback, sort order, field shape
- `src/app/api/badges/migrate/route.test.ts` — 7 unit tests: secret enforcement, open endpoint, 500 on DB error, results shape

### Database
- Applied migration `create_badges_and_user_badges`: tables `badges` (seeded with 15 rows) and `user_badges` with RLS policies and UNIQUE constraint on `(user_id, badge_id)`
- Verified in Supabase: badges=15 rows, user_badges=0 rows, RLS enabled on both tables
- RLS policies: `badges` SELECT open to all authenticated; `user_badges` SELECT/INSERT scoped to own `user_id`

## QA Test Results

**QA Date:** 2026-04-18
**Tester:** /qa skill

### Acceptance Criteria

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | Mindestens 15 Badges definiert | ✅ PASS | 15 badges in DB + TypeScript constant, all IDs match spec |
| 2 | Badge-Freischaltung löst dramatisches Modal aus | ✅ PASS | `BadgeUnlockModal`: gold glow ring, animated emoji, name, description, "Weiter"-Button |
| 3 | Mehrere Badges nacheinander als separate Modals (Queue) | ✅ PASS | `badgeQueue` state array in `quiz-client.tsx`; each "Weiter" calls `q.slice(1)` |
| 4 | Badge-Galerie in Profil-Seite eingebettet (farbig/ausgegraut) | ✅ PASS | `/profile` embeds `BadgeGallery`; unlocked: gold border + colored icon; locked: grayscale + opacity-30 |
| 5 | Freischaltungsdatum unter jedem freigeschalteten Badge | ✅ PASS | `formatDate(unlockedAt)` rendered in gold below each unlocked badge |
| 6 | Badge-Vergabe automatisch nach jeder Session-Speicherung | ✅ PASS | `sessions/route.ts` calls `checkAndAwardBadges()` after profile update |
| 7 | Einmalige Migrations-Funktion (`/api/badges/migrate`) | ❌ FAIL | **HIGH BUG** — see Bug #1 below |

**Result: 6/7 criteria pass**

---

### Bugs Found

#### Bug #1 — HIGH: Migration endpoint bypassed by RLS, cannot process all users

**Severity:** High
**File:** [src/app/api/badges/migrate/route.ts](src/app/api/badges/migrate/route.ts)

**Description:**
`POST /api/badges/migrate` uses `createClient()` (anon key + user session cookies) to fetch all profiles. The `profiles` table has RLS policy `profiles_select_own` with condition `auth.uid() = id`. This means:
- Called without authentication: `auth.uid() = NULL` → 0 profiles fetched → 0 badges awarded
- Called with a user session: only that user's own profile is fetched → migration runs for 1 user only

The intent is to award badges retroactively for **all** users. This requires a service-role-key Supabase client to bypass RLS.

**Steps to Reproduce:**
1. Set `BADGE_MIGRATE_SECRET` or remove it
2. `POST /api/badges/migrate` from any unauthenticated caller
3. Response: `"Migration complete. 0 badges awarded across 0 users."`

**Fix:** Use a service role client (separate `createServiceClient()` using `SUPABASE_SERVICE_ROLE_KEY`) in the migrate route.

---

#### Bug #2 — LOW: Dead DB query in retroactive perfectionist check

**Severity:** Low
**File:** [src/lib/badges.ts](src/lib/badges.ts#L211)

**Description:**
In retroactive mode, lines 211–213 execute a `quiz_sessions` query with `.filter('score', 'eq', 'total')`. PostgREST cannot compare two columns this way — it compares `score` to the literal string `'total'`. The result is immediately assigned to a voided variable (`void perfectSessions`). This is dead code that wastes one unnecessary round-trip.

**Fix:** Remove the dead query entirely (lines 210–222 already compute `hasPerfectSession` correctly via the `allSessions` JS loop on line 219).

---

#### Bug #3 — LOW: Missing `.limit()` on list queries in `checkAndAwardBadges`

**Severity:** Low
**File:** [src/lib/badges.ts](src/lib/badges.ts#L189)

**Description:**
The `quiz_answers` select query (line 189) and the `quiz_sessions` retroactive `allSessions` query (line 215) have no `.limit()`. Violates backend rules; could fetch thousands of rows for power users, causing slow badge checks over time.

**Fix:** Add `.limit(10000)` or refactor to use aggregate SQL queries.

---

### Security Audit

| Area | Finding |
|------|---------|
| Authentication | `/api/badges` and `/profile` protected by middleware redirect + route-level `getUser()` check ✅ |
| Authorization | `user_badges` RLS: INSERT and SELECT scoped to own `user_id` ✅ |
| Duplicate prevention | UNIQUE constraint `(user_id, badge_id)` in DB prevents re-awarding ✅ |
| Input validation | Badge IDs only come from hardcoded `BADGE_MAP` lookup — no user-controlled badge ID ✅ |
| Secret endpoint | `/api/badges/migrate` protected by `BADGE_MIGRATE_SECRET` header when env var is set ✅ |
| XSS / Injection | No user input rendered unescaped; no SQL injection surface ✅ |
| Data leakage | `GET /api/badges` returns 401 (route) or middleware redirect — no badge data exposed unauthenticated ✅ |

No critical security vulnerabilities found.

---

### Automated Test Coverage

| Suite | Tests | Result |
|-------|-------|--------|
| `src/lib/badges.test.ts` (new) | 23 unit tests | ✅ All pass |
| `src/app/api/badges/route.test.ts` | 6 integration tests | ✅ All pass |
| `src/app/api/badges/migrate/route.test.ts` | 7 integration tests | ✅ All pass |
| `tests/PROJ-7-achievements-badges.spec.ts` (new) | 5 E2E tests (5 skipped, require live auth) | ✅ All runnable tests pass |

Total unit tests run: **36 passing**

---

### Production-Ready Decision

**NOT READY** — 1 High bug must be fixed before deployment.

The retroactive migration (AC #7) is non-functional due to the RLS/anon-key issue. All other acceptance criteria pass. After fixing Bug #1, run `/qa` again to verify.

## Deployment
_To be added by /deploy_
