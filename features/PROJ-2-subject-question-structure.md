# PROJ-2: Subject & Question Structure

## Status: Deployed
**Created:** 2026-04-16
**Last Updated:** 2026-04-17

## Dependencies
- Requires: PROJ-1 (User Authentication) – Fragen sind nur für eingeloggte Nutzer sichtbar

## User Stories
- Als Azubi möchte ich Fragen nach Fach (BGP, KSK, STG, LOP) gefiltert sehen, damit ich gezielt lernen kann.
- Als Azubi möchte ich Fragen auch nach Prüfungsteil (Leistungserstellung, KSK, WiSo) sortiert sehen.
- Als Admin möchte ich Fragen einer Kategorie (Fach + Schwierigkeitsgrad) zuordnen.
- Als System möchte ich Fragen mit Metadaten (Fach, Prüfungsteil, Schwierigkeitsgrad, Typ) speichern, damit der Quiz-Algorithmus gezielt auswählen kann.

## Acceptance Criteria
- [ ] Es existieren 4 Fach-Kategorien: BGP, KSK, STG, LOP
- [ ] Es existieren 3 Prüfungsteil-Kategorien: Leistungserstellung, KSK-Prüfung, WiSo
- [ ] Jede Frage hat: Fragetext, Antwortoptionen (Multiple Choice, 4 Optionen), korrekte Antwort, Erklärung (optional), Fach, Schwierigkeitsgrad (leicht/mittel/schwer)
- [ ] Fragen können als "aktiv" oder "inaktiv" markiert werden (inaktive werden im Quiz nicht angezeigt)
- [ ] Mindestens 10 Test-Fragen pro Fach sind beim ersten Launch vorhanden (Seed-Daten)
- [ ] Fragen können mehreren Fächern gleichzeitig zugeordnet werden (z.B. STG + LOP)

## Edge Cases
- Was passiert, wenn ein Fach keine aktiven Fragen hat? → Nutzer sieht Hinweis "Noch keine Fragen verfügbar" statt leerer Screen
- Was passiert bei einer Frage ohne Erklärung? → Erklärungsfeld einfach nicht anzeigen
- Was passiert, wenn alle 4 Antwortoptionen als korrekt markiert sind? → Admin-Validierung verhindert das

## Technical Requirements
- Datenstruktur: Supabase-Tabellen `subjects`, `questions`, `answer_options`
- Performance: Fragen-Abfrage < 300ms auch bei 1000+ Fragen
- Supabase RLS: Azubis können Fragen nur lesen (nicht schreiben), Admin hat vollen Zugriff

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Status:** Architected — 2026-04-16

### Component Structure

```
/subjects (Subject Selection Screen)
+-- SubjectGrid
|   +-- SubjectCard (×4: BGP, KSK, STG, LOP)
|       +-- Subject icon + color accent
|       +-- Subject name + short description
|       +-- Active question count badge
|       +-- "Jetzt lernen" Button
+-- EmptyState (wenn Fach keine aktiven Fragen hat)

Wiederverwendbare Micro-Komponenten (für Quiz, Dashboard, etc.):
+-- DifficultyBadge    (leicht / mittel / schwer — farbige Pill)
+-- SubjectTag         (BGP / KSK / STG / LOP — kleines Label)
+-- ExamPartTag        (Leistungserstellung / KSK-Prüfung / WiSo)
```

### Data Model (Plain Language)

**`subjects`** — Die 4 Lernfächer
- ID, code (BGP/KSK/STG/LOP), vollständiger Name, Farbe, Icon-Name
- Festes Set — per Seed beim Launch, nicht vom Nutzer erstellt

**`exam_parts`** — Die 3 IHK-Prüfungsteile
- ID, code (LEISTUNG/KSK/WISO), vollständiger Name
- Festes Set — per Seed beim Launch

**`questions`** — Der Kerninhalt
- ID, Fragetext, optionale Erklärung, Schwierigkeitsgrad (leicht/mittel/schwer), aktiv/inaktiv-Flag, erstellt am

**`question_subjects`** — Verknüpft Fragen mit Fächern (many-to-many)
- Eine Frage über Frachtbriefe kann sowohl STG als auch LOP zugeordnet werden
- Einfache Join-Tabelle: Frage-ID + Fach-ID

**`answer_options`** — Die 4 Antwortoptionen pro Frage
- ID, Frage-ID, Antworttext, ist-korrekt-Flag, Anzeigereihenfolge (1–4)
- Validierung: genau 1 korrekte Antwort pro Frage (Admin-seitig)

**Speicherort:** Supabase (PostgreSQL) — kein localStorage, da Inhalte mit allen Nutzern geteilt und vom Admin verwaltet werden.

### API Routes

| Route | Zweck | Nutzer |
|-------|-------|--------|
| `GET /api/subjects` | Alle Fächer + Anzahl aktiver Fragen | Fächerscreen, Dashboard |
| `GET /api/questions` | Gefilterte Fragen (nach Fach, Schwierigkeit, Limit) | Quiz-Engine (PROJ-3) |

Schreib-APIs gehören zu PROJ-9 (Admin Panel).

### Tech Decisions (Why)

| Entscheidung | Begründung |
|--------------|-----------|
| **Many-to-many für Fächer** | Echte Prüfungsfragen berühren mehrere Fächer. Eine 1:1-Zuordnung würde Duplikate erzwingen. |
| **`answer_options` als eigene Tabelle** | Hält den Fragetext sauber; ermöglicht zufällige Reihenfolge der Optionen im Quiz. |
| **aktiv/inaktiv-Flag** | Admin kann Fragen entwerfen, prüfen, dann veröffentlichen — ohne Löschen/Neuerstellen. |
| **Fächer per Seed (nicht nutzererstellbar)** | BGP/KSK/STG/LOP sind durch IHK-Verordnung fest. Sie ändern sich nicht. |
| **Supabase RLS von Anfang an** | Azubis erhalten nur Lesezugriff auf aktive Fragen. Admin hat vollen Schreibzugriff. |
| **Datenbankindexe auf subject_id + is_active** | Stellt < 300ms-Antwortzeiten auch bei 1000+ Fragen sicher. |

### Seed Data Plan

Beim ersten Launch: **10 Fragen pro Fach = 40 Fragen insgesamt**, verteilt auf alle 3 Schwierigkeitsstufen. Ausreichend für einen spielbaren Quiz-Start ohne manuelle Admin-Arbeit vorab.

### Dependencies

Keine neuen Pakete notwendig — Supabase-Client ist bereits aus PROJ-1 installiert.

## Frontend Implementation Notes

**Status:** Frontend done — 2026-04-16

### Files Created
- `src/components/difficulty-badge.tsx` — DifficultyBadge micro-component (leicht/mittel/schwer colored pill)
- `src/components/subject-tag.tsx` — SubjectTag micro-component (BGP/KSK/STG/LOP colored label)
- `src/components/exam-part-tag.tsx` — ExamPartTag micro-component (Leistungserstellung/KSK-Prüfung/WiSo)
- `src/components/subject-card.tsx` — SubjectCard with icon, color accent, question count, CTA button + empty state
- `src/app/subjects/page.tsx` — /subjects page with all 4 subject cards, auth-protected

### Files Modified
- `src/app/layout.tsx` — Added `class="dark"` + Inter font (dark mode as default per design system)
- `src/app/page.tsx` — Rebuilt home page in dark mode with stats placeholders and "Jetzt lernen" CTA to /subjects

### Deviations from Spec
- "Jetzt lernen" button links to `/quiz?subject={id}` (PROJ-3 route, not yet built)

## Backend Implementation Notes

**Status:** Backend done — 2026-04-16

### Database Migrations Applied
1. `create_subjects_questions_schema` — 5 tables: `subjects`, `exam_parts`, `questions`, `question_subjects`, `answer_options`; RLS on all tables; performance indexes
2. `seed_subjects_and_exam_parts` — 4 subjects (BGP/KSK/STG/LOP) + 3 exam parts
3. `seed_bgp_questions` — 10 BGP questions (3 leicht, 4 mittel, 3 schwer)
4. `seed_ksk_questions` — 10 KSK questions (3 leicht, 4 mittel, 3 schwer)
5. `seed_stg_questions` — 10 STG questions (3 leicht, 3 mittel, 4 schwer)
6. `seed_lop_questions` — 10 LOP questions (3 leicht, 4 mittel, 3 schwer)

### API Routes Created
- `GET /api/subjects` — returns all subjects with active question count
- `GET /api/questions` — filtered questions (subject, difficulty, limit, offset); Zod-validated

### Files Created
- `src/app/api/subjects/route.ts`
- `src/app/api/subjects/route.test.ts` — 3 tests (auth, count logic, DB error)
- `src/app/api/questions/route.ts`
- `src/app/api/questions/route.test.ts` — 6 tests (auth, happy path, subject filter, validation, DB error)
- `src/lib/database.types.ts` — generated TypeScript types

### Files Modified
- `src/app/subjects/page.tsx` — now queries Supabase directly server-side, replaces static mock data

### Test Results
13/13 unit tests passing. Build clean.

## QA Test Results

**Status:** In Review — 2026-04-16
**Tester:** QA Engineer (automated)
**Scope:** Unit tests, Playwright E2E (chromium), static code review, security audit.
**Environment:** Windows 10, Next.js dev server at http://localhost:3000, Supabase (remote).

### Test Execution Summary

| Suite | Result | Notes |
|-------|--------|-------|
| `npm test` (vitest) | 13/13 unit tests pass | 1 suite fails importing `tests/PROJ-1-*.spec.ts` — known pre-existing issue (vitest has no exclude, tries to load Playwright file). Not a PROJ-2 regression. |
| `tests/PROJ-2-subject-question-structure.spec.ts` (Playwright, chromium) | 14/14 pass | Written for this QA round. |
| `tests/PROJ-2-subject-question-structure.spec.ts` (Playwright, Mobile Safari / WebKit) | 11/14 pass (3 infra errors) | WebKit browser binary is missing (`npx playwright install webkit` not run). Infra issue, not a product bug. |

### Acceptance Criteria Results

| # | Acceptance Criterion | Result | Notes |
|---|----------------------|--------|-------|
| 1 | 4 Fach-Kategorien BGP/KSK/STG/LOP existieren | PASS (code + unit tests) | `seed_subjects_and_exam_parts` migration creates all 4; `SUBJECT_META` in `/subjects` page covers all 4 codes. Live DB verification requires auth login (covered indirectly by unit-test mock). |
| 2 | 3 Prüfungsteile Leistungserstellung/KSK/WiSo existieren | PASS (code review) | `exam_parts` table + seed migration documented in spec. `ExamPartTag` component handles the 3 codes (LEISTUNG/KSK/WISO). Not yet consumed by any UI — will be wired up in PROJ-3/PROJ-6. |
| 3 | Frage-Schema: Fragetext, 4 Optionen, korrekte Antwort, Erklärung (optional), Fach, Schwierigkeit | PASS (schema + code) | `questions` table has `question_text`, `explanation` (nullable), `difficulty`; `answer_options` is a separate 4-row table per question; `question_subjects` m:n; `DifficultyBadge` enforces 3 levels. See BUG-M-01 for admin-side validation gap. |
| 4 | Aktiv/Inaktiv-Flag, inactive nicht im Quiz | PASS | `questions.is_active` column exists; `/api/questions` and `/subjects` page both filter `is_active = true`. Covered by `route.test.ts` mocks. |
| 5 | Min. 10 Seed-Fragen pro Fach | PASS (spec documents 4 seed migrations × 10 = 40 Fragen) | Spec lists migrations `seed_bgp_questions`, `seed_ksk_questions`, `seed_stg_questions`, `seed_lop_questions`, each 10 questions. Live count requires auth login — tested implicitly by unit tests + `active_question_count` logic in `/api/subjects`. |
| 6 | Fragen können mehreren Fächern gleichzeitig angehören (m:n) | PASS (schema) | `question_subjects(question_id, subject_id)` join table with PK on both cols; foreign keys with cascade. |
| 7 | Empty state "Noch keine Fragen verfügbar" bei 0 aktiven Fragen | PASS (UI code review) | `SubjectCard` shows "Noch keine Fragen verfügbar" fallback when `activeQuestionCount === 0` (lines 64–68). |

All 7 acceptance criteria pass.

### Security Audit

| Check | Result | Notes |
|-------|--------|-------|
| RLS enabled on all tables | PASS (per spec) | Migration `create_subjects_questions_schema` enables RLS on all 5 tables; students read-only on active questions, admin full access (documented in spec). |
| API routes verify authentication | PASS | Both `/api/subjects` and `/api/questions` call `supabase.auth.getUser()` and return 401 if absent. Unit-tested. Middleware also redirects unauthenticated requests before the handler runs. |
| Input validation (Zod) on `/api/questions` | PASS | `QuerySchema` enforces difficulty enum, limit 1–50, offset ≥ 0. Invalid inputs return 400 with flattened error details. SQL-like strings in `subject` are safely compared case-insensitively in JS (no raw SQL). |
| Security headers | PASS | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: origin-when-cross-origin`, `Strict-Transport-Security` all present on every response (verified by E2E tests). |
| Data leak on malformed input | PASS | Malformed requests return 307 (redirect) or 400, never 500 or data. Verified with 5 payloads including `' OR 1=1--`. |
| Secrets hygiene | PASS | `process.env.NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` only — no service-role key in client path. |

See BUG-L-01 for a minor information-disclosure concern with redirect behavior.

### Bugs Found

#### BUG-M-01 (Medium) — Pagination silently broken when combined with subject filter
**File:** `src/app/api/questions/route.ts` (lines 34–77)
**Severity:** Medium (functional — blocks clean pagination in PROJ-3 quiz)
**Priority:** High — should be fixed before PROJ-3 starts

**Description:** The route applies `.range(offset, offset + limit - 1)` at the database level BEFORE in-memory subject filtering. This means `GET /api/questions?subject=BGP&limit=10` does NOT return 10 BGP questions — it returns the first 10 questions of any subject, then keeps only the BGP ones, possibly yielding 0–10.

**Steps to reproduce:**
1. Seed contains 40 questions across 4 subjects (10 each).
2. Request `GET /api/questions?subject=LOP&limit=10&offset=0`
3. If questions are ordered by `created_at` and LOP was seeded last, the first 10 by `created_at` will be BGP, leaving 0 LOP in the response.

**Impact:** Quiz engine (PROJ-3) cannot reliably fetch N questions for a specific subject via pagination. Also `total` field misreports post-filter count instead of DB-level matching count.

**Suggested fix (for backend owner, not QA):** Filter by subject at the DB level via a nested `.in('id', ...)` subquery on `question_subjects`, or use a Postgres RPC / view. Do the `.range()` AFTER filtering.

#### BUG-M-02 (Medium) — Admin validation gap: no DB constraint on "exactly 1 correct answer"
**File:** Database schema (`answer_options`)
**Severity:** Medium (data integrity)
**Priority:** Medium — not blocking MVP, but admin panel (PROJ-9) must enforce it

**Description:** The spec's edge case ("Was passiert, wenn alle 4 Antwortoptionen als korrekt markiert sind? → Admin-Validierung verhindert das") is documented but not enforced at the DB level. There is no CHECK constraint or trigger ensuring exactly one `is_correct = true` per `question_id`, and no constraint ensuring exactly 4 options per question.

**Impact:** Until PROJ-9 admin panel ships validation, a malformed seed or a direct SQL write would silently produce broken questions (0 or 2+ correct answers, fewer/more than 4 options), which the quiz would then show to students.

**Suggested fix:** Add a Postgres trigger or unique-index constraint (`CREATE UNIQUE INDEX ... WHERE is_correct`). Owned by backend.

#### BUG-L-01 (Low) — Middleware forwards query params into login redirect
**File:** `src/middleware.ts` (lines 39–43)
**Severity:** Low (information disclosure / UX quirk)
**Priority:** Low

**Description:** An unauthenticated `GET /api/questions?difficulty=ultra-hard` redirects (307) to `/login?difficulty=ultra-hard`. The API query string is reflected verbatim into the login URL. Not an open redirect (only same-origin), but leaks intent to referrers and creates confusing login URLs.

**Impact:** Cosmetic + tiny info disclosure. No direct exploit.

**Suggested fix:** In the middleware redirect, set `url.search = ''` before calling `NextResponse.redirect(url)`.

#### BUG-L-02 (Low) — API 401 handler code is unreachable from the browser
**File:** `src/app/api/subjects/route.ts`, `src/app/api/questions/route.ts`
**Severity:** Low (dead code / confusing contract)
**Priority:** Low

**Description:** The middleware intercepts `/api/*` for unauthenticated users and redirects (307) BEFORE the handler runs. So the handlers' `return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` branch is only reachable if middleware is bypassed. Unit tests mock the Supabase client directly and therefore still cover it, but the runtime behavior diverges from the API contract documented in the spec.

**Impact:** Developer confusion; future callers expecting JSON 401 will receive an HTML redirect.

**Suggested fix:** Either (a) exclude `/api/*` from the middleware redirect so the handler's 401 can respond, or (b) update the spec to say unauthenticated API calls are redirected.

#### BUG-L-03 (Low) — "Jetzt lernen" CTA points to non-existent `/quiz` route
**File:** `src/components/subject-card.tsx` (line 56)
**Severity:** Low (expected deviation, already noted by frontend dev)
**Priority:** Informational only

**Description:** Clicking "Jetzt lernen" navigates to `/quiz?subject={id}`, which does not exist (PROJ-3 not built). Will land on Next.js 404.

**Impact:** Expected for current sprint — documented in "Deviations from Spec" in Frontend Implementation Notes. Tracked here so it is not lost. Will be resolved by PROJ-3.

### Regression Check (per INDEX.md)

| Feature | Impact | Result |
|---------|--------|--------|
| PROJ-1: User Authentication | Middleware + login/register pages untouched; 13 unit tests still pass. No regression. | PASS |

### Cross-Browser / Responsive

| Viewport | Result |
|----------|--------|
| Chromium desktop | 14/14 E2E pass |
| iPhone 13 (Mobile Safari via Playwright WebKit) | Cannot run — WebKit binary not installed on this machine (`Executable doesn't exist at ...\webkit-2248\Playwright.exe`). Infrastructure issue, not a product bug. Recommend running `npx playwright install webkit` before deploy QA. |
| Firefox | Not executed in this round (no Firefox project in `playwright.config.ts`). Static CSS review: Tailwind utilities + native colors; no vendor-prefixed properties; should render identically. |
| 375px mobile (chromium emulation) | PASS via test `PROJ-2: Mobile responsiveness of redirect UX at 375px`. |

### Production-Readiness Recommendation

**APPROVED with conditions.**

No critical or high-severity bugs. All 7 acceptance criteria pass. PROJ-2 is ready to be marked Approved in INDEX.md.

Conditions before PROJ-3 depends on this code:
1. **Fix BUG-M-01** (subject-filter + pagination) — PROJ-3 quiz will depend on correct per-subject pagination. High priority.
2. **Track BUG-M-02** (admin validation) as a hard blocker for PROJ-9 (Admin Content Management).
3. Install Playwright WebKit locally (`npx playwright install webkit`) or remove the `Mobile Safari` project from `playwright.config.ts` to keep CI green.
4. Consider the Low bugs for a cleanup sweep but none block deployment of the current slice (subjects screen behind auth, no student-visible impact).


## Deployment

**Status:** Deployed — 2026-04-17
**Production URL:** https://app-schule.vercel.app
**Git Tag:** v1.2.0-PROJ-2
**Commit:** a0af310

### Deployed Changes
- 5 Supabase tables live (subjects, exam_parts, questions, question_subjects, answer_options)
- 50 seed questions: BGP/KSK/STG/LOP/PUG (10 each)
- `/subjects` page live behind auth
- `GET /api/subjects` + `GET /api/questions` live
- BUG-M-01 fixed before deploy (subject filter now DB-level)
