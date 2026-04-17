# PROJ-5: Streak System

## Status: Approved
**Created:** 2026-04-16
**Last Updated:** 2026-04-17

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

### Database Changes
Add to `profiles` table:
- `current_streak INTEGER DEFAULT 0`
- `longest_streak INTEGER DEFAULT 0`
- `last_session_date DATE` (nullable)

### Streak Logic (server-side, Europe/Berlin timezone)
| `last_session_date` was... | Outcome |
|---|---|
| Today | Streak unchanged (already played today) |
| Yesterday | `current_streak += 1`, update `longest_streak` if new record |
| Older / null | `current_streak = 1` (reset or first session ever) |
Then `last_session_date = today`.

### API Changes
- Update `POST /api/quiz/sessions`: reads/updates streak fields in `profiles`, returns `{ new_streak, longest_streak }` in response
- `GET /api/profile/stats`: returns `current_streak`, `longest_streak` for header/home page

### New Frontend Components
- `StreakBadge` — flame icon + count pill (shown in header after login)

### Updated Pages
- Header: show `current_streak` with flame icon (from stats API)
- Home page stats card: real streak number
- Quiz summary: streak update banner ("🔥 N Tage Streak!")

## QA Test Results

**QA Date:** 2026-04-17
**Status after QA:** Approved (BUG-1 fixed, no remaining bugs)

### Acceptance Criteria Results

| # | Acceptance Criterion | Result | Notes |
|---|---|---|---|
| 1 | Streak +1 when user completes ≥1 session per calendar day | ✅ Pass | Unit tested; Berlin timezone used |
| 2 | Streak resets when a full calendar day is missed | ✅ Pass | Resets to 1 (new streak starts with completing session); matches Tech Design |
| 3 | Current streak visible in dashboard + profile (flame icon) | ✅ Pass | `StreakBadge` pill in header + stats card |
| 4 | Longest streak stored permanently | ✅ Pass | `longest_streak` column, `Math.max(prevLongest, newStreak)` |
| 5 | Push/Browser notification when no session today | ⏭️ Skip | Optional P1 — not implemented |
| 6 | Streak visible in app header (always after login) | ✅ Pass | `StreakBadge variant="pill"` in header |
| 7 | End of session shows new streak ("🔥 N Tage Streak!") | ✅ Pass | Streak banner in quiz summary |

### Edge Cases Tested

| Edge Case | Result |
|---|---|
| Midnight timezone — Berlin date vs UTC | ✅ UTC-ms offset + `Intl.DateTimeFormat` with `Europe/Berlin` avoids local-tz parsing |
| Session fails to save | ✅ Streak update only happens after successful session insert |
| First session ever (streak = 0) | ✅ Unit tested; `null` last_session_date → streak becomes 1 |
| Playing twice same day | ✅ Unit tested; streak stays unchanged |
| Day skipped (streak reset) | ✅ Unit tested; older date → streak resets to 1 |

### Security Audit

| Check | Result |
|---|---|
| Streak calculated server-side (no spoofing) | ✅ |
| Streak update scoped to authenticated user | ✅ |
| Unauthenticated requests redirected to /login | ✅ |
| No streak data in redirect responses | ✅ |

### Bugs Found

| # | Severity | Description |
|---|---|---|
| BUG-1 | Medium | ~~Shared with PROJ-4: double-click on "Ergebnisse anzeigen" can save the session twice and increment streak twice on the same day.~~ **FIXED:** `isSubmitting` guard in `quiz-client.tsx`. |

### AC Wording Note
The acceptance criterion says "Streak wird auf **0** zurückgesetzt" but the tech design and edge cases section specify the streak becomes **1** (the new session that broke the streak immediately starts a new 1-day streak). Implementation follows the tech design. This is Duolingo-consistent behavior.

### Test Coverage

- **Unit tests:** 6 streak-specific tests in `route.test.ts` — all pass
- **E2E tests:** `tests/PROJ-4-5-xp-streak-system.spec.ts` — 19/19 Chromium pass

## Deployment
_To be added by /deploy_
