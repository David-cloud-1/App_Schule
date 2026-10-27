import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

const signIn = vi.fn()
const updateUserById = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ auth: { signInWithPassword: signIn } })) }))
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(() => ({ auth: { admin: { updateUserById } } })),
}))

import { createClient } from '@/lib/supabase-server'
import { POST } from './route'

const emailUser = { id: 'u1', email: 'max@schule.de', app_metadata: { providers: ['email'] } }
const googleUser = { id: 'u2', email: 'max@gmail.com', app_metadata: { providers: ['google'] } }

function login(user: unknown, role: string | null = 'teacher') {
  const mock = chainMock(() => ({ data: role ? { role } : null }), { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } })
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
}
const req = (body: unknown) => new NextRequest('http://localhost/api/profile/password', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/profile/password (PROJ-50)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn.mockResolvedValue({ error: null })
    updateUserById.mockResolvedValue({ error: null })
  })

  it('antwortet 401 ohne Login und 403 für Azubis', async () => {
    login(null, null)
    expect((await POST(req({ currentPassword: 'a', newPassword: 'neues-passwort' }))).status).toBe(401)
    login(emailUser, 'student')
    expect((await POST(req({ currentPassword: 'a', newPassword: 'neues-passwort' }))).status).toBe(403)
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('prüft das aktuelle Passwort und setzt danach das neue für die eigene Person', async () => {
    login(emailUser)
    const res = await POST(req({ currentPassword: 'altes-passwort', newPassword: 'neues-passwort' }))
    expect(res.status).toBe(200)
    expect(signIn).toHaveBeenCalledWith({ email: 'max@schule.de', password: 'altes-passwort' })
    expect(updateUserById).toHaveBeenCalledWith('u1', { password: 'neues-passwort' })
  })

  it('lehnt ein falsches aktuelles Passwort mit Hinweis am Feld ab und setzt nichts', async () => {
    login(emailUser)
    signIn.mockResolvedValue({ error: { status: 400, message: 'Invalid login credentials' } })
    const res = await POST(req({ currentPassword: 'falsch', newPassword: 'neues-passwort' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ field: 'currentPassword' })
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('verlangt bei Konten mit Passwort das aktuelle Passwort', async () => {
    login(emailUser)
    const res = await POST(req({ newPassword: 'neues-passwort' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ field: 'currentPassword' })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('gibt bei zu vielen Versuchen 429 zurück', async () => {
    login(emailUser)
    signIn.mockResolvedValue({ error: { status: 429, message: 'rate limit' } })
    expect((await POST(req({ currentPassword: 'x', newPassword: 'neues-passwort' }))).status).toBe(429)
  })

  it('lehnt zu kurze, zu lange und unveränderte Passwörter ab', async () => {
    login(emailUser)
    expect((await POST(req({ currentPassword: 'a', newPassword: 'kurz' }))).status).toBe(400)
    expect((await POST(req({ currentPassword: 'a', newPassword: 'x'.repeat(73) }))).status).toBe(400)
    const same = await POST(req({ currentPassword: 'gleiches-passwort', newPassword: 'gleiches-passwort' }))
    expect(same.status).toBe(400)
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('lässt Google-/Apple-Konten ohne aktuelles Passwort eines festlegen', async () => {
    login(googleUser)
    const res = await POST(req({ newPassword: 'neues-passwort' }))
    expect(res.status).toBe(200)
    expect(signIn).not.toHaveBeenCalled()
    expect(updateUserById).toHaveBeenCalledWith('u2', { password: 'neues-passwort' })
  })

  it('meldet schwache Passwörter am Feld und sonst 500, ohne das Passwort zu loggen', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    login(emailUser)
    updateUserById.mockResolvedValue({ error: { code: 'weak_password', message: 'weak' } })
    const weak = await POST(req({ currentPassword: 'a', newPassword: 'neues-passwort' }))
    expect(weak.status).toBe(400)
    updateUserById.mockResolvedValue({ error: { code: 'unexpected_failure', message: 'boom' } })
    expect((await POST(req({ currentPassword: 'a', newPassword: 'neues-passwort' }))).status).toBe(500)
    expect(JSON.stringify(spy.mock.calls)).not.toContain('neues-passwort')
    spy.mockRestore()
  })
})
