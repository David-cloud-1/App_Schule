import { test, expect } from '@playwright/test'

// ============================================================
// PROJ-134: Leistungsnachweis – Detailseite & Ablauf
// ============================================================
// Ohne Anmeldung prüfbar: Seitenschutz und Schutz der neuen Schnittstellen
// (Verlängern, Testlauf starten/auflisten/löschen, Liste mit „Nur meine“).
// Schrittleiste, Zeiten, Verlängern-Prüfung, Ersteller-Name und Testlauf-Regeln
// brauchen ein Lehrkraft-Konto und sind in den Vitest-Tests abgedeckt:
// src/lib/nachweis-ablauf.test.ts, src/lib/testlauf-waechter.test.ts,
// src/components/admin/nachweis-schrittleiste.test.tsx,
// src/app/api/admin/assessments/[id]/route.test.ts, src/app/api/admin/assessments/route.test.ts
// ============================================================

const ID = '00000000-0000-4000-8000-000000000000'
const SESSION = '00000000-0000-4000-8000-000000000001'

test.describe('PROJ-134: Seiten nur mit Anmeldung', () => {
  test('Detailseite eines Nachweises leitet ohne Anmeldung zum Login', async ({ page }) => {
    await page.goto(`/admin/leistungsnachweise/${ID}`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('Nachweis-Liste („Nur meine“) leitet ohne Anmeldung zum Login', async ({ page }) => {
    await page.goto('/admin/leistungsnachweise?meine=1')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Spieler eines Testlaufs leitet ohne Anmeldung zum Login', async ({ page }) => {
    await page.goto(`/exam/${SESSION}`)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('PROJ-134: Schnittstellen nur für Lehrkräfte', () => {
  test('„Beitritt verlängern“ ohne Anmeldung ergibt 401', async ({ request }) => {
    const res = await request.patch(`/api/admin/assessments/${ID}`, {
      data: { action: 'extend_join', closesAt: '2030-01-01T10:00:00.000Z' },
    })
    expect(res.status()).toBe(401)
  })

  test('Testlauf starten ohne Anmeldung ergibt 401', async ({ request }) => {
    const res = await request.post(`/api/admin/assessments/${ID}/testlauf`, { data: { group: 'A' } })
    expect(res.status()).toBe(401)
  })

  test('Testläufe auflisten ohne Anmeldung ergibt 401', async ({ request }) => {
    const res = await request.get(`/api/admin/assessments/${ID}/testlauf`)
    expect(res.status()).toBe(401)
  })

  test('Testlauf löschen ohne Anmeldung ergibt 401', async ({ request }) => {
    const res = await request.delete(`/api/admin/assessments/${ID}/testlauf/${SESSION}`)
    expect(res.status()).toBe(401)
  })

  test('Liste mit „Nur meine“ ohne Anmeldung ergibt 401', async ({ request }) => {
    const res = await request.get('/api/admin/assessments?nurMeine=1')
    expect(res.status()).toBe(401)
  })

  test('kaputte Eingaben verraten ohne Anmeldung nichts (401 vor der Prüfung)', async ({ request }) => {
    const res = await request.post(`/api/admin/assessments/' OR 1=1 --/testlauf`, { data: { group: 'Z' } })
    expect([401, 404]).toContain(res.status())
  })
})
