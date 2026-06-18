import { test, expect } from '@playwright/test'

// ============================================================
// PROJ-14: Lücken schließen — E2E Tests
// ============================================================
// Without live Supabase auth credentials we cannot load
// authenticated pages. Tests focus on:
//   - Route protection for /quiz?mode=weak
//   - API auth enforcement on GET /api/quiz/weak
//   - API input validation (subject_id format)
//   - Security headers on new API route
//   - Normal quiz flow unaffected (regression)
// ============================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440001'

// ── Route Protection ─────────────────────────────────────────

test.describe('PROJ-14 AC: Lücken-Modus nur für eingeloggte Nutzer', () => {
  test('unauthenticated visit to /quiz?mode=weak redirects to /login', async ({ page }) => {
    await page.goto('/quiz?mode=weak')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated visit to /quiz?subject=<uuid>&mode=weak redirects to /login', async ({ page }) => {
    await page.goto(`/quiz?subject=${VALID_UUID}&mode=weak`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated visit to /subjects redirects to /login', async ({ page }) => {
    await page.goto('/subjects')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ── API Auth Enforcement ─────────────────────────────────────

test.describe('PROJ-14: GET /api/quiz/weak enforces authentication', () => {
  test('returns 401 without session cookie', async ({ request }) => {
    const res = await request.get('/api/quiz/weak')
    expect(res.status()).toBe(401)
  })

  test('returns 401 with subject_id param but no auth', async ({ request }) => {
    const res = await request.get(`/api/quiz/weak?subject_id=${VALID_UUID}`)
    expect(res.status()).toBe(401)
  })

  test('returns 401 with count_only param but no auth', async ({ request }) => {
    const res = await request.get('/api/quiz/weak?count_only=true')
    expect(res.status()).toBe(401)
  })
})

// ── API Input Validation ──────────────────────────────────────

test.describe('PROJ-14: GET /api/quiz/weak validates input', () => {
  test('returns 401 (not 400) for invalid subject_id — auth checked first', async ({ request }) => {
    // Without auth, server returns 401 before input validation
    const res = await request.get('/api/quiz/weak?subject_id=not-a-uuid')
    expect(res.status()).toBe(401)
  })
})

// ── Regression: Normal Quiz Flow Unaffected ───────────────────

test.describe('PROJ-14 regression: normal quiz flow unchanged', () => {
  test('unauthenticated /quiz still redirects to /login', async ({ page }) => {
    await page.goto('/quiz')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated /quiz?subject=<uuid> still redirects to /login', async ({ page }) => {
    await page.goto(`/quiz?subject=${VALID_UUID}`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('GET /api/quiz/today without auth still returns 401', async ({ request }) => {
    const res = await request.get('/api/quiz/today')
    expect(res.status()).toBe(401)
  })

  test('POST /api/quiz/sessions without auth still returns 401', async ({ request }) => {
    const res = await request.post('/api/quiz/sessions', {
      data: {
        answers: [
          {
            question_id: VALID_UUID,
            selected_option_id: '660e8400-e29b-41d4-a716-446655440001',
            is_correct: true,
          },
        ],
      },
    })
    expect(res.status()).toBe(401)
  })
})

// ── Security Headers ─────────────────────────────────────────

test.describe('PROJ-14: API security headers', () => {
  test('GET /api/quiz/weak returns JSON content-type', async ({ request }) => {
    const res = await request.get('/api/quiz/weak')
    // 401 is expected; we verify it returns proper JSON (not HTML error page)
    expect(res.headers()['content-type']).toContain('application/json')
  })

  test('response body is valid JSON with error field', async ({ request }) => {
    const res = await request.get('/api/quiz/weak')
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(typeof body.error).toBe('string')
  })

  test('does not expose internal stack traces in error response', async ({ request }) => {
    const res = await request.get('/api/quiz/weak')
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('at ')
    expect(JSON.stringify(body)).not.toContain('node_modules')
  })
})
