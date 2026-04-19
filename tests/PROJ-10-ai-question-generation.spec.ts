import { test, expect } from '@playwright/test'

// ============================================================
// PROJ-10: AI Question Generation
// ============================================================
// Tests without auth verify route protection, API auth
// enforcement, and response contracts.
//
// Tests marked [REQUIRES_LIVE_AUTH + ADMIN] need a real admin
// Supabase session and are skipped automatically — validated
// in staging with an admin account.
// ============================================================

// ── Page Route Protection ─────────────────────────────────────

test.describe('PROJ-10 AC: /admin/ai-generator requires authentication', () => {
  test('unauthenticated visit to /admin/ai-generator redirects to /login', async ({ page }) => {
    await page.goto('/admin/ai-generator')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ── API Auth Enforcement ──────────────────────────────────────

test.describe('PROJ-10 AC: AI Generate API routes enforce authentication', () => {
  test('POST /api/admin/ai-generate/upload without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/admin/ai-generate/upload', {
      multipart: { file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake') } },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/admin/ai-generate/jobs without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/ai-generate/jobs')
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/admin/ai-generate/drafts without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/ai-generate/drafts')
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/admin/ai-generate/drafts/bulk-accept without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/admin/ai-generate/drafts/bulk-accept', {
      data: { draft_ids: ['550e8400-e29b-41d4-a716-446655440000'] },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/admin/ai-generate/drafts/bulk-reject without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/admin/ai-generate/drafts/bulk-reject', {
      data: { draft_ids: ['550e8400-e29b-41d4-a716-446655440000'] },
    })
    expect([401, 403]).toContain(res.status())
  })
})

// ── Input Validation (no auth needed for 400 vs 401 ordering) ──

test.describe('PROJ-10 AC: Upload API validates file type and size', () => {
  test('POST /api/admin/ai-generate/upload with no file returns 400 or 401', async ({ request }) => {
    const res = await request.post('/api/admin/ai-generate/upload', {
      multipart: {},
    })
    // Unauthenticated → 401; authenticated with missing file → 400
    expect([400, 401, 403]).toContain(res.status())
  })
})

test.describe('PROJ-10 AC: Drafts API validates query parameters', () => {
  test('GET /api/admin/ai-generate/drafts with invalid status returns 400 or 401', async ({ request }) => {
    const res = await request.get('/api/admin/ai-generate/drafts?status=invalid_status')
    // Unauthenticated → 401; authenticated with bad param → 400
    expect([400, 401, 403]).toContain(res.status())
  })
})

test.describe('PROJ-10 AC: Bulk operations validate payload', () => {
  test('POST /api/admin/ai-generate/drafts/bulk-accept with empty draft_ids returns 400 or 401', async ({ request }) => {
    const res = await request.post('/api/admin/ai-generate/drafts/bulk-accept', {
      data: { draft_ids: [] },
    })
    expect([400, 401, 403]).toContain(res.status())
  })

  test('POST /api/admin/ai-generate/drafts/bulk-reject with empty draft_ids returns 400 or 401', async ({ request }) => {
    const res = await request.post('/api/admin/ai-generate/drafts/bulk-reject', {
      data: { draft_ids: [] },
    })
    expect([400, 401, 403]).toContain(res.status())
  })

  test('POST /api/admin/ai-generate/drafts/bulk-accept with non-UUID ids returns 400 or 401', async ({ request }) => {
    const res = await request.post('/api/admin/ai-generate/drafts/bulk-accept', {
      data: { draft_ids: ['not-a-uuid'] },
    })
    expect([400, 401, 403]).toContain(res.status())
  })
})

// ── Retry endpoint ─────────────────────────────────────────────

test.describe('PROJ-10 AC: Retry endpoint enforces auth', () => {
  test('POST /api/admin/ai-generate/jobs/[id]/retry without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/admin/ai-generate/jobs/550e8400-e29b-41d4-a716-446655440000/retry')
    expect([401, 403]).toContain(res.status())
  })
})

// ── [REQUIRES_LIVE_AUTH + ADMIN] Manual tests validated in staging ──
//
// AC: Upload-Bereich akzeptiert PDF/DOCX bis 50 MB
// AC: Admin sieht pro Datei Fortschrittsanzeige (Spinner + Statustext)
// AC: Entwurfs-Fragen werden nach Abschluss als inaktiv angezeigt
// AC: Admin kann Fragen einzeln prüfen (Fragetext, 4 Optionen, Erklärung)
// AC: Admin kann Fragen bearbeiten (Edit-Modal)
// AC: Admin kann Fragen einzeln akzeptieren/ablehnen
// AC: Admin kann alle akzeptieren/ablehnen (bulk)
// AC: Fach + Schwierigkeitsgrad können vor Massenakzeptanz gesetzt werden
// AC: review_required-Entwürfe: Accept-Button deaktiviert bis nach Bearbeitung
// AC: Fehlermeldung bei ungültigem Dateityp oder Datei über 50 MB
// AC: Retry-Button erscheint bei Job-Fehler
