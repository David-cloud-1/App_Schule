import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const state: {
  user: { id: string; app_metadata?: Record<string, unknown> } | null
  role: string | null
  /** PROJ-121: Vor-/Nachname im Profil; Standard = vorhanden */
  names: { first_name: string | null; last_name: string | null }
} = { user: null, role: null, names: { first_name: 'Erika', last_name: 'Muster' } }

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: state.user } })) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: state.role ? { role: state.role, ...state.names } : null })),
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
    state.names = { first_name: 'Erika', last_name: 'Muster' }
  })

  it('schickt nicht eingeloggte Besucher des Lehrkräfte-Bereichs zum Login (Seite) bzw. 401 (API)', async () => {
    state.user = null
    expect(locationOf(await call('/admin'))).toContain('/login')
    expect((await call('/api/admin/users')).status).toBe(401)
  })

  it('lässt nur Zeitpläne unter /api/cron/ ohne Anmeldung durch (PROJ-51, Route prüft CRON_SECRET)', async () => {
    state.user = null
    expect((await call('/api/cron/werkzeugkiste-aufraeumen')).status).toBe(200)
    expect((await call('/api/intern/werkzeugkiste/teil')).status).toBe(200)
    expect((await call('/api/internal')).status).toBe(401)
    expect((await call('/api/cronjob')).status).toBe(401)
    expect((await call('/api/admin/werkzeugkiste/optionen')).status).toBe(401)
  })

  it('lässt öffentliche Links unter /s/ ohne Anmeldung und ohne Umleitung durch (PROJ-67)', async () => {
    const code = 'a'.repeat(48)
    state.user = null
    const gast = await call(`/s/${code}`)
    expect(gast.status).toBe(200)
    expect(locationOf(gast)).toBeNull()
    // auch für Angemeldete mit Pflicht-Passwortwechsel: keine Umleitung, kein Konto-Zugriff
    state.user = { id: 'u1', app_metadata: { must_change_password: true } }
    expect(locationOf(await call(`/s/${code}`))).toBeNull()
  })

  it('schützt Pfade, die nur ähnlich heißen wie /s/ (PROJ-67)', async () => {
    state.user = null
    expect(locationOf(await call('/shop'))).toContain('/login')
    expect(locationOf(await call('/subjects'))).toContain('/login')
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
    const teacherApi = await call('/api/admin/teacher-assignments')
    expect((await teacherApi.json()).error).toBe('Dafür fehlen dir die Rechte. Das kann nur ein Administrator.')
  })

  it('lässt eine Lehrkraft auf die Übersicht', async () => {
    state.role = 'teacher'
    const res = await call('/admin')
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('leitet eine Lehrkraft von Super-Admin-Seiten (Fachbereiche, Zuständigkeiten, Fragen aus Material) zur Übersicht um (PROJ-127)', async () => {
    state.role = 'teacher'
    for (const path of ['/admin/departments', '/admin/teacher-assignments', '/admin/ai-generator']) {
      expect(locationOf(await call(path))).toBe('/admin?gesperrt=1')
    }
  })

  it('lässt eine Lehrkraft auf die Leistungsnachweis- und Inhalts-Seiten (PROJ-46/48)', async () => {
    state.role = 'teacher'
    for (const path of [
      '/admin/leistungsnachweise',
      '/admin/leistungsnachweise/abc/druck/klasse',
      '/admin/inhalte',
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

  it('lässt eine Lehrkraft in die Verwaltung (PROJ-127), sperrt Zuständigkeiten und bezahlte KI mit 403', async () => {
    state.role = 'teacher'
    for (const path of ['/admin/users', '/admin/department-settings', '/admin/shop-items', '/admin/audit-log']) {
      const res = await call(path)
      expect(res.status, path).toBe(200)
      expect(res.headers.get('location')).toBeNull()
    }
    for (const path of ['/api/admin/teacher-assignments', '/api/admin/ai-generate/jobs', '/api/admin/context/department']) {
      expect((await call(path)).status, path).toBe(403)
    }
    for (const path of ['/api/admin/users', '/api/admin/shop-items', '/api/admin/department-settings', '/api/admin/audit-log', '/api/admin/questions', '/api/admin/subjects', '/api/admin/my-subjects']) {
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

describe('Middleware – Spielansicht für Lehrkräfte merken', () => {
  beforeEach(() => {
    state.user = { id: 'u1' }
    state.role = 'teacher'
  })

  function callWithCookie(path: string, cookie?: string) {
    return proxy(new NextRequest(`http://localhost${path}`, cookie ? { headers: { cookie } } : undefined))
  }

  it('merkt sich „Zur Lern-App“ in einem Cookie', async () => {
    const res = await call('/?ansicht=spiel')
    expect(res.headers.get('set-cookie')).toContain('ws_spielansicht=1')
  })

  it('setzt ohne den Zusatz kein Cookie', async () => {
    expect(await call('/')).toBeDefined()
    expect((await call('/')).headers.get('set-cookie')).toBeNull()
  })

  it('vergisst den Merker im Lehrkräfte-Bereich', async () => {
    for (const path of ['/admin', '/admin/questions']) {
      const res = await callWithCookie(path, 'ws_spielansicht=1')
      expect(res.headers.get('set-cookie') ?? '').toMatch(/ws_spielansicht=;/)
    }
  })

  it('lässt das Cookie in der Spielansicht stehen', async () => {
    const res = await callWithCookie('/profile', 'ws_spielansicht=1')
    expect(res.headers.get('set-cookie')).toBeNull()
  })
})

describe('Middleware – Pflicht-Name (PROJ-121)', () => {
  beforeEach(() => {
    state.user = { id: 'u1' }
    state.role = 'teacher'
    state.names = { first_name: null, last_name: null }
  })

  it.each(['teacher', 'department_admin', 'admin'])('schickt %s ohne Namen von Seiten im Lehrkräfte-Bereich zur Namens-Seite', async (role) => {
    state.role = role
    for (const path of ['/admin', '/admin/konto', '/admin/questions', '/admin/kalender']) {
      expect(locationOf(await call(path)), path).toBe('/name-festlegen')
    }
  })

  it.each(['teacher', 'department_admin', 'admin'])('antwortet %s ohne Namen bei Verwaltungs-Schnittstellen mit 403 und klarer Meldung', async (role) => {
    state.role = role
    for (const path of ['/api/admin/users', '/api/admin/kalender/eintraege', '/api/admin/assessments']) {
      const res = await call(path)
      expect(res.status, path).toBe(403)
      expect((await res.json()).error).toBe('Bitte gib zuerst deinen Vor- und Nachnamen an.')
    }
  })

  it('verlangt beide Teile; nur Leerzeichen zählt als leer', async () => {
    for (const names of [
      { first_name: 'Erika', last_name: null },
      { first_name: null, last_name: 'Muster' },
      { first_name: '  ', last_name: 'Muster' },
      { first_name: 'Erika', last_name: '' },
    ]) {
      state.names = names
      expect(locationOf(await call('/admin')), JSON.stringify(names)).toBe('/name-festlegen')
    }
  })

  it('lässt Lehrer-Rollen mit Namen durch', async () => {
    state.names = { first_name: 'Erika', last_name: 'Muster' }
    const res = await call('/admin')
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('lässt Azubis nicht in den Bereich und fragt sie nie nach dem Namen', async () => {
    state.role = 'student'
    expect(locationOf(await call('/admin'))).toBe('/?kein-zugang=1')
    // Azubi-Seiten bleiben unberührt (keine zusätzliche Abfrage pro Aufruf)
    expect(locationOf(await call('/quiz'))).toBeNull()
  })

  it('der Passwort-Pflichtwechsel (PROJ-58) kommt vor dem Namen', async () => {
    state.user = { id: 'u1', app_metadata: { must_change_password: true } }
    expect(locationOf(await call('/admin'))).toBe('/passwort-festlegen')
  })

  it('Namens-Seite und Speicher-Schnittstelle liegen außerhalb des gesperrten Bereichs (kein Schleifen)', async () => {
    expect(locationOf(await call('/name-festlegen'))).toBeNull()
    expect(locationOf(await call('/api/profile/name'))).toBeNull()
  })
})

describe('Rate-Limit im Türsteher', () => {
  beforeEach(() => {
    state.user = { id: 'u1' }
    state.role = null
    state.names = { first_name: 'Erika', last_name: 'Muster' }
  })

  it('antwortet auf schreibende API-Aufrufe mit 429 und Retry-After, wenn das Limit erreicht ist', async () => {
    const limit = await import('@/lib/rate-limit')
    const spy = vi.spyOn(limit, 'checkRateLimit').mockResolvedValue({ allowed: false, retryAfter: 17 })
    const res = await proxy(new NextRequest('http://localhost/api/question-reports', { method: 'POST' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('17')
    // Lesezugriffe werden nicht gezählt
    spy.mockClear()
    expect((await proxy(new NextRequest('http://localhost/api/question-reports'))).status).toBe(200)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
