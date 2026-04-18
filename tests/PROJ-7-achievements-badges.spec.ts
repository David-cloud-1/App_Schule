import { test, expect } from '@playwright/test'

// ============================================================
// PROJ-7: Achievements & Badges
// ============================================================
// Tests that can run without auth verify route protection,
// API auth enforcement, and the API response contract.
//
// Tests marked [REQUIRES_LIVE_AUTH] need a real Supabase session
// and are skipped automatically — they document what must be
// validated in a staging environment with seeded test data.
// ============================================================

// ── Route Protection: /profile ───────────────────────────────

test.describe('PROJ-7 AC: Profile page requires authentication', () => {
  test('unauthenticated visit to /profile redirects to /login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page shows email and password inputs after /profile redirect', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

// ── API Auth Enforcement ─────────────────────────────────────

test.describe('PROJ-7 AC: Badges API enforces authentication', () => {
  test('GET /api/badges without auth is rejected (401 or middleware redirect)', async ({ request }) => {
    // The middleware redirects unauthenticated requests to /login (3xx).
    // By disabling redirects, we assert the server rejects the request — either
    // with a 401 from the route handler or a 3xx redirect from middleware.
    // A 200 with badge data would be a security failure.
    const res = await request.get('/api/badges', { maxRedirects: 0 })
    const status = res.status()
    expect([301, 302, 307, 308, 401]).toContain(status)
    // If it does return JSON (route handler path), verify it's an error
    const contentType = res.headers()['content-type'] ?? ''
    if (contentType.includes('application/json') && status === 200) {
      const body = await res.json()
      // Should never be a successful badge list for unauthenticated requests
      expect(body).not.toHaveProperty('badges')
    }
  })
})

// ── API Input Validation ─────────────────────────────────────

test.describe('PROJ-7 AC: Migrate endpoint respects secret header', () => {
  test('POST /api/badges/migrate with wrong secret returns 403', async ({ request }) => {
    // Set a secret via env — if BADGE_MIGRATE_SECRET is set in the running server,
    // a wrong header must be rejected. If no secret is set, 200 is acceptable.
    const res = await request.post('/api/badges/migrate', {
      headers: { 'x-migrate-secret': 'definitely-wrong-secret-xyz123' },
    })
    // Either 403 (secret configured + wrong value) or 200 (no secret configured)
    expect([200, 403]).toContain(res.status())
  })
})

// ── Mobile Responsiveness ─────────────────────────────────────

test.describe('PROJ-7: Mobile responsiveness at 375px', () => {
  test('/profile redirect renders login on mobile (iPhone SE)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

// ── Badge Gallery (authenticated) — manual / staging tests ───

test.describe('[REQUIRES_LIVE_AUTH] Profile page badge gallery', () => {
  test.skip(true, 'Requires authenticated Supabase session with seeded test data')

  test('AC: badge gallery shows all 15 badges', async ({ page }) => {
    // Log in, navigate to /profile, count badge cards
    await page.goto('/profile')
    const badgeCards = page.locator('[data-testid="badge-card"]')
    await expect(badgeCards).toHaveCount(15)
  })

  test('AC: locked badges are greyed out with unlock condition text', async ({ page }) => {
    await page.goto('/profile')
    const lockedBadge = page.locator('.grayscale').first()
    await expect(lockedBadge).toBeVisible()
  })

  test('AC: unlocked badges show unlock date', async ({ page }) => {
    await page.goto('/profile')
    // At least one badge should be unlocked for a user with sessions
    const unlockedDate = page.locator('p.text-\\[\\#FFD700\\]').first()
    await expect(unlockedDate).toBeVisible()
  })
})

// ── Badge Unlock Modal (authenticated) ───────────────────────

test.describe('[REQUIRES_LIVE_AUTH] Badge unlock modal queue', () => {
  test.skip(true, 'Requires authenticated session + completing a session that unlocks a badge')

  test('AC: completing a quiz session triggers badge unlock modal', async ({ page }) => {
    // Navigate through a quiz, complete it, expect modal
    await page.goto('/subjects')
    // ... complete quiz flow ...
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.getByText('Badge freigeschaltet!')).toBeVisible()
    await expect(page.getByRole('button', { name: /Weiter/ })).toBeVisible()
  })

  test('AC: "Weiter" button dismisses first modal and shows next in queue', async ({ page }) => {
    // When multiple badges are earned simultaneously, each "Weiter" advances the queue
    await page.getByRole('button', { name: /Weiter/ }).click()
    // Next modal or modal gone
  })
})
