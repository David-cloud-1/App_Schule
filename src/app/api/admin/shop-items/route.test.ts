import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

function makeRequest(method: string, body?: unknown) {
  const url = new URL('http://localhost/api/admin/shop-items')
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

const mockItems = [
  { id: 'item-1', name: 'Sattelschlepper', description: 'desc', icon: '🚛', price: 75, is_active: true, sort_order: 1 },
  { id: 'item-2', name: 'Ampel-Deko', description: 'desc', icon: '🚦', price: 40, is_active: true, sort_order: 2 },
]

interface Overrides {
  itemsData?: unknown
  itemsError?: unknown
  ownedRows?: { item_id: string }[]
  insertData?: unknown
  insertError?: unknown
  role?: string
}

function makeAdminSupabase(overrides: Overrides = {}) {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: overrides.role ?? 'admin' }, error: null }),
  }
  const itemsListBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: overrides.itemsData ?? mockItems,
      error: overrides.itemsError ?? null,
    }),
  }
  const ownedBuilder = {
    select: vi.fn().mockResolvedValue({ data: overrides.ownedRows ?? [], error: null }),
  }
  const insertBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: overrides.insertData ?? { id: 'new-item-uuid' },
      error: overrides.insertError ?? null,
    }),
  }
  const auditBuilder = { insert: vi.fn().mockResolvedValue({ error: null }) }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid', email: 'a@a.com' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder
      if (table === 'admin_audit_log') return auditBuilder
      if (table === 'user_shop_items') return ownedBuilder
      // shop_items: GET uses the list builder, POST uses the insert builder
      return overrides.insertData !== undefined || overrides.insertError !== undefined
        ? insertBuilder
        : itemsListBuilder
    }),
  }
}

function makeUnauthSupabase() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

describe('GET /api/admin/shop-items', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ role: 'student' }) as never)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns items with purchase counts', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ ownedRows: [{ item_id: 'item-1' }, { item_id: 'item-1' }] }) as never,
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(2)
    expect(body.items.find((i: { id: string }) => i.id === 'item-1').purchase_count).toBe(2)
    expect(body.items.find((i: { id: string }) => i.id === 'item-2').purchase_count).toBe(0)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ itemsError: { message: 'DB error' } }) as never,
    )
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

describe('POST /api/admin/shop-items', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await POST(makeRequest('POST', { name: 'Test', description: 'd', icon: '🚛', price: 50 }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ role: 'student' }) as never)
    const res = await POST(makeRequest('POST', { name: 'Test', description: 'd', icon: '🚛', price: 50 }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when a required field is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', { name: 'Test' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for a non-positive price', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', { name: 'Test', description: 'd', icon: '🚛', price: 0 }))
    expect(res.status).toBe(400)
  })

  it('creates the item on valid input', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ insertData: { id: 'new-item-uuid' } }) as never,
    )
    const res = await POST(makeRequest('POST', { name: 'Test', description: 'd', icon: '🚛', price: 50 }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('new-item-uuid')
  })
})
