import { test, expect } from '@playwright/test'

// ============================================================
// PROJ-8: Leaderboard
// ============================================================
// Tests without auth verify route protection, API auth
// enforcement, and API response contract.
//
// Tests marked [REQUIRES_LIVE_AUTH] need a real Supabase session
// and are skipped automatically — validated in staging.
// ============================================================

// ── Route Protection ─────────────────────────────────────────

test.describe('PROJ-8 AC: Leaderboard requires authentication', () => {
  test('unauthenticated visit to /leaderboard redirects to /login', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page shows email and password inputs after /leaderboard redirect', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

// ── API Auth Enforcement ─────────────────────────────────────

test.describe('PROJ-8 AC: Leaderboard API enforces authentication', () => {
  test('GET /api/leaderboard without auth returns 401 or redirect', async ({ request }) => {
    const res = await request.get('/api/leaderboard', { maxRedirects: 0 })
    const status = res.status()
    expect([301, 302, 307, 308, 401]).toContain(status)
  })

  test('GET /api/leaderboard?period=week without auth returns 401 or redirect', async ({ request }) => {
    const res = await request.get('/api/leaderboard?period=week', { maxRedirects: 0 })
    expect([301, 302, 307, 308, 401]).toContain(res.status())
  })

  test('GET /api/leaderboard?period=month without auth returns 401 or redirect', async ({ request }) => {
    const res = await request.get('/api/leaderboard?period=month', { maxRedirects: 0 })
    expect([301, 302, 307, 308, 401]).toContain(res.status())
  })

  test('GET /api/leaderboard?period=all without auth returns 401 or redirect', async ({ request }) => {
    const res = await request.get('/api/leaderboard?period=all', { maxRedirects: 0 })
    expect([301, 302, 307, 308, 401]).toContain(res.status())
  })

  test('PATCH /api/profile/opt-out without auth returns 401 or redirect', async ({ request }) => {
    const res = await request.patch('/api/profile/opt-out', {
      maxRedirects: 0,
      headers: { 'Content-Type': 'application/json' },
      data: { leaderboard_opt_out: true },
    })
    expect([301, 302, 307, 308, 401]).toContain(res.status())
  })
})

// ── API Response Contract ────────────────────────────────────
// These tests check that the API never leaks user data to unauthenticated callers.

test.describe('PROJ-8: API does not expose leaderboard data unauthenticated', () => {
  test('response never contains entries array for unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/leaderboard?period=all', { maxRedirects: 0 })
    // If redirect: no JSON body. If 401: body must not contain entries.
    if (res.headers()['content-type']?.includes('application/json')) {
      const body = await res.json()
      expect(body).not.toHaveProperty('entries')
    }
  })
})

// ── Mobile Responsiveness ────────────────────────────────────

test.describe('PROJ-8: Mobile responsiveness at 375px', () => {
  test('/leaderboard redirect renders login on mobile (iPhone SE)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/leaderboard')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

// ── [REQUIRES_LIVE_AUTH] Functional Tests ───────────────────
// These tests require an authenticated Supabase session and seeded data.
// They are skipped in CI and must be run manually in staging.

test.describe('[REQUIRES_LIVE_AUTH] PROJ-8: Leaderboard UI', () => {
  test.skip()

  test('leaderboard page shows three period tabs: Diese Woche, Dieser Monat, Gesamt', async ({ page }) => {
    // AC: Drei Filter-Tabs
    await page.goto('/leaderboard')
    await expect(page.getByRole('tab', { name: 'Diese Woche' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Dieser Monat' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Gesamt' })).toBeVisible()
  })

  test('default active tab is "Diese Woche"', async ({ page }) => {
    // AC: Standard-Tab bei Seitenaufruf: "Diese Woche"
    await page.goto('/leaderboard')
    await expect(page.getByRole('tab', { name: 'Diese Woche' })).toHaveAttribute('data-state', 'active')
  })

  test('switching tabs updates leaderboard without full page reload', async ({ page }) => {
    // AC: Wechsel zwischen Tabs ohne Seiten-Reload
    await page.goto('/leaderboard')
    const urlBefore = page.url()
    await page.getByRole('tab', { name: 'Dieser Monat' }).click()
    await expect(page.getByRole('tab', { name: 'Dieser Monat' })).toHaveAttribute('data-state', 'active')
    // URL does not change — client-side update
    expect(page.url()).toBe(urlBefore)
  })

  test('top 3 entries show medal icons (🥇🥈🥉)', async ({ page }) => {
    // AC: Top-3-Plätze sind visuell hervorgehoben: Gold, Silber, Bronze
    await page.goto('/leaderboard')
    const entryList = page.locator('[class*="rounded-2xl"]')
    await expect(entryList.first()).toBeVisible()
    // First entry should contain 🥇
    await expect(page.getByText('🥇')).toBeVisible()
  })

  test('own position is always shown with "Du" label', async ({ page }) => {
    // AC: Die eigene Position ist visuell hervorgehoben mit "Du"-Label
    await page.goto('/leaderboard')
    await expect(page.getByText('Du')).toBeVisible()
  })

  test('profile page shows leaderboard opt-out toggle', async ({ page }) => {
    // AC: Nutzer können in Profil-Einstellungen das Leaderboard per Toggle deaktivieren
    await page.goto('/profile')
    await expect(page.getByRole('switch', { name: /rangliste/i })).toBeVisible()
  })
})
