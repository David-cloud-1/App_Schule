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

const emailUser = { id: 'u1', email: 'alt@schule.de', app_metadata: { providers: ['email'] } }
const googleUser = { id: 'u2', email: 'max@gmail.com', app_metadata: { providers: ['google'] } }

function login(user: unknown, role: string | null = 'teacher') {
  const mock = chainMock(() => ({ data: role ? { role } : null }), { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } })
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
}
const post = (body: unknown) => new NextRequest('https://app.example/api/profile/email', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/profile/email (PROJ-50, ohne Bestätigungs-Mail)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn.mockResolvedValue({ error: null })
    updateUserById.mockResolvedValue({ error: null })
  })

  it('antwortet 401 ohne Login und 403 für Azubis', async () => {
    login(null, null)
    expect((await POST(post({ email: 'neu@schule.de', currentPassword: 'x' }))).status).toBe(401)
    login(emailUser, 'student')
    expect((await POST(post({ email: 'neu@schule.de', currentPassword: 'x' }))).status).toBe(403)
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('ändert die Adresse nach geprüftem Passwort sofort und ohne Bestätigungs-Mail', async () => {
    login(emailUser)
    const res = await POST(post({ email: '  Neu@Schule.DE ', currentPassword: 'mein-passwort' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, email: 'neu@schule.de' })
    expect(signIn).toHaveBeenCalledWith({ email: 'alt@schule.de', password: 'mein-passwort' })
    expect(updateUserById).toHaveBeenCalledWith('u1', { email: 'neu@schule.de', email_confirm: true })
  })

  it('ändert nichts bei falschem Passwort und meldet es am Feld', async () => {
    login(emailUser)
    signIn.mockResolvedValue({ error: { status: 400, message: 'Invalid login credentials' } })
    const res = await POST(post({ email: 'neu@schule.de', currentPassword: 'falsch' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ field: 'currentPassword' })
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('verlangt das Passwort und lehnt ungültige sowie die aktuelle Adresse am Feld ab', async () => {
    login(emailUser)
    const noPassword = await POST(post({ email: 'neu@schule.de' }))
    expect(noPassword.status).toBe(400)
    expect(await noPassword.json()).toMatchObject({ field: 'currentPassword' })
    for (const email of ['keine-adresse', '', 'ALT@schule.de']) {
      const res = await POST(post({ email, currentPassword: 'x' }))
      expect(res.status, email).toBe(400)
      expect(await res.json()).toMatchObject({ field: 'email' })
    }
    expect(signIn).not.toHaveBeenCalled()
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('verweigert Google-/Apple-Konten ohne eigenes Passwort', async () => {
    login(googleUser)
    expect((await POST(post({ email: 'neu@gmail.com', currentPassword: 'x' }))).status).toBe(403)
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('verrät bei einer vergebenen Adresse nicht, wem sie gehört', async () => {
    login(emailUser)
    updateUserById.mockResolvedValue({ error: { status: 422, code: 'email_exists', message: 'A user with this email address has already been registered' } })
    const res = await POST(post({ email: 'besetzt@schule.de', currentPassword: 'x' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toMatchObject({ field: 'email' })
    expect(JSON.stringify(body)).not.toMatch(/registered|vergeben|bereits/i)
  })

  it('meldet bei zu vielen Versuchen 429 und sonst 500, ohne das Passwort zu loggen', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    login(emailUser)
    signIn.mockResolvedValue({ error: { status: 429, message: 'rate' } })
    expect((await POST(post({ email: 'neu@schule.de', currentPassword: 'geheim-123' }))).status).toBe(429)
    signIn.mockResolvedValue({ error: null })
    updateUserById.mockResolvedValue({ error: { status: 500, code: 'unexpected_failure', message: 'boom' } })
    expect((await POST(post({ email: 'neu@schule.de', currentPassword: 'geheim-123' }))).status).toBe(500)
    expect(JSON.stringify(spy.mock.calls)).not.toContain('geheim-123')
    spy.mockRestore()
  })
})
