import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const state: { user: { id: string } | null; role: string | null } = { user: null, role: null }

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
    expect(locationOf(await call('/admin'))).toBe('/')
    expect((await call('/api/admin/users')).status).toBe(403)
  })

  it('lässt eine Lehrkraft auf die Übersicht', async () => {
    state.role = 'teacher'
    const res = await call('/admin')
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('leitet eine Lehrkraft von Verwaltungsseiten zur Übersicht um', async () => {
    state.role = 'teacher'
    for (const path of ['/admin/questions', '/admin/users', '/admin/departments', '/admin/leistungsnachweise/abc/druck/klasse']) {
      expect(locationOf(await call(path))).toBe('/admin')
    }
  })

  it('sperrt die Verwaltungs-Schnittstellen für eine Lehrkraft mit 403', async () => {
    state.role = 'teacher'
    for (const path of ['/api/admin/users', '/api/admin/questions', '/api/admin/assessments']) {
      expect((await call(path)).status).toBe(403)
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
    expect(locationOf(await call('/admin'))).toBe('/')
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
