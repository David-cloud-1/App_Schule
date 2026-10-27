import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase-server'
import { POST, PUT } from './route'

const updateUser = vi.fn()
const resend = vi.fn()

function login(user: unknown, role: string | null = 'teacher') {
  const mock = chainMock(() => ({ data: role ? { role } : null }), {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }), updateUser, resend },
  })
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
}
const post = (body: unknown) => new NextRequest('https://app.example/api/profile/email', { method: 'POST', body: JSON.stringify(body) })
const put = () => new NextRequest('https://app.example/api/profile/email', { method: 'PUT' })

describe('/api/profile/email (PROJ-50)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateUser.mockResolvedValue({ error: null })
    resend.mockResolvedValue({ error: null })
  })

  it('antwortet 401 ohne Login und 403 für Azubis', async () => {
    login(null, null)
    expect((await POST(post({ email: 'neu@schule.de' }))).status).toBe(401)
    expect((await PUT(put())).status).toBe(401)
    login({ id: 'u1', email: 'a@b.de' }, 'student')
    expect((await POST(post({ email: 'neu@schule.de' }))).status).toBe(403)
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('startet die Änderung mit Rücksprung nach „Mein Konto“ (Link geht an die neue Adresse)', async () => {
    login({ id: 'u1', email: 'alt@schule.de' })
    const res = await POST(post({ email: '  Neu@Schule.DE ' }))
    expect(res.status).toBe(200)
    expect(updateUser).toHaveBeenCalledWith(
      { email: 'neu@schule.de' },
      { emailRedirectTo: `https://app.example/auth/callback?next=${encodeURIComponent('/admin/konto?email=bestaetigt')}` },
    )
  })

  it('lehnt ungültige und die aktuelle Adresse mit 400 am Feld ab', async () => {
    login({ id: 'u1', email: 'alt@schule.de' })
    for (const email of ['keine-adresse', '', 'ALT@schule.de']) {
      const res = await POST(post({ email }))
      expect(res.status, email).toBe(400)
      expect(await res.json()).toMatchObject({ field: 'email' })
    }
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('verrät bei einer vergebenen Adresse nicht, wem sie gehört', async () => {
    login({ id: 'u1', email: 'alt@schule.de' })
    updateUser.mockResolvedValue({ error: { status: 422, code: 'email_exists', message: 'A user with this email address has already been registered' } })
    const res = await POST(post({ email: 'besetzt@schule.de' }))
    expect(res.status).toBe(400)
    expect(JSON.stringify(await res.json())).not.toMatch(/registered|vergeben|bereits/i)
  })

  it('meldet bei zu vielen Versuchen 429 und sonst 500', async () => {
    login({ id: 'u1', email: 'alt@schule.de' })
    updateUser.mockResolvedValue({ error: { status: 429, message: 'rate' } })
    expect((await POST(post({ email: 'neu@schule.de' }))).status).toBe(429)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    updateUser.mockResolvedValue({ error: { status: 500, message: 'boom' } })
    expect((await POST(post({ email: 'neu@schule.de' }))).status).toBe(500)
    spy.mockRestore()
  })

  it('sendet den Link erneut an die ausstehende Adresse', async () => {
    login({ id: 'u1', email: 'alt@schule.de', new_email: 'neu@schule.de' })
    expect((await PUT(put())).status).toBe(200)
    expect(resend).toHaveBeenCalledWith({
      type: 'email_change',
      email: 'neu@schule.de',
      options: { emailRedirectTo: `https://app.example/auth/callback?next=${encodeURIComponent('/admin/konto?email=bestaetigt')}` },
    })
  })

  it('verweigert „erneut senden“ ohne ausstehende Änderung', async () => {
    login({ id: 'u1', email: 'alt@schule.de' })
    expect((await PUT(put())).status).toBe(400)
    expect(resend).not.toHaveBeenCalled()
  })
})
