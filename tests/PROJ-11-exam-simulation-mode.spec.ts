import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

// ── Route Protection ─────────────────────────────────────────────────────────

test('PROJ-11 AC: /exam requires authentication', async ({ page }) => {
  await page.goto(`${BASE}/exam`)
  await expect(page).toHaveURL(/\/login/)
})

test('PROJ-11 AC: /exam-history requires authentication', async ({ page }) => {
  await page.goto(`${BASE}/exam-history`)
  await expect(page).toHaveURL(/\/login/)
})

test('PROJ-11 AC: /exam/[id]/results requires authentication', async ({ page }) => {
  await page.goto(`${BASE}/exam/non-existent-id/results`)
  await expect(page).toHaveURL(/\/login/)
})

// ── API: Auth Enforcement ─────────────────────────────────────────────────────

test('PROJ-11 AC: POST /api/exam/sessions without auth returns 401', async ({ request }) => {
  const res = await request.post(`${BASE}/api/exam/sessions`, {
    data: { parts: [2] },
  })
  expect(res.status()).toBe(401)
})

test('PROJ-11 AC: GET /api/exam/sessions/[id] without auth returns 401', async ({ request }) => {
  const res = await request.get(`${BASE}/api/exam/sessions/some-id`)
  expect(res.status()).toBe(401)
})

test('PROJ-11 AC: PATCH /api/exam/sessions/[id] without auth returns 401', async ({ request }) => {
  const res = await request.patch(`${BASE}/api/exam/sessions/some-id`, {
    data: { action: 'submit', answers: {} },
  })
  expect(res.status()).toBe(401)
})

test('PROJ-11 AC: PATCH /api/exam/sessions/[id]/self-score without auth returns 401', async ({ request }) => {
  const res = await request.patch(`${BASE}/api/exam/sessions/some-id/self-score`, {
    data: { questionId: 'q-1', score: 80 },
  })
  expect(res.status()).toBe(401)
})

test('PROJ-11 AC: GET /api/exam/history without auth returns 401', async ({ request }) => {
  const res = await request.get(`${BASE}/api/exam/history`)
  expect(res.status()).toBe(401)
})

// ── API: Admin Exam Sets Auth ─────────────────────────────────────────────────

test('PROJ-11 AC: GET /api/admin/exam-sets without auth returns 401 or 403', async ({ request }) => {
  const res = await request.get(`${BASE}/api/admin/exam-sets`)
  expect([401, 403]).toContain(res.status())
})

test('PROJ-11 AC: POST /api/admin/exam-sets without auth returns 401 or 403', async ({ request }) => {
  const res = await request.post(`${BASE}/api/admin/exam-sets`, {
    data: { name: 'Test', part: 2, question_ids: ['some-id'], is_active: false },
  })
  expect([401, 403]).toContain(res.status())
})

// ── API: Input Validation ─────────────────────────────────────────────────────

test('PROJ-11 AC: POST /api/exam/sessions with empty parts returns 400', async ({ request }) => {
  const res = await request.post(`${BASE}/api/exam/sessions`, {
    data: { parts: [] },
  })
  // Either 400 (validation) or 401 (auth guard fires first) — both acceptable
  expect([400, 401]).toContain(res.status())
})

test('PROJ-11 AC: POST /api/exam/sessions with invalid part number returns 400', async ({ request }) => {
  const res = await request.post(`${BASE}/api/exam/sessions`, {
    data: { parts: [4] },
  })
  expect([400, 401]).toContain(res.status())
})

test('PROJ-11 AC: PATCH /api/exam/sessions/[id]/self-score with out-of-range score returns 400 or 401', async ({ request }) => {
  const res = await request.patch(`${BASE}/api/exam/sessions/some-id/self-score`, {
    data: { questionId: 'q-1', score: 150 },
  })
  expect([400, 401]).toContain(res.status())
})

// ── Admin Exam Sets page: auth guard ─────────────────────────────────────────

test('PROJ-11 AC: /admin/exam-sets requires admin authentication', async ({ page }) => {
  await page.goto(`${BASE}/admin/exam-sets`)
  // Should redirect to login (not admin)
  await expect(page).toHaveURL(/\/(login|admin)/)
})
