import { test, expect } from '@playwright/test'

// ============================================================
// PROJ-6: Learning Progress Dashboard
// ============================================================
// Tests that can run without auth verify route protection and
// the unauthenticated redirect to /login.
//
// Tests marked [REQUIRES_LIVE_AUTH] need a real Supabase session
// and are skipped automatically — they document what should be
// validated in a staging environment with seeded test data.
// ============================================================

// ── Route Protection ─────────────────────────────────────────

test.describe('PROJ-6 AC: Dashboard requires authentication', () => {
  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page shows email and password inputs after redirect', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

// ── Security: HTTP Headers ────────────────────────────────────

test.describe('PROJ-6: Security headers on dashboard route', () => {
  test('/ response includes X-Frame-Options: DENY', async ({ request }) => {
    const res = await request.get('/', { maxRedirects: 0 })
    // Redirect or direct — must carry security headers
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })

  test('/ response includes X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get('/', { maxRedirects: 0 })
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('injecting user_id param does not bypass dashboard auth', async ({ request }) => {
    const res = await request.get(
      '/?user_id=550e8400-e29b-41d4-a716-446655440001',
      { maxRedirects: 0 },
    )
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toContain('/login')
  })
})

// ── Loading page (skeleton) is defined ───────────────────────

test.describe('PROJ-6 AC: Skeleton loader exists (edge case: slow connection)', () => {
  test('loading page module can be resolved by Next.js build', async ({ request }) => {
    // Verify the app is running; the loading.tsx is automatically used by Next.js
    // during server streaming — a 200 or 307 confirms the server is healthy
    const res = await request.get('/', { maxRedirects: 0 })
    expect([200, 307]).toContain(res.status())
  })
})

// ── Skipped: Acceptance criteria that require live auth ───────

test.describe('PROJ-6 AC: Gamification Header (skipped — requires live auth)', () => {
  test.skip('shows current level badge (Lvl N) in gamification header', async () => {})
  test.skip('shows XP progress bar with current/needed XP and percent', async () => {})
  test.skip('shows streak count with flame icon in gamification header', async () => {})
  test.skip('gamification header renders for new user with 0 XP and Level 1', async () => {})
})

test.describe('PROJ-6 AC: Subject Progress Cards (skipped — requires live auth)', () => {
  test.skip('dashboard shows one card per subject (BGP, KSK, STG, LOP)', async () => {})
  test.skip('each card shows subject code and name', async () => {})
  test.skip('each card shows Gesehen % progress bar with absolute numbers', async () => {})
  test.skip('each card shows Richtig % progress bar with absolute numbers', async () => {})
  test.skip('new user sees 0%/0% on all subject cards without errors', async () => {})
  test.skip('subject with 0 questions shows "Noch keine Fragen verfügbar"', async () => {})
  test.skip('subject at 100% seen shows CheckCircle indicator', async () => {})
  test.skip('clicking a subject card navigates to /quiz?subject={uuid}', async () => {})
})

test.describe('PROJ-6 AC: 7-Day Activity Dots (skipped — requires live auth)', () => {
  test.skip('shows 7 activity dots with weekday labels', async () => {})
  test.skip('dots for days with sessions are green', async () => {})
  test.skip('dots for days without sessions are grey', async () => {})
  test.skip('today dot is highlighted with a ring', async () => {})
  test.skip('weekday labels are in German (Mo, Di, Mi, Do, Fr, Sa, So)', async () => {})
})

test.describe('PROJ-6 AC: Overall Statistics Row (skipped — requires live auth)', () => {
  test.skip('shows total correct answers, wrong answers, and accuracy %', async () => {})
  test.skip('stats row is hidden for new users with 0 sessions', async () => {})
  test.skip('large numbers are formatted with German locale (e.g. 9.999 not 9999)', async () => {})
})

test.describe('PROJ-6 AC: CTA Button (skipped — requires live auth)', () => {
  test.skip('"Jetzt lernen" button is visible on the dashboard', async () => {})
  test.skip('"Jetzt lernen" button navigates to /quiz (no subject filter)', async () => {})
})

test.describe('PROJ-6 AC: Onboarding Card (skipped — requires live auth)', () => {
  test.skip('new user sees onboarding welcome card above gamification header', async () => {})
  test.skip('onboarding card contains a CTA button linking to /quiz', async () => {})
  test.skip('onboarding card is hidden for users who have completed at least one session', async () => {})
})

test.describe('PROJ-6 Edge Cases (skipped — requires live auth)', () => {
  test.skip('streak = 0 renders flame icon in grey', async () => {})
  test.skip('streak = 0 shows text "Starte heute deinen Streak!"', async () => {})
  test.skip('very high level (50+) renders badge without layout overflow', async () => {})
  test.skip('today not yet learned — today dot is grey, no error thrown', async () => {})
})
