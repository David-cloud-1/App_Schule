# PROJ-4: XP & Level System

## Status: Approved
**Created:** 2026-04-16
**Last Updated:** 2026-04-17

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

### Database Changes
Add to `profiles` table: `total_xp INTEGER DEFAULT 0`.
`quiz_sessions.xp_earned` already exists (currently always 0) — will now be populated.
Level is computed client-side from `total_xp` (no DB column needed).

### Level Formula
- Level n requires `50 × n × (n−1)` total XP
- Level 1→2: 100 XP, Level 2→3: 200 XP, Level n→n+1: n×100 XP
- Level caps display at 50; XP continues accumulating beyond that

### XP Calculation (server-side)
- +10 XP per correct answer
- +5 XP bonus per correct answer if `current_streak ≥ 7`
- 0 XP for wrong answers, no deduction

### API Changes
- Update `POST /api/quiz/sessions`: calculate XP server-side, atomically increment `profiles.total_xp`, return enriched response `{ xp_earned, new_total_xp, leveled_up, old_level, new_level }`
- New `GET /api/profile/stats`: returns `total_xp`, `current_streak`, `longest_streak`

### New Shared Utility
- `src/lib/xp-utils.ts`: pure functions `getLevelFromXp(xp)`, `getXpForLevel(n)`, `getProgressToNextLevel(xp)`

### New Frontend Components
- `XpLevelBadge` — colored level number pill
- `XpProgressBar` — progress bar toward next level
- `LevelUpDialog` — celebration modal (shadcn Dialog)

### Updated Pages
- Header: show real `total_xp` (fetch from stats API)
- Home page stats card: real XP + level badge
- Quiz summary: show `+N XP` from API response + level-up dialog if leveled up

## QA Test Results

**QA Date:** 2026-04-17
**Status after QA:** Approved (BUG-1 fixed, no remaining bugs)

### Acceptance Criteria Results

| # | Acceptance Criterion | Result | Notes |
|---|---|---|---|
| 1 | +10 XP per correct answer | ✅ Pass | Unit tested, `XP_PER_CORRECT = 10` |
| 2 | +0 XP for wrong answers (no deduction) | ✅ Pass | Score counts only `is_correct` answers |
| 3 | Streak bonus: +5 XP/correct when streak ≥ 7 | ✅ Pass | Unit tested; bonus applies on new streak reaching 7 |
| 4 | Level 1–50, progressive XP thresholds | ✅ Pass | Formula `50×n×(n-1)`, 42 unit tests cover all boundaries |
| 5 | Level + XP progress bar visible in dashboard | ✅ Pass | `XpLevelBadge` + `XpProgressBar` in home page |
| 6 | Level-up animation/modal on level up | ✅ Pass | `LevelUpDialog` with animate-pulse glow ring |
| 7 | XP earned shown in session summary ("+50 XP") | ✅ Pass | "+N XP" card in quiz summary screen |
| 8 | XP and level persisted, sync across devices | ✅ Pass | `total_xp` in `profiles`, atomic DB update |

### Edge Cases Tested

| Edge Case | Result |
|---|---|
| Level 50 cap — XP runs over max | ✅ `getLevelFromXp` caps at 50, `getProgressPercent` returns 100% |
| Session aborts (network error) | ✅ `saveSession` returns null; no XP awarded |
| Negative XP input | ✅ `getLevelFromXp(-100)` returns level 1 |
| 999999 XP (far beyond max) | ✅ Returns level 50 |

### Security Audit

| Check | Result |
|---|---|
| XP calculated server-side (no spoofing) | ✅ |
| Input validated with Zod (UUID check, array size 1–20) | ✅ |
| Unauthenticated API calls redirected to /login (307) | ✅ |
| No XP/level data in error/redirect responses | ✅ |
| Profile update scoped to `user.id` (no IDOR) | ✅ |
| RLS UPDATE policy on profiles | ✅ Added in migration |

### Bugs Found

| # | Severity | Description | Steps to Reproduce |
|---|---|---|---|
| BUG-1 | Medium | ~~Double-clicking "Ergebnisse anzeigen" during async session save can submit the session twice~~ | **FIXED:** Added `isSubmitting` guard state in `quiz-client.tsx` — button is disabled after first click until session is saved. |

### Test Coverage

- **Unit tests:** 42 new tests in `src/lib/xp-utils.test.ts` — all pass (79/79 total)
- **API integration tests:** 13 new tests in `route.test.ts` — all pass
- **E2E tests:** `tests/PROJ-4-5-xp-streak-system.spec.ts` — 19/19 Chromium pass; 3 Mobile Safari skipped (WebKit not installed on this machine, pre-existing env issue)

## Deployment
_To be added by /deploy_
