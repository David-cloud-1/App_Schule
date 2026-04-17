import { test, expect } from '@playwright/test'

// ============================================================
// PROJ-4: XP & Level System
// PROJ-5: Streak System
// ============================================================
// Note on auth behavior: the middleware redirects ALL unauthenticated
// requests (including API routes) to /login with a 307. This means
// the API's own 401 response is never reached for unauthenticated E2E
// calls — the middleware redirect IS the security enforcement.
// We use maxRedirects: 0 to capture the raw 307.
//
// Tests marked [REQUIRES_LIVE_AUTH] need a real Supabase session and
// are skipped automatically in this E2E suite.
// ============================================================

// ── Route Protection ─────────────────────────────────────────

test.describe('PROJ-4/5: Route protection', () => {
  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated visit to /quiz redirects to /login', async ({ page }) => {
    await page.goto('/quiz')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ── GET /api/profile/stats — Auth enforcement ─────────────────

test.describe('PROJ-4/5 AC: GET /api/profile/stats auth enforcement', () => {
  test('redirects unauthenticated request to /login (307)', async ({ request }) => {
    const res = await request.get('/api/profile/stats', { maxRedirects: 0 })
    // Middleware returns 307 before the API handler runs
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toContain('/login')
  })

  test('redirect response has no profile data', async ({ request }) => {
    const res = await request.get('/api/profile/stats', { maxRedirects: 0 })
    const body = await res.text()
    // 307 redirect body is empty or minimal — must not contain user data
    expect(body).not.toContain('total_xp')
    expect(body).not.toContain('current_streak')
    expect(body).not.toContain('longest_streak')
    expect(body).not.toContain('level')
  })
})

// ── POST /api/quiz/sessions — Auth enforcement ────────────────

test.describe('PROJ-4/5 AC: POST /api/quiz/sessions auth enforcement', () => {
  test('redirects unauthenticated request to /login (307)', async ({ request }) => {
    const res = await request.post('/api/quiz/sessions', {
      maxRedirects: 0,
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
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toContain('/login')
  })

  test('redirect response leaks no XP or streak data', async ({ request }) => {
    const res = await request.post('/api/quiz/sessions', {
      maxRedirects: 0,
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
    const body = await res.text()
    expect(body).not.toContain('xp_earned')
    expect(body).not.toContain('new_streak')
    expect(body).not.toContain('leveled_up')
  })
})

// ── Security: no XSS or data injection via headers ───────────

test.describe('PROJ-4/5: Security headers', () => {
  test('API routes include X-Frame-Options: DENY', async ({ request }) => {
    const res = await request.get('/api/profile/stats', { maxRedirects: 0 })
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })

  test('API routes include X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get('/api/profile/stats', { maxRedirects: 0 })
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('API routes include Strict-Transport-Security', async ({ request }) => {
    const res = await request.get('/api/profile/stats', { maxRedirects: 0 })
    expect(res.headers()['strict-transport-security']).toContain('max-age=')
  })

  test('injecting user_id query param does not bypass auth', async ({ request }) => {
    const res = await request.get(
      '/api/profile/stats?user_id=550e8400-e29b-41d4-a716-446655440001',
      { maxRedirects: 0 },
    )
    // Must still redirect to login — query params cannot bypass auth
    expect(res.status()).toBe(307)
  })
})

// ── Login page renders correctly after redirect ───────────────

test.describe('PROJ-4/5: Login page (redirect target from protected routes)', () => {
  test('login page shows email + password inputs', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

// ── Skipped: acceptance criteria that require live auth ───────

test.describe('PROJ-4 AC (skipped — requires live auth)', () => {
  test.skip('each correct answer earns +10 XP', async () => {})
  test.skip('streak bonus (+5/correct) when streak ≥ 7 days', async () => {})
  test.skip('level-up dialog shown when crossing XP threshold', async () => {})
  test.skip('XP and level visible in header after login', async () => {})
  test.skip('XP progress bar updates in home page stats card', async () => {})
  test.skip('"+N XP" shown in quiz summary screen', async () => {})
})

test.describe('PROJ-5 AC (skipped — requires live auth)', () => {
  test.skip('streak increments by 1 after completing a session on a new day', async () => {})
  test.skip('streak stays the same when playing twice on same day', async () => {})
  test.skip('streak resets to 1 when a day is missed', async () => {})
  test.skip('streak visible in header (flame icon + count)', async () => {})
  test.skip('streak banner shown in quiz summary', async () => {})
  test.skip('longest streak persisted in DB', async () => {})
})
