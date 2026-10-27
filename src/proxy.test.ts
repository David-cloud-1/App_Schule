import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const state: { user: { id: string; app_metadata?: Record<string, unknown> } | null; role: string | null } = { user: null, role: null }

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: state.user } })) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: state.role ? { role: state.role } : null })),
    })),
  })),
}))

import { proxy } from './proxy'

function call(path: string) {
  return proxy(new NextRequest(`http://localhost${path}`))
}

function locationOf(res: Response): string | null {
  const loc = res.headers.get('location')
  return loc ? new URL(loc).pathname + new URL(loc).search : null
}

describe('Middleware – Lehrkräfte-Bereich (PROJ-44)', () => {
  beforeEach(() => {
    state.user = { id: 'u1' }
    state.role = null
  })

  it('schickt nicht eingeloggte Besucher des Lehrkräfte-Bereichs zum Login (Seite) bzw. 401 (API)', async () => {
    state.user = null
    expect(locationOf(await call('/admin'))).toContain('/login')
    expect((await call('/api/admin/users')).status).toBe(401)
  })

  it('lässt Azubis nicht in den Lehrkräfte-Bereich', async () => {
    state.role = 'student'
    expect(locationOf(await call('/admin'))).toBe('/?kein-zugang=1')
    expect((await call('/api/admin/users')).status).toBe(403)
  })

  it('erklärt bei entzogener Rolle, warum es nicht weitergeht (BUG-4)', async () => {
    state.role = 'student'
    const api = await call('/api/admin/users')
    expect(api.status).toBe(403)
    expect((await api.json()).error).toBe('Du hast keinen Zugang zum Lehrkräfte-Bereich.')
    expect(locationOf(await call('/admin/questions'))).toBe('/?kein-zugang=1')
    state.role = 'teacher'
    const teacherApi = await call('/api/admin/users')
    expect((await teacherApi.json()).error).toBe('Dafür fehlen dir die Rechte. Das kann nur ein Administrator.')
  })

  it('lässt eine Lehrkraft auf die Übersicht', async () => {
    state.role = 'teacher'
    const res = await call('/admin')
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('leitet eine Lehrkraft von reiner Verwaltungsseiten (Nutzer/Bereiche) zur Übersicht um', async () => {
    state.role = 'teacher'
    for (const path of ['/admin/users', '/admin/departments']) {
      expect(locationOf(await call(path))).toBe('/admin?gesperrt=1')
    }
  })

  it('lässt eine Lehrkraft auf die Leistungsnachweis- und Inhalts-Seiten (PROJ-46/48)', async () => {
    state.role = 'teacher'
    for (const path of [
      '/admin/leistungsnachweise',
      '/admin/leistungsnachweise/abc/druck/klasse',
      '/admin/questions',
      '/admin/subjects',
      '/admin/topics',
      '/admin/exam-sets',
      '/admin/papierkorb',
      '/admin/my-subjects',
    ]) {
      const res = await call(path)
      expect(res.status).toBe(200)
      expect(res.headers.get('location')).toBeNull()
    }
  })

  it('sperrt die Nutzer-/Bereichsverwaltung für eine Lehrkraft mit 403, lässt Inhalts-Schnittstellen durch (PROJ-48)', async () => {
    state.role = 'teacher'
    expect((await call('/api/admin/users')).status).toBe(403)
    for (const path of ['/api/admin/questions', '/api/admin/subjects', '/api/admin/my-subjects']) {
      expect((await call(path)).status).toBe(200)
    }
  })

  it('lässt eine Lehrkraft auf die Nachweis-Schnittstellen (PROJ-46) — die Route prüft die Rechte dann selbst', async () => {
    state.role = 'teacher'
    for (const path of ['/api/admin/assessments', '/api/admin/assessments/a1', '/api/admin/assessments/questions']) {
      expect((await call(path)).status).toBe(200)
    }
  })

  it('lässt Bereichs-Admin und Super-Admin überall im Bereich durch', async () => {
    for (const role of ['department_admin', 'admin']) {
      state.role = role
      for (const path of ['/admin', '/admin/users', '/api/admin/users']) {
        const res = await call(path)
        expect(res.status).toBe(200)
        expect(res.headers.get('location')).toBeNull()
      }
    }
  })

  it('sperrt Konten ohne gültige Rolle aus (fail closed)', async () => {
    state.role = null
    expect(locationOf(await call('/admin'))).toBe('/?kein-zugang=1')
    state.role = 'irgendwas'
    expect((await call('/api/admin/users')).status).toBe(403)
  })

  it('schickt eingeloggte Besucher von Login und Registrierung zur Start-Weiche', async () => {
    state.role = 'teacher'
    expect(locationOf(await call('/login'))).toBe('/start')
    expect(locationOf(await call('/register'))).toBe('/start')
  })

  it('lässt die Start-Weiche und Spielerseiten für Lehrkräfte offen', async () => {
    state.role = 'teacher'
    for (const path of ['/start', '/', '/profile']) {
      const res = await call(path)
      expect(res.status).toBe(200)
      expect(res.headers.get('location')).toBeNull()
    }
  })
})

describe('Middleware – Pflichtwechsel nach „Passwort neu vergeben“ (PROJ-58)', () => {
  beforeEach(() => {
    state.user = { id: 'u1', app_metadata: { must_change_password: true } }
    state.role = 'student'
  })

  it('leitet jede Seite auf „Neues Passwort festlegen“ um, auch den Lehrkräfte-Bereich', async () => {
    expect(locationOf(await call('/'))).toBe('/passwort-festlegen')
    expect(locationOf(await call('/quiz?x=1'))).toBe('/passwort-festlegen')
    expect(locationOf(await call('/login'))).toBe('/passwort-festlegen')
    state.role = 'admin'
    expect(locationOf(await call('/admin/users'))).toBe('/passwort-festlegen')
  })

  it('sperrt Schnittstellen mit 403, außer der eigenen Passwort-Schnittstelle', async () => {
    const res = await call('/api/quiz/session')
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Bitte zuerst ein eigenes Passwort festlegen.')
    expect((await call('/api/account/password')).status).toBe(200)
  })

  it('lässt die Pflicht-Seite und den Auth-Callback durch', async () => {
    expect((await call('/passwort-festlegen')).status).toBe(200)
    expect((await call('/auth/callback')).status).toBe(200)
  })

  it('ohne Merker: Pflicht-Seite leitet zur Start-Weiche, sonst alles wie bisher', async () => {
    state.user = { id: 'u1', app_metadata: { must_change_password: false } }
    expect(locationOf(await call('/passwort-festlegen'))).toBe('/start')
    expect((await call('/')).status).toBe(200)
  })
})
