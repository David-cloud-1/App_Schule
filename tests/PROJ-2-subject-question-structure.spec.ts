import { test, expect, type APIResponse } from '@playwright/test'

// ============================================================
// PROJ-2: Subject & Question Structure — E2E Tests
// ============================================================
// Without live Supabase auth credentials we cannot load the
// /subjects page as an authenticated user. The tests below
// therefore focus on what is observable without auth:
//   - Middleware / route protection for /subjects
//   - Auth enforcement on API routes (/api/subjects, /api/questions)
//   - Query-parameter validation on /api/questions
//   - Security headers present on responses
//   - Home page rendering (authed check skipped via redirect)
//
// Tests marked [REQUIRES_LIVE_AUTH] cover acceptance criteria
// that need a real student session (data load, empty state, etc.)
// and are skipped automatically.
// ============================================================

// ---------- Route protection / auth enforcement ----------

test.describe('PROJ-2 AC: Fragen sind nur für eingeloggte Nutzer sichtbar', () => {
  test('unauthenticated visit to /subjects redirects to /login', async ({ page }) => {
    await page.goto('/subjects')
    await expect(page).toHaveURL(/\/login/)
  })

  test('GET /api/subjects without auth does not expose data', async ({ request }) => {
    const res = await request.get('/api/subjects', { maxRedirects: 0 })
    // Either the middleware redirects (307) or the handler returns 401 — both are acceptable.
    // The critical requirement: no 200 + data leak.
    expect([307, 401, 302, 308]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.subjects).toBeUndefined()
    }
  })

  test('GET /api/questions without auth does not expose data', async ({ request }) => {
    const res = await request.get('/api/questions', { maxRedirects: 0 })
    expect([307, 401, 302, 308]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.questions).toBeUndefined()
    }
  })
})

// ---------- API contract (validation) ----------
// Note: these hit the middleware redirect for unauthenticated callers,
// so we can only assert that malformed requests are not processed and do
// not expose server errors or data.

test.describe('PROJ-2: API does not leak errors on malformed input (unauthenticated)', () => {
  const badRequests = [
    { name: 'invalid difficulty', q: '?difficulty=ultra-hard' },
    { name: 'non-numeric limit',  q: '?limit=abc' },
    { name: 'negative offset',    q: '?offset=-5' },
    { name: 'huge limit',         q: '?limit=99999' },
    { name: 'SQL-ish subject',    q: "?subject=' OR 1=1--" },
  ]

  for (const { name, q } of badRequests) {
    test(`malformed request (${name}) is rejected or redirected`, async ({ request }) => {
      const res: APIResponse = await request.get(`/api/questions${q}`, { maxRedirects: 0 })
      // Acceptable: redirect, 400, or 401. Never 500, never 200 with leaked data.
      const status = res.status()
      expect(status).not.toBe(500)
      expect([307, 302, 308, 400, 401]).toContain(status)
    })
  }
})

// ---------- Security headers ----------

test.describe('PROJ-2: Security headers are applied', () => {
  test('X-Frame-Options: DENY is set on /subjects redirect', async ({ request }) => {
    const res = await request.get('/subjects', { maxRedirects: 0 })
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })

  test('X-Content-Type-Options: nosniff is set', async ({ request }) => {
    const res = await request.get('/subjects', { maxRedirects: 0 })
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('Referrer-Policy is set', async ({ request }) => {
    const res = await request.get('/subjects', { maxRedirects: 0 })
    expect(res.headers()['referrer-policy']).toBe('origin-when-cross-origin')
  })

  test('Strict-Transport-Security is set', async ({ request }) => {
    const res = await request.get('/subjects', { maxRedirects: 0 })
    expect(res.headers()['strict-transport-security']).toMatch(/max-age=\d+/)
  })
})

// ---------- Homepage CTA to /subjects ----------

test.describe('PROJ-2: Home page links to /subjects (via redirect chain)', () => {
  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ---------- Mobile viewport sanity check ----------

test.describe('PROJ-2: Mobile responsiveness of redirect UX at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('/subjects redirect renders login on small viewports', async ({ page }) => {
    await page.goto('/subjects')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('SpediLern')).toBeVisible()
  })
})

// ---------- Tests requiring live Supabase auth (manual) ----------
// These acceptance criteria cannot be automated without a real test account:
//
// [REQUIRES_LIVE_AUTH] AC: 4 Fach-Kategorien BGP/KSK/STG/LOP werden angezeigt
// [REQUIRES_LIVE_AUTH] AC: Jede Subject-Card zeigt korrekten active_question_count (>= 10)
// [REQUIRES_LIVE_AUTH] AC: "Jetzt lernen" Button ist klickbar wenn Fragen vorhanden
// [REQUIRES_LIVE_AUTH] AC: Empty state "Noch keine Fragen verfügbar" wenn 0 aktive Fragen
// [REQUIRES_LIVE_AUTH] AC: GET /api/subjects returnt 4 Subjects mit active_question_count
// [REQUIRES_LIVE_AUTH] AC: GET /api/questions?subject=BGP returnt nur BGP-Fragen
// [REQUIRES_LIVE_AUTH] AC: Jede Frage hat genau 4 Antwortoptionen + 1 korrekte
// [REQUIRES_LIVE_AUTH] AC: Inactive questions werden nicht returnt
// [REQUIRES_LIVE_AUTH] Performance: /api/questions < 300ms bei 1000+ Fragen
