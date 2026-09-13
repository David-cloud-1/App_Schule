import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

function makeRequest(body?: unknown) {
  const url = new URL('http://localhost/api/admin/shop-items/item-1')
  return new NextRequest(url, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

function makeCtx(id = 'item-1') {
  return { params: Promise.resolve({ id }) }
}

function makeAdminSupabase(opts: { role?: string; updateError?: unknown } = {}) {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: opts.role ?? 'admin' }, error: null }),
  }
  const itemUpdateBuilder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: opts.updateError ?? null }),
  }
  const auditBuilder = { insert: vi.fn().mockResolvedValue({ error: null }) }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid', email: 'a@a.com' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder
      if (table === 'admin_audit_log') return auditBuilder
      return itemUpdateBuilder
    }),
  }
}

function makeUnauthSupabase() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

describe('PATCH /api/admin/shop-items/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ role: 'student' }) as never)
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(403)
  })

  it('returns 400 when no fields are provided', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest({}), makeCtx())
    expect(res.status).toBe(400)
  })

  it('returns 400 for a non-positive price', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest({ price: 0 }), makeCtx())
    expect(res.status).toBe(400)
  })

  it('toggles is_active', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('updates name/description/icon/price together', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await PATCH(
      makeRequest({ name: 'Neu', description: 'Neue Beschreibung', icon: '🚚', price: 99 }),
      makeCtx(),
    )
    expect(res.status).toBe(200)
  })

  it('returns 500 when the update fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ updateError: { message: 'DB error' } }) as never,
    )
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(500)
  })
})
