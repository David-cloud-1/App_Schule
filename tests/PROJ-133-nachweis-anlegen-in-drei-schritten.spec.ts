import { test, expect } from '@playwright/test'

// ============================================================
// PROJ-133: Leistungsnachweis anlegen in drei Schritten
// ============================================================
// Ohne Anmeldung prüfbar: Seitenschutz, Schutz der neuen Fragen-Suche
// und der Anlegen-Schnittstelle. Der eigentliche Ablauf (Was? → Prüfen →
// Wann und für wen?) braucht ein Lehrkraft-Konto und ist in
// src/components/admin/assessment-wizard/assessment-wizard.test.tsx abgedeckt.
// ============================================================

const SEARCH = '/api/admin/assessments/questions/search'
const DEPT = '00000000-0000-0000-0000-000000000000'

test.describe('PROJ-133: Seiten nur mit Anmeldung', () => {
  test('„Nachweis anlegen“ (/admin/leistungsnachweise/neu) leitet ohne Anmeldung zum Login', async ({ page }) => {
    await page.goto('/admin/leistungsnachweise/neu')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Start aus „Schwierig“ (?aus=schwierig) leitet ohne Anmeldung zum Login', async ({ page }) => {
    await page.goto('/admin/leistungsnachweise/neu?aus=schwierig')
    await expect(page).toHaveURL(/\/login/)
  })

  test('alte Adresse ?neu=1 leitet ohne Anmeldung zum Login', async ({ page }) => {
    await page.goto('/admin/leistungsnachweise?neu=1')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Notenschlüssel-Seite („Vorlage anlegen“) leitet ohne Anmeldung zum Login', async ({ page }) => {
    await page.goto('/admin/leistungsnachweise/schluessel')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('PROJ-133: Fragen-Suche nur für Lehrkräfte', () => {
  for (const body of [
    { action: 'search', departmentId: DEPT, text: '', offset: 0 },
    { action: 'lookup', departmentId: DEPT, ids: [DEPT] },
    { action: 'facets', departmentId: DEPT },
  ]) {
    test(`Aktion „${body.action}“ ohne Anmeldung ergibt 401`, async ({ request }) => {
      const res = await request.post(SEARCH, { data: body })
      expect(res.status()).toBe(401)
    })
  }

  test('ungültige Eingabe ohne Anmeldung verrät nichts (401 vor der Prüfung)', async ({ request }) => {
    const res = await request.post(SEARCH, { data: { action: 'drop table', departmentId: "' OR 1=1 --" } })
    expect(res.status()).toBe(401)
  })
})

test.describe('PROJ-133: Entwurf speichern nur für Lehrkräfte', () => {
  test('POST /api/admin/assessments ohne Anmeldung ergibt 401', async ({ request }) => {
    const res = await request.post('/api/admin/assessments', {
      data: {
        departmentId: DEPT,
        questionIds: [DEPT],
        title: 'Test',
        opensAt: new Date().toISOString(),
        closesAt: new Date(Date.now() + 3600_000).toISOString(),
        durationMinutes: 45,
        gradingScale: [],
        className: null,
      },
    })
    expect(res.status()).toBe(401)
  })
})
