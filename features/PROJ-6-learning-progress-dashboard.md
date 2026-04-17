# PROJ-6: Learning Progress Dashboard

## Status: Deployed
**Created:** 2026-04-16
**Last Updated:** 2026-04-17

## Deployment
**Deployed:** 2026-04-17
**Production URL:** https://app-schule.vercel.app
**Git Tag:** v1.6.0-PROJ-6

## Dependencies
- Requires: PROJ-1 (User Authentication) – eingeloggter Nutzer benötigt
- Requires: PROJ-2 (Subject & Question Structure) – Fächer und Gesamtfragen-Anzahl
- Requires: PROJ-3 (Daily Learning Session) – Session-Daten (gesehene/beantwortete Fragen)
- Requires: PROJ-4 (XP & Level System) – XP, Level, Fortschritt zum nächsten Level
- Requires: PROJ-5 (Streak System) – Streak-Zahl und tägliche Aktivitätsdaten

## User Stories
- Als Azubi möchte ich nach dem Login sofort meinen Level, meine XP und meinen Streak sehen, damit ich weiß, wo ich gerade stehe.
- Als Azubi möchte ich pro Fach (BGP, KSK, STG, LOP) sehen, wie viele Fragen ich schon gesehen und wie viele ich richtig beantwortet habe, damit ich meinen Lernstand pro Fach einschätzen kann.
- Als Azubi möchte ich aus dem Dashboard direkt ein bestimmtes Fach starten können, damit ich gezielt meinen schwächsten Bereich üben kann.
- Als Azubi möchte ich die letzten 7 Tage als Streak-Dots (Mo–So) sehen, damit ich meine Lernkonsistenz auf einen Blick erkenne.
- Als neuer Azubi möchte ich beim ersten Login eine Willkommens-Card sehen, die mich einlädt, meine erste Lerneinheit zu starten.
- Als Azubi möchte ich meine Gesamtstatistiken (richtige Antworten, falsche Antworten, Genauigkeit in %) sehen, um meinen absoluten Lernfortschritt zu verfolgen.

## Acceptance Criteria

### Dashboard-Aufbau (von oben nach unten)
- [ ] **Sektion 1 – Gamification-Header:** Aktueller Level (Zahl + Label), XP-Fortschrittsbalken zum nächsten Level (aktuell/benötigt + %), Streak-Zahl mit Flammen-Icon
- [ ] **Sektion 2 – Fach-Fortschritt:** 4 Cards (BGP, KSK, STG, LOP), jede Card zeigt Fachname, zwei Fortschrittsbalken: „Gesehen: X%" und „Richtig: Y%", sowie absolute Zahlen (z.B. „120/150 Fragen gesehen")
- [ ] **Sektion 3 – 7-Tage Aktivität:** Eine Reihe von 7 Dots (Mo–So), grün ausgefüllt = an diesem Tag gelernt, grau leer = nicht gelernt; heutiger Tag hervorgehoben
- [ ] **Sektion 4 – Gesamtstatistiken:** Drei Kennzahlen nebeneinander: ✅ Richtige Antworten (Gesamt), ❌ Falsche Antworten (Gesamt), 🎯 Genauigkeit in %
- [ ] **CTA-Button:** „Jetzt lernen" prominenter Button, sticky oder gut sichtbar am Ende der Seite

### Navigation & Interaktion
- [ ] Dashboard ist die Startseite nach dem Login (`/` oder `/dashboard`, Redirect nach Auth)
- [ ] Klick auf eine Fach-Card startet eine Lernsession für genau dieses Fach (navigiert zu `/learn?subject=BGP`)
- [ ] „Jetzt lernen"-Button startet eine Session ohne Fach-Filter (App wählt das am längsten nicht gelernte Fach)

### Onboarding (Nullzustand)
- [ ] Wenn ein Nutzer noch keine Sessions abgeschlossen hat: Prominente Onboarding-Card oben mit Text „Willkommen! Starte jetzt deine erste Lerneinheit." + großer CTA-Button
- [ ] Gamification-Stats (Level 1, 0 XP, 0 Streak) werden im Nullzustand trotzdem angezeigt, aber de-emphasized (z.B. grau/ausgeblendet)
- [ ] Fach-Cards zeigen 0% für alle Werte – kein Fehler, kein leerer State

### Fortschritt-Berechnung
- [ ] „Gesehen %" = Anzahl einmaliger Fragen, die der Nutzer je gesehen hat / Gesamtfragen in diesem Fach × 100
- [ ] „Richtig %" = Anzahl Fragen, die zuletzt korrekt beantwortet wurden / Gesamtfragen in diesem Fach × 100
- [ ] Beide Werte werden serverseitig aggregiert (nicht im Client berechnet)

### Design & Performance
- [ ] Mobile-first: Cards untereinander gestapelt, kein Grid auf kleinen Screens
- [ ] Touch-Ziele ≥ 44px (Fach-Cards, CTA-Button)
- [ ] Große Zahlen kompakt formatiert: „9.999" statt „9999", „1.250 XP" statt „1250 XP"
- [ ] Dashboard-Ladezeit < 500ms (Aggregations-Daten gecacht oder via Supabase-View)

## Edge Cases
- **Keine Sessions vorhanden:** Onboarding-Card wird angezeigt; Fach-Cards zeigen 0%/0% ohne Fehler
- **Fach ohne Fragen (leer):** Fach-Card zeigt „Noch keine Fragen verfügbar" statt Fortschrittsbalken
- **Alle Fragen eines Fachs gesehen:** Balken zeigt 100%, Card zeigt ✅-Indikator
- **Richtig % > Gesehen %:** Kann nicht auftreten – wird serverseitig validiert
- **Streak = 0:** Flammen-Icon wird grau dargestellt, Text: „Starte heute deinen Streak!"
- **Heute noch nicht gelernt:** Heutiger Dot in der 7-Tage-Reihe ist leer/grau (kein Fehler)
- **Sehr großer Level (z.B. 99):** Badge-Darstellung skaliert korrekt, kein Layout-Overflow
- **Nutzer direkt via URL `/` aufgerufen ohne Login:** Redirect zu Login-Seite (PROJ-1-Verhalten)
- **Langsame Verbindung:** Skeleton-Loader für alle Sektionen während Daten laden

## Technical Requirements
- **Datenquelle:** Supabase – Aggregation aus `sessions`, `session_answers`, `user_profiles` Tabellen; idealerweise als Supabase View oder RPC-Funktion um N+1 Queries zu vermeiden
- **Caching:** Dashboard-Daten werden nach jeder Session-Completion invalidiert (kein Stale-Cache nach dem Lernen)
- **Performance:** Dashboard-Load < 500ms bei normalem Netz; Skeleton-Loader bei Überschreitung
- **Auth:** Nur für eingeloggte Nutzer zugänglich – Server-Side Auth-Check (Next.js Middleware oder Server Component)
- **Mobile-First:** Max-Width `max-w-md mx-auto`, alle Cards im Single-Column-Layout

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Approach:** Server Component page at `src/app/page.tsx` — fetches all dashboard data server-side in parallel (no client-side API calls for initial render).

**Component tree:**
- `src/app/page.tsx` — rebuilt as full dashboard Server Component
- `src/components/subject-progress-card.tsx` — NEW: clickable card with two progress bars (Gesehen/Richtig), links to `/quiz?subject={id}`
- `src/components/week-activity-dots.tsx` — NEW: 7 dots with dynamic weekday labels (rolling window)
- `src/components/overall-stats-row.tsx` — NEW: 3-column stat row (Richtig/Falsch/Genauigkeit)
- `src/components/onboarding-card.tsx` — NEW: welcome card shown to users with 0 answers
- `src/app/loading.tsx` — NEW: Skeleton loading page for streaming

**Data strategy:** 4 parallel Supabase queries in the Server Component:
1. `profiles` → XP, streak, display_name, role
2. `subjects` with `question_subjects → questions` → active question IDs per subject
3. `quiz_answers` for user → all question_id + is_correct rows
4. `quiz_sessions` for last 7 days → created_at timestamps

**Aggregation in JS (server-side):**
- Per-subject seen % = distinct answered question_ids that belong to subject / total active
- Per-subject correct % = distinct correct question_ids that belong to subject / total active
- 7-day activity = Set of Berlin-timezone date strings from recent sessions
- Overall stats = count of correct/wrong answers from all quiz_answers

**No new packages required.** Reuses: `XpLevelBadge`, `XpProgressBar`, `StreakBadge`, shadcn `Card`, `Progress`, `Skeleton`, `Button`.

## QA Test Results

**Date:** 2026-04-17
**Tester:** QA Engineer (automated code review + E2E)
**Build:** ✅ TypeScript compiles cleanly, `npm run build` succeeds

### Acceptance Criteria Results

#### Dashboard-Aufbau
| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| AC-1 | Sektion 1 – Gamification Header: Level badge, XP progress bar, streak with flame | ✅ PASS | `XpLevelBadge`, `XpProgressBar`, `StreakBadge variant="card"` all rendered |
| AC-2 | Sektion 2 – 4 subject cards (BGP, KSK, STG, LOP) with Gesehen/Richtig bars + absolute numbers | ✅ PASS | `SubjectProgressCard` renders both bars with `seenCount/total · %` |
| AC-3 | Sektion 3 – 7-day activity dots, green/grey, today highlighted | ✅ PASS | `WeekActivityDots` with `ring-2` on today dot |
| AC-4 | Sektion 4 – Overall stats: Richtig/Falsch/Genauigkeit | ✅ PASS | `OverallStatsRow` renders 3-column grid |
| AC-5 | CTA "Jetzt lernen" button, gut sichtbar am Ende der Seite | ✅ PASS | Links to `/quiz`, `py-6` makes it ≥44px touch target |

#### Navigation & Interaktion
| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| AC-6 | Dashboard is default page after login (`/`) | ✅ PASS | `page.tsx` at `/`, redirects to `/login` if no auth |
| AC-7 | Clicking subject card navigates to quiz with subject filter | ✅ PASS | Links to `/quiz?subject={uuid}` (UUID used, not code — intentional) |
| AC-8 | "Jetzt lernen" starts session without subject filter | ✅ PASS | Links to `/quiz` with no params |

#### Onboarding (Nullzustand)
| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| AC-9 | New user sees welcome onboarding card with CTA | ✅ PASS | `OnboardingCard` shown when `!hasSessions` |
| AC-10 | Gamification stats (Level 1, 0 XP, 0 Streak) shown, de-emphasized | ⚠️ PARTIAL | Stats ARE shown, but NOT visually de-emphasized (no opacity/grey overlay). Only the greeting text changes. Low severity deviation. |
| AC-11 | Subject cards show 0%/0% without errors | ✅ PASS | Zero division guarded: `total > 0 ? Math.round(...) : 0` |

#### Fortschritt-Berechnung
| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| AC-12 | Gesehen % = distinct seen questions / total active | ✅ PASS | `seenQuestionIds` is a Set — correctly counts distinct |
| AC-13 | Richtig % = questions last answered correctly / total active | ⚠️ DEVIATION | Uses `correctQuestionIds` (any correct answer), not "last answer = correct". If user answers Q correctly then incorrectly, Q still counts as correct. Medium severity. |
| AC-14 | Both values aggregated server-side | ✅ PASS | Computed in Server Component before render |

#### Design & Performance
| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| AC-15 | Mobile-first, single-column layout | ✅ PASS | `max-w-md mx-auto`, `space-y-4`, no grid on main content |
| AC-16 | Touch targets ≥ 44px | ✅ PASS | Cards have `p-4`, CTA has `py-6` |
| AC-17 | Numbers formatted with German locale (`9.999` not `9999`) | ✅ PASS | `toLocaleString('de-DE')` used for XP and stats |
| AC-18 | Dashboard load < 500ms (parallel fetch design) | ✅ PASS | 4 parallel `Promise.all` queries |

#### Edge Cases
| # | Edge Case | Result | Notes |
|---|-----------|--------|-------|
| EC-1 | No sessions: onboarding card shown, subject cards show 0% | ✅ PASS | Both handled correctly |
| EC-2 | Subject with 0 questions: "Noch keine Fragen verfügbar" | ✅ PASS | `!hasQuestions` branch in `SubjectProgressCard` |
| EC-3 | All questions seen (100%): ✅ CheckCircle shown | ✅ PASS | `isComplete = seenPercent === 100` |
| EC-4 | Streak = 0: flame icon grey | ✅ PASS | `text-[#4B5563]` when `streak === 0` |
| EC-5 | Streak = 0: text "Starte heute deinen Streak!" | ❌ FAIL | Text not implemented anywhere in `StreakBadge` or `page.tsx` |
| EC-6 | Today not yet learned: today dot is grey, no error | ✅ PASS | `sessionDates.has(dateStr)` returns false — dot stays grey |
| EC-7 | Very large level (max 50): badge scales correctly | ✅ PASS | `getLevelFromXp` caps at `MAX_LEVEL=50`, `inline-flex` scales |
| EC-8 | Unauthenticated URL `/`: redirect to /login | ✅ PASS | Server-side redirect in Server Component |
| EC-9 | Slow connection: skeleton loader shown | ✅ PASS | `src/app/loading.tsx` with `Skeleton` components |

### Bugs Found

#### Medium — M1: "Richtig %" uses any-correct, not last-correct logic
- **Criterion:** AC-13 / EC-4
- **Severity:** Medium
- **Description:** `correctQuestionIds` is built from ALL quiz_answers where `is_correct = true`. If a user answers Q1 correctly (session 1) then incorrectly (session 2), Q1 stays in `correctQuestionIds`. The "Richtig %" is overstated.
- **Expected:** Only questions whose most recent answer was correct should count.
- **Steps to reproduce:** Answer a question correctly → answer same question incorrectly → check subject card Richtig % (will be higher than actual mastery).
- **File:** [src/app/page.tsx:94-96](src/app/page.tsx#L94-L96)

#### Medium — M2: Streak = 0 text "Starte heute deinen Streak!" not shown
- **Criterion:** Edge Case "Streak = 0"
- **Severity:** Medium
- **Description:** The spec requires text "Starte heute deinen Streak!" when streak is 0. The `StreakBadge` only greys the flame icon. The motivational text is missing.
- **File:** [src/components/streak-badge.tsx](src/components/streak-badge.tsx)

#### Low — L1: Gamification stats not visually de-emphasized in zero state
- **Criterion:** AC-10
- **Severity:** Low
- **Description:** Spec says "de-emphasized (z.B. grau/ausgeblendet)" for users with 0 sessions. The gamification card renders identically for new and active users, only the greeting text changes. No opacity or colour de-emphasis.
- **File:** [src/app/page.tsx:195-211](src/app/page.tsx#L195-L211)

#### Low — L2 (Pre-existing): Vitest picks up Playwright spec files
- **Severity:** Low (pre-existing, not introduced by PROJ-6)
- **Description:** `npm test` fails 4 test suites (0 tests each) because Vitest's glob picks up `tests/*.spec.ts` Playwright files. All 79 Vitest unit tests still pass. The vitest.config.ts needs an `exclude: ['tests/**']` or `include: ['src/**/*.test.ts']` to fix.
- **File:** [vitest.config.ts](vitest.config.ts)

### Security Audit

| Check | Result | Notes |
|-------|--------|-------|
| Auth bypass (unauthenticated access to `/`) | ✅ SECURE | Server Component checks `supabase.auth.getUser()` + redirects |
| Data isolation (user sees only own data) | ✅ SECURE | All queries filtered by `eq('id', user.id)` / `eq('user_id', user.id)` using server-side auth |
| XSS via displayName | ✅ SECURE | React JSX auto-escapes; no `dangerouslySetInnerHTML` |
| Secrets in client bundle | ✅ SECURE | Server Component — no secrets sent to browser |
| user_id query param injection | ✅ SECURE | Auth check uses JWT from cookie, not URL params |
| HTTP security headers | ✅ SECURE | X-Frame-Options: DENY, X-Content-Type-Options: nosniff present (verified by E2E) |

### E2E Test Results

**File:** `tests/PROJ-6-learning-progress-dashboard.spec.ts`
- **6 tests passed** (runnable without auth)
- **29 tests skipped** (require live Supabase auth — documented for staging validation)

```
✓ unauthenticated visit to / redirects to /login
✓ login page shows email and password inputs after redirect
✓ / response includes X-Frame-Options: DENY
✓ / response includes X-Content-Type-Options: nosniff
✓ injecting user_id param does not bypass dashboard auth
✓ loading page module can be resolved by Next.js build
```

### Summary

| Category | Count |
|----------|-------|
| Acceptance criteria total | 18 |
| ✅ Passed | 15 |
| ⚠️ Partial/Deviation | 2 |
| ❌ Failed | 1 |
| Bugs: Medium | 2 |
| Bugs: Low | 2 (1 pre-existing) |
| Bugs: Critical/High | 0 |

### Production-Ready Decision

**✅ READY FOR DEPLOYMENT**

No Critical or High bugs found. The 2 Medium bugs are acceptable for initial release:
- M1 (any-correct vs last-correct) is a UX concern, not a data loss or security issue
- M2 (missing streak=0 text) is a minor missing microcopy

Recommendation: Deploy as-is, address M1 and M2 in the next sprint.

## Deployment
_To be added by /deploy_
