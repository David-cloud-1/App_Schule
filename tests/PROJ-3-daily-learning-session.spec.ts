import { test, expect, type APIResponse } from '@playwright/test'

// ============================================================
// PROJ-3: Daily Learning Session / Quiz — E2E Tests
// ============================================================
// Without live Supabase auth credentials we cannot load the
// /quiz page as an authenticated user. The tests below focus on
// what is observable without auth:
//   - Middleware / route protection for /quiz
//   - Auth enforcement on API routes (/api/quiz/sessions, /api/quiz/today)
//   - Input validation on POST /api/quiz/sessions (unauthenticated → 401)
//   - Security headers on /quiz responses
//   - Login page renders correctly on redirect
//
// Tests marked [REQUIRES_LIVE_AUTH] cover acceptance criteria that need
// a real student session and are skipped automatically.
// ============================================================

// ── Route Protection ─────────────────────────────────────────

test.describe('PROJ-3 AC: Quiz nur für eingeloggte Nutzer', () => {
  test('unauthenticated visit to /quiz redirects to /login', async ({ page }) => {
    await page.goto('/quiz')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated visit to /quiz?subject=<uuid> redirects to /login', async ({ page }) => {
    await page.goto('/quiz?subject=550e8400-e29b-41d4-a716-446655440001')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ── API Auth Enforcement ─────────────────────────────────────

test.describe('PROJ-3: API routes enforce authentication', () => {
  test('POST /api/quiz/sessions without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/quiz/sessions', {
      data: {
        answers: [
          {
            question_id: '550e8400-e29b-41d4-a716-446655440001',
            selected_option_id: '660e8400-e29b-41d4-a716-446655440001',
            is_correct: true,
          },
        ],
      },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/quiz/today without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/quiz/today')
    expect(res.status()).toBe(401)
  })
})

// ── API Input Validation ─────────────────────────────────────
// These test that malformed requests are rejected cleanly.
// Unauthenticated callers see 401 before validation — that's expected;
// we confirm no 500s and no data leakage.

test.describe('PROJ-3: POST /api/quiz/sessions validates input (unauthenticated)', () => {
  const invalidBodies = [
    { name: 'empty object', body: {} },
    { name: 'empty answers array', body: { answers: [] } },
    {
      name: 'invalid question_id (not a UUID)',
      body: {
        answers: [{ question_id: 'not-a-uuid', selected_option_id: '660e8400-e29b-41d4-a716-446655440001', is_correct: true }],
      },
    },
    {
      name: 'missing is_correct',
      body: {
        answers: [{ question_id: '550e8400-e29b-41d4-a716-446655440001', selected_option_id: '660e8400-e29b-41d4-a716-446655440001' }],
      },
    },
  ]

  for (const { name, body } of invalidBodies) {
    test(`malformed body (${name}) returns 400 or 401, never 500`, async ({ request }) => {
      const res: APIResponse = await request.post('/api/quiz/sessions', { data: body })
      const status = res.status()
      // Unauthenticated → 401 before validation. Both are safe responses.
      expect([400, 401]).toContain(status)
      expect(status).not.toBe(500)
    })
  }
})

// ── Security Headers ─────────────────────────────────────────

test.describe('PROJ-3: Security headers are present on /quiz', () => {
  test('X-Frame-Options: DENY is set', async ({ request }) => {
    const res = await request.get('/quiz', { maxRedirects: 0 })
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })

  test('X-Content-Type-Options: nosniff is set', async ({ request }) => {
    const res = await request.get('/quiz', { maxRedirects: 0 })
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('Referrer-Policy is set', async ({ request }) => {
    const res = await request.get('/quiz', { maxRedirects: 0 })
    expect(res.headers()['referrer-policy']).toBe('origin-when-cross-origin')
  })

  test('Strict-Transport-Security is set', async ({ request }) => {
    const res = await request.get('/quiz', { maxRedirects: 0 })
    expect(res.headers()['strict-transport-security']).toMatch(/max-age=\d+/)
  })
})

// ── Login page renders after redirect ────────────────────────

test.describe('PROJ-3: Login page renders correctly on redirect', () => {
  test('redirected /quiz shows login page with SpediLern branding', async ({ page }) => {
    await page.goto('/quiz')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('SpediLern')).toBeVisible()
  })
})

// ── Mobile viewport ──────────────────────────────────────────

test.describe('PROJ-3: Mobile responsiveness at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('/quiz redirect renders login on mobile', async ({ page }) => {
    await page.goto('/quiz')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('SpediLern')).toBeVisible()
  })
})

// ── Tests requiring live Supabase auth (manual only) ─────────
//
// [REQUIRES_LIVE_AUTH] AC-1: Fach-Auswahl (BGP/KSK/STG/LOP/Gemischt) auf /subjects
// [REQUIRES_LIVE_AUTH] AC-2: Session besteht aus 10 Fragen (QUIZ_SIZE constant)
// [REQUIRES_LIVE_AUTH] AC-3: Fragen werden zufällig aus gewähltem Fach gezogen
// [REQUIRES_LIVE_AUTH] AC-4: Fragetext + 4 Antwortoptionen werden angezeigt
// [REQUIRES_LIVE_AUTH] AC-5: Sofortiges Feedback (grün/rot) + Erklärung nach Antwort
// [REQUIRES_LIVE_AUTH] AC-6: Fortschrittsbalken und "Frage X/Y" Anzeige
// [REQUIRES_LIVE_AUTH] AC-7: Zusammenfassung mit X/10 richtig + verdiente XP
// [REQUIRES_LIVE_AUTH] AC-8: Bereits beantwortete Fragen des Tages nicht erneut gestellt
// [REQUIRES_LIVE_AUTH] AC-9: "Alle Fragen für heute erledigt!" wenn Pool leer
// [REQUIRES_LIVE_AUTH] Edge: Hinweis wenn <10 Fragen verfügbar
// [REQUIRES_LIVE_AUTH] Edge: Doppelklick auf Antwort ignoriert zweite Auswahl
// [REQUIRES_LIVE_AUTH] Edge: Langer Fragetext scrollbar (overflow-y)
