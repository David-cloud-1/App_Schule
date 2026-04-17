# PROJ-3: Daily Learning Session / Quiz

## Status: In Progress
**Created:** 2026-04-16
**Last Updated:** 2026-04-17

## Dependencies
- Requires: PROJ-1 (User Authentication) – Session gehört zu einem Nutzer
- Requires: PROJ-2 (Subject & Question Structure) – Fragen müssen vorhanden sein
- Requires: PROJ-4 (XP & Level System) – XP wird am Ende vergeben
- Requires: PROJ-5 (Streak System) – Streak wird nach Session aktualisiert

## User Stories
- Als Azubi möchte ich täglich eine Lerneinheit starten, die mir 10–20 Fragen stellt, damit ich regelmäßig lernen kann.
- Als Azubi möchte ich ein Fach auswählen (oder "Gemischt"), bevor ich starte, damit ich gezielt üben kann.
- Als Azubi möchte ich nach jeder Antwort sofortiges Feedback erhalten (richtig/falsch + Erklärung), damit ich direkt lerne.
- Als Azubi möchte ich am Ende einer Session mein Ergebnis sehen (z.B. 8/10 richtig, +50 XP), damit ich meinen Fortschritt einschätzen kann.
- Als Azubi möchte ich eine laufende Frage abbrechen und später fortsetzen können.

## Acceptance Criteria
- [ ] Nutzer kann eine Session starten mit Fach-Auswahl (BGP / KSK / STG / LOP / Gemischt)
- [ ] Eine Session besteht aus 10 Fragen (konfigurierbar)
- [ ] Fragen werden zufällig aus dem gewählten Fach gezogen (keine Wiederholung innerhalb einer Session)
- [ ] Jede Frage zeigt: Fragetext + 4 Antwortoptionen (Multiple Choice)
- [ ] Nach Auswahl einer Antwort: sofortiges Feedback (grün = richtig, rot = falsch) + optionale Erklärung
- [ ] Fortschrittsbalken zeigt an, wie viele Fragen noch verbleiben (z.B. "Frage 3/10")
- [ ] Am Ende der Session: Zusammenfassung (X/10 richtig, verdiente XP, Streak-Status)
- [ ] Bereits beantwortete Fragen des Tages werden nicht erneut gestellt (pro Tag)
- [ ] Wenn alle Fragen eines Fachs für heute beantwortet wurden → Hinweis + Weiterleitung zu anderem Fach

## Edge Cases
- Was passiert, wenn weniger als 10 Fragen für ein Fach verfügbar sind? → Session mit verfügbaren Fragen starten, Hinweis anzeigen
- Was passiert, wenn der Nutzer mitten in der Session den Browser schließt? → Session-Stand geht verloren, aber keine Fehler; kein XP vergeben
- Was passiert, wenn Nutzer doppelt auf eine Antwort klickt? → Erste Auswahl zählt, weitere Klicks ignoriert
- Was passiert bei sehr langem Fragetext (z.B. Fallbeschreibung)? → Text scrollbar, Fragen-Container passt sich an

## Technical Requirements
- Session-Daten werden lokal (React State) gehalten und erst am Ende gespeichert
- Performance: Fragen-Laden < 200ms
- Mobile: Touch-friendly Antwort-Buttons (min. 44px Höhe)

---
<!-- Sections below are added by subsequent skills -->

## Implementation Notes (Frontend)

**Built 2026-04-17**

### Files created / modified
- `src/app/quiz/page.tsx` — Server component: auth guard, fetches subject + questions from Supabase, shuffles both questions and answer options server-side, passes ≤10 questions to client
- `src/app/quiz/quiz-client.tsx` — Client component: quiz state machine (active → feedback → summary), answer selection with instant color feedback, explanation panel, session summary with XP placeholder
- `src/app/subjects/page.tsx` — Added "Gemischt lernen" card linking to `/quiz` (no subject param = all questions mixed)

### How it works
- Entry: `SubjectCard` links to `/quiz?subject=<uuid>` (existing), new "Gemischt" card links to `/quiz`
- Server shuffles questions + answer option order on every request (new shuffle each visit → "Nochmal üben" gives a fresh set)
- `totalAvailable` is passed to client to show a warning when fewer than 10 questions exist
- XP display is a placeholder (5 XP/correct); real XP will be persisted by PROJ-4

### Deviations from spec
- "Bereits beantwortete Fragen des Tages" deduplication deferred to backend (PROJ-3 backend / PROJ-4)
- No session persistence on browser close (as spec allows: "Session-Daten werden lokal gehalten")

## Implementation Notes (Backend)

**Built 2026-04-17**

### Database Migration
Applied migration `create_quiz_sessions_and_answers`:
- `quiz_sessions` — one row per completed quiz (user, subject, score, total, xp_earned placeholder)
- `quiz_answers` — one row per individual answer (links session, user, question, selected option, correct flag)
- RLS enabled on both tables: users can only access their own rows
- Indexes on `user_id`, `completed_at`, `(user_id, answered_at)` for efficient per-day queries

### API Routes
- `POST /api/quiz/sessions` — saves a completed session + individual answers; Zod-validated; returns `{ session_id, score, total, xp_earned }`
- `GET /api/quiz/today` — returns distinct `answered_question_ids` for the authenticated user today (UTC); used to exclude already-answered questions
- `GET /api/quiz/today` route file also available for PROJ-4/5 integration

### Frontend Integration
- `src/app/quiz/page.tsx` updated: fetches today's answered IDs from Supabase directly (server component), excludes them from the question pool. Shows "Alle Fragen für heute erledigt!" screen when pool is empty.
- `src/app/quiz/quiz-client.tsx` updated: tracks `sessionAnswers[]` during quiz; calls `POST /api/quiz/sessions` fire-and-forget when user clicks "Ergebnisse anzeigen"

### Test Coverage (unit tests, 26 passing)
- `POST /api/quiz/sessions`: 8 tests (401, 200 happy path, 400 missing/empty/invalid/bad-JSON, 500 DB error, 200 non-fatal answers error, optional subject_id)
- `GET /api/quiz/today`: 4 tests (401, empty result, deduplication, 500 DB error)

### Notes
- `xp_earned` is stored as 0 (placeholder); PROJ-4 will update this field when XP system is built
- "Already answered today" deduplication uses UTC calendar day boundaries

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results

**Tested:** 2026-04-17

### Automated Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| Unit tests (Vitest) | 26 | ✅ All passing |
| E2E tests (Playwright) – PROJ-3 | 15 | ✅ All passing |
| E2E regression – PROJ-1 + PROJ-2 | 52 | ✅ No regressions |
| **Total** | **93** | ✅ |

### Acceptance Criteria

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| AC-1 | Nutzer kann Session starten mit Fach-Auswahl (BGP/KSK/STG/LOP/Gemischt) | ✅ Pass | SubjectCards + "Gemischt lernen" CTA |
| AC-2 | Session besteht aus 10 Fragen (konfigurierbar) | ✅ Pass | `QUIZ_SIZE = 10`, sliced server-side |
| AC-3 | Fragen zufällig aus gewähltem Fach, keine Wiederholung in Session | ✅ Pass | `shuffle()` + no duplicate IDs in slice |
| AC-4 | Jede Frage zeigt Fragetext + 4 Antwortoptionen | ✅ Pass | Rendered from `answer_options` join |
| AC-5 | Sofortiges Feedback (grün/rot) + optionale Erklärung | ✅ Pass | Correct → green, wrong → red + explanation panel |
| AC-6 | Fortschrittsbalken + "Frage X/10" Anzeige | ✅ Pass | `<Progress>` component + counter in header |
| AC-7 | Zusammenfassung: X/10 richtig, verdiente XP, **Streak-Status** | ⚠️ Partial | Score + XP shown; **Streak-Status fehlt** (deferred to PROJ-5) |
| AC-8 | Bereits beantwortete Fragen des Tages nicht erneut gestellt | ✅ Pass | Server-side deduplication via `quiz_answers` UTC filter |
| AC-9 | Alle Fragen erledigt → Hinweis + Weiterleitung zu anderem Fach | ✅ Pass | "Alle Fragen für heute erledigt!" screen + Button |

### Edge Cases

| Edge Case | Status | Notes |
|-----------|--------|-------|
| <10 Fragen verfügbar | ✅ Pass | Orange warning banner: "Nur X Fragen verfügbar" |
| Browser-Schließen mid-session | ✅ Pass | State local only, kein XP vergeben |
| Doppelklick auf Antwort | ✅ Pass | `if (hasAnswered) return` + `disabled={phase === 'feedback'}` |
| Langer Fragetext | ✅ Pass | `leading-relaxed`, scrollable container |

### Security Audit

| Check | Result |
|-------|--------|
| Route protection: /quiz redirect to /login (unauthenticated) | ✅ Pass |
| API auth: POST /api/quiz/sessions → 401 without session | ✅ Pass |
| API auth: GET /api/quiz/today → 401 without session | ✅ Pass |
| Zod input validation (invalid UUIDs, empty arrays) | ✅ Pass |
| XSS: kein `dangerouslySetInnerHTML` | ✅ Pass |
| SQL-Injection: Deduplication query uses DB-sourced UUIDs only | ✅ Pass |
| RLS: quiz_sessions + quiz_answers owner-only policies | ✅ Pass |
| Security headers (X-Frame-Options, nosniff, HSTS, Referrer-Policy) | ✅ Pass |

### Bugs Found

| # | Severity | Description | Repro |
|---|----------|-------------|-------|
| BUG-3-1 | Medium | **Streak-Status fehlt in Zusammenfassung** — AC-7 fordert Streak-Status in der Endzusammenfassung, aber die aktuelle Summary-Seite zeigt kein Streak-Widget. | Quiz abschließen → Summary → kein Streak-Widget sichtbar |

### Production-Ready Decision

**NOT READY** — 1 Medium bug.

BUG-3-1 (Streak-Status in Summary) is intentionally deferred to PROJ-5 (Streak System). Once PROJ-5 is implemented and the streak widget is added to the summary, re-run `/qa` to promote to **Approved**.

Current state is safe to deploy as a feature flag or behind PROJ-5 dependency. No Critical or High bugs.

## Deployment
_To be added by /deploy_
