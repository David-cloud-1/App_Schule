import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const USER_ID = '550e8400-e29b-41d4-a716-446655440077'

function call(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/account/password', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  )
}

function setup(opts: { user?: unknown; updateError?: unknown; flagError?: unknown } = {}) {
  const user = opts.user === undefined ? { id: USER_ID, app_metadata: { must_change_password: true } } : opts.user
  const updateUser = vi.fn().mockResolvedValue({ error: opts.updateError ?? null })
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }), updateUser },
  } as never)
  const updateUserById = vi.fn().mockResolvedValue({ error: opts.flagError ?? null })
  vi.mocked(createServiceClient).mockReturnValue({ auth: { admin: { updateUserById } } } as never)
  return { updateUser, updateUserById }
}

describe('POST /api/account/password (PROJ-58)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 ohne Login', async () => {
    setup({ user: null })
    expect((await call({ password: 'MeinNeues-99' })).status).toBe(401)
  })

  it('setzt das Passwort über die eigene Sitzung und entfernt den Merker', async () => {
    const { updateUser, updateUserById } = setup()
    expect((await call({ password: 'MeinNeues-99' })).status).toBe(200)
    expect(updateUser).toHaveBeenCalledWith({ password: 'MeinNeues-99' })
    expect(updateUserById).toHaveBeenCalledWith(USER_ID, { app_metadata: { must_change_password: false } })
  })

  it('ohne Merker („Passwort vergessen“): nur Passwort, keine Admin-Änderung', async () => {
    const { updateUserById } = setup({ user: { id: USER_ID, app_metadata: {} } })
    expect((await call({ password: 'MeinNeues-99' })).status).toBe(200)
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('400 mit klarer Meldung, wenn das vergebene Passwort wiederverwendet wird; Merker bleibt', async () => {
    const { updateUserById } = setup({ updateError: { code: 'same_password', status: 422, message: 'same' } })
    const res = await call({ password: 'Hafen-Kran-Birke-47' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('anderes Passwort')
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('400 bei zu kurzem Passwort', async () => {
    const { updateUser } = setup()
    expect((await call({ password: 'kurz' })).status).toBe(400)
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('401 bei abgelaufener Sitzung (z. B. alter Reset-Link)', async () => {
    setup({ updateError: { code: 'session_not_found', status: 403, message: 'x' } })
    expect((await call({ password: 'MeinNeues-99' })).status).toBe(401)
  })

  it('500, wenn der Merker nicht entfernt werden kann', async () => {
    setup({ flagError: { message: 'down' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await call({ password: 'MeinNeues-99' })).status).toBe(500)
  })
})
