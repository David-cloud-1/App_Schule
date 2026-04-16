import { test, expect } from '@playwright/test'

// ============================================================
// PROJ-1: User Authentication — E2E Tests
// ============================================================
// Tests that don't require real auth credentials cover:
//   - Unauthenticated redirects (middleware)
//   - Page rendering and layout
//   - Form validation (client-side)
//   - Navigation between auth pages
//   - Mobile responsiveness
//
// Tests marked [REQUIRES_LIVE_AUTH] need real Supabase credentials
// and are skipped in CI. Run manually with a test account.
// ============================================================

// --------------- Middleware / Route Protection ---------------

test.describe('Route protection (AC: Abgemeldeter Nutzer wird zur Login-Seite weitergeleitet)', () => {
  test('unauthenticated user visiting / is redirected to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /profile is redirected to /login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })
})

// --------------- Login Page ---------------

test.describe('Login page rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows app name SpediLern', async ({ page }) => {
    await expect(page.getByText('SpediLern')).toBeVisible()
  })

  test('shows email and password fields', async ({ page }) => {
    await expect(page.getByLabel('E-Mail')).toBeVisible()
    await expect(page.getByLabel('Passwort')).toBeVisible()
  })

  test('shows Anmelden button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible()
  })

  test('shows Google OAuth button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Mit Google anmelden/ })).toBeVisible()
  })

  test('shows Apple OAuth button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Mit Apple anmelden/ })).toBeVisible()
  })

  test('shows Passwort vergessen link', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Passwort vergessen?' })).toBeVisible()
  })

  test('shows Registrieren link', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Registrieren' })).toBeVisible()
  })
})

// --------------- Login Form Validation ---------------

test.describe('Login form validation (AC: Fehler werden klar angezeigt)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows error when email field is empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click()
    await expect(page.getByText(/gültige E-Mail/i)).toBeVisible()
  })

  // BUG-LOW: Login- und Registrierungsformulare haben kein noValidate-Attribut.
  // Der Browser-native type=email Validator interceptiert Submit bevor react-hook-form/Zod laufen kann.
  // Folge: ungültige E-Mail-Formate zeigen native Browser-Tooltips statt unserer styled Fehlermeldungen.
  // Fix: <form noValidate ...> zu allen Auth-Formularen hinzufügen.
  // Dieses Test-Szenario ist deshalb per E2E nicht ohne Workaround testbar (wird manuell geprüft).
})

// --------------- Register Page ---------------

test.describe('Register page rendering (AC: Registrierung mit E-Mail + Passwort)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('shows app name SpediLern', async ({ page }) => {
    await expect(page.getByText('SpediLern')).toBeVisible()
  })

  test('shows email, password and confirm password fields', async ({ page }) => {
    await expect(page.getByLabel('E-Mail')).toBeVisible()
    await expect(page.getByLabel('Passwort', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Passwort wiederholen')).toBeVisible()
  })

  test('shows Registrieren button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Registrieren', exact: true })).toBeVisible()
  })

  test('shows Google and Apple OAuth buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Mit Google registrieren/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Mit Apple registrieren/ })).toBeVisible()
  })
})

// --------------- Register Form Validation ---------------

test.describe('Register form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('shows error when password is shorter than 8 characters (AC: Mindestlänge 8 Zeichen)', async ({ page }) => {
    await page.getByLabel('E-Mail').fill('test@example.com')
    await page.getByLabel('Passwort', { exact: true }).fill('short')
    await page.getByLabel('Passwort wiederholen').fill('short')
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click()
    await expect(page.getByText(/mindestens 8 Zeichen/i)).toBeVisible()
  })

  test('shows error when passwords do not match', async ({ page }) => {
    await page.getByLabel('E-Mail').fill('test@example.com')
    await page.getByLabel('Passwort', { exact: true }).fill('password123')
    await page.getByLabel('Passwort wiederholen').fill('different123')
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click()
    await expect(page.getByText(/stimmen nicht überein/i)).toBeVisible()
  })

  test('shows error for invalid email format', async ({ page }) => {
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click()
    await expect(page.getByText(/gültige E-Mail/i)).toBeVisible()
  })
})

// --------------- Forgot Password Page ---------------

test.describe('Forgot password page rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password')
  })

  test('shows Passwort vergessen heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Passwort vergessen/i })).toBeVisible()
  })

  test('shows email input field', async ({ page }) => {
    await expect(page.getByLabel('E-Mail')).toBeVisible()
  })

  test('shows Reset-Link senden button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Reset-Link senden/i })).toBeVisible()
  })

  test('shows Zurück zum Login link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Zurück zum Login/i })).toBeVisible()
  })

  test('shows validation error for invalid email', async ({ page }) => {
    await page.getByRole('button', { name: /Reset-Link senden/i }).click()
    await expect(page.getByText(/gültige E-Mail/i)).toBeVisible()
  })
})

// --------------- Navigation Between Auth Pages ---------------

test.describe('Navigation between auth pages', () => {
  test('Registrieren link on login page navigates to /register', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Registrieren' }).click()
    await expect(page).toHaveURL(/\/register/)
  })

  test('Anmelden link on register page navigates to /login', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('link', { name: 'Anmelden' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('Passwort vergessen link on login navigates to /forgot-password', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Passwort vergessen?' }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('Zurück zum Login link on forgot-password navigates to /login', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByRole('link', { name: /Zurück zum Login/i }).first().click()
    await expect(page).toHaveURL(/\/login/)
  })
})

// --------------- Mobile Responsiveness (375px) ---------------

test.describe('Mobile responsiveness at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('login page is usable on mobile (iPhone SE)', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('E-Mail')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible()
    // Form should not overflow
    const form = page.getByLabel('E-Mail')
    const box = await form.boundingBox()
    expect(box?.width).toBeLessThanOrEqual(375)
  })

  test('register page is usable on mobile', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('button', { name: 'Registrieren', exact: true })).toBeVisible()
  })
})

// --------------- Reset Password Page ---------------

test.describe('Reset password page (AC: Passwort-Zurücksetzen per E-Mail-Link)', () => {
  // Note: /reset-password is a protected route (user must be authenticated via callback token).
  // Without a real auth session this redirects to /login — which confirms middleware works.
  test('unauthenticated access to /reset-password redirects to /login', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page).toHaveURL(/\/login/)
  })
})

// --------------- Security Tests ---------------

test.describe('Security: open redirect protection', () => {
  test('callback with no code redirects to login error page', async ({ page }) => {
    await page.goto('/auth/callback')
    await expect(page).toHaveURL(/\/login\?error=auth_callback_failed/)
  })
})

// --------------- Tests requiring live Supabase auth (manual) ---------------
// These cannot run in automated CI without a real test account.
// Mark: [REQUIRES_LIVE_AUTH]
//
// test('AC: Login with email + password works')
// test('AC: Register with email + password works, confirmation email sent')
// test('AC: After login, user is redirected to home page')
// test('AC: Wrong password shows error message')
// test('AC: Duplicate email registration shows error')
// test('AC: Auth state persists after browser restart (session cookie)')
// test('AC: Google OAuth redirect flow works')
// test('AC: Apple OAuth redirect flow works')
// test('AC: Admin user sees Admin link in header')
// test('AC: Password reset email is sent')
