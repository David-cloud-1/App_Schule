import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const TARGET_USER_ID = '550e8400-e29b-41d4-a716-446655440099'
const ADMIN_ID = 'admin-uuid-0000-0000-0000-000000000001'

function makeCtx(id = TARGET_USER_ID) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body: unknown) {
  const url = new URL(`http://localhost/api/admin/users/${TARGET_USER_ID}`)
  return new NextRequest(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makeAdminClient() {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
  }
  const auditBuilder = { insert: vi.fn().mockResolvedValue({ error: null }) }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.com' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'admin_audit_log') return auditBuilder
      return profileBuilder
    }),
  }
}

function makeServiceClient(updateError: unknown = null) {
  return {
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ error: updateError }),
      },
    },
  }
}

function makeUnauthClient() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

function makeNonAdminClient() {
  const pb = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'student' }, error: null }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } } }) },
    from: vi.fn().mockReturnValue(pb),
  }
}

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthClient() as never)
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminClient() as never)
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(403)
  })

  it('returns 400 when admin tries to ban themselves', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const selfCtx = { params: Promise.resolve({ id: ADMIN_ID }) }
    const res = await PATCH(makeRequest({ banned: true }), selfCtx)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('selbst')
  })

  it('bans user and returns ok', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('unbans user and returns ok', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ banned: false }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('returns 400 for invalid payload', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ banned: 'yes' }), makeCtx())
    expect(res.status).toBe(400)
  })

  it('returns 500 when service client fails', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ message: 'Auth error' }) as never
    )
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(500)
  })
})
