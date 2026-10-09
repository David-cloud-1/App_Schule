import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { DELETE, PUT } from './route'

const ITEM = '11111111-1111-4111-8111-111111111111'
const ANDERES = '22222222-2222-4222-8222-222222222222'

function authClient(user: unknown) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

interface ServiceOpts {
  owned?: string[]
  ownedError?: unknown
  upsertError?: { code?: string } | null
  deleteError?: unknown
}

function serviceClient(o: ServiceOpts = {}) {
  const calls = { upsert: [] as unknown[], deleteEq: [] as [string, unknown][] }
  const kaeufe = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: (o.owned ?? [ITEM]).map((id) => ({ item_id: id })), error: o.ownedError ?? null }),
  }
  const platz = {
    upsert: vi.fn((payload: unknown) => {
      calls.upsert.push(payload)
      return Promise.resolve({ error: o.upsertError ?? null })
    }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn((col: string, val: unknown) => {
      calls.deleteEq.push([col, val])
      return calls.deleteEq.length % 2 === 0 ? Promise.resolve({ error: o.deleteError ?? null }) : platz
    }),
  }
  return { client: { from: vi.fn((t: string) => (t === 'user_shop_items' ? kaeufe : platz)) }, calls }
}

const put = (body: unknown) =>
  new NextRequest('http://localhost/api/betrieb/platzierung', { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body) })
const del = (q: string) => new NextRequest(`http://localhost/api/betrieb/platzierung${q}`, { method: 'DELETE' })

describe('PUT /api/betrieb/platzierung (PROJ-34)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient(null) as never)
    expect((await PUT(put({ item_id: ITEM, x: 0, y: 0 }))).status).toBe(401)
  })

  it('returns 400 for invalid JSON, a bad id and out-of-range or fractional coordinates', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(serviceClient().client as never)
    expect((await PUT(put('kein json'))).status).toBe(400)
    expect((await PUT(put({ item_id: 'x', x: 0, y: 0 }))).status).toBe(400)
    expect((await PUT(put({ item_id: ITEM, x: -1, y: 0 }))).status).toBe(400)
    expect((await PUT(put({ item_id: ITEM, x: 10, y: 0 }))).status).toBe(400)
    expect((await PUT(put({ item_id: ITEM, x: 1.5, y: 0 }))).status).toBe(400)
    expect((await PUT(put({ item_id: ITEM, x: 0 }))).status).toBe(400)
  })

  it('returns 404 for an item the user does not own', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(serviceClient({ owned: [ANDERES] }).client as never)
    const res = await PUT(put({ item_id: ITEM, x: 0, y: 0 }))
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('not_owned')
  })

  it('rejects a tile outside the current land with a clear code', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    const s = serviceClient()
    vi.mocked(createServiceClient).mockReturnValue(s.client as never)
    // 1 Kauf -> Startland 4x4, Kachel (4,0) liegt außerhalb
    const res = await PUT(put({ item_id: ITEM, x: 4, y: 0 }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('outside_land')
    expect(s.calls.upsert).toHaveLength(0)
  })

  it('accepts a tile that became valid after the land grew', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    const owned = [ITEM, ...Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`)]
    vi.mocked(createServiceClient).mockReturnValue(serviceClient({ owned }).client as never)
    // 6 Käufe -> Land 5x5 (Wurzel aus 2·6+12), Kachel (4,4) ist gültig, (5,5) nicht
    expect((await PUT(put({ item_id: ITEM, x: 4, y: 4 }))).status).toBe(200)
    vi.mocked(createServiceClient).mockReturnValue(serviceClient({ owned }).client as never)
    expect((await PUT(put({ item_id: ITEM, x: 5, y: 5 }))).status).toBe(400)
  })

  it('stores the placement for the authenticated user only (user id comes from the session, not the body)', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    const s = serviceClient()
    vi.mocked(createServiceClient).mockReturnValue(s.client as never)
    const res = await PUT(put({ item_id: ITEM, x: 2, y: 3, user_id: 'angreifer' }))
    expect(res.status).toBe(200)
    expect(s.calls.upsert[0]).toEqual({ user_id: 'u1', item_id: ITEM, x: 2, y: 3 })
  })

  it('answers 409 with a readable code when the tile is already taken', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(serviceClient({ upsertError: { code: '23505' } }).client as never)
    const res = await PUT(put({ item_id: ITEM, x: 1, y: 1 }))
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('tile_taken')
  })

  it('answers 500 on other database errors without leaking details', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(serviceClient({ upsertError: { code: 'XX000' } }).client as never)
    const res = await PUT(put({ item_id: ITEM, x: 1, y: 1 }))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('XX000')
  })

  it('answers 500 when the purchases cannot be read', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(serviceClient({ ownedError: { message: 'boom' } }).client as never)
    expect((await PUT(put({ item_id: ITEM, x: 1, y: 1 }))).status).toBe(500)
  })
})

describe('DELETE /api/betrieb/platzierung (PROJ-34)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient(null) as never)
    expect((await DELETE(del(`?item_id=${ITEM}`))).status).toBe(401)
  })

  it('returns 400 for a missing or invalid item id', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    expect((await DELETE(del(''))).status).toBe(400)
    expect((await DELETE(del('?item_id=abc'))).status).toBe(400)
  })

  it('removes only the own row (filters by user id from the session and the item id)', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    const s = serviceClient()
    vi.mocked(createServiceClient).mockReturnValue(s.client as never)
    const res = await DELETE(del(`?item_id=${ITEM}`))
    expect(res.status).toBe(200)
    expect(s.calls.deleteEq).toEqual([['user_id', 'u1'], ['item_id', ITEM]])
  })

  it('is idempotent and reports database errors as 500', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient({ id: 'u1' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(serviceClient({ deleteError: { message: 'x' } }).client as never)
    expect((await DELETE(del(`?item_id=${ITEM}`))).status).toBe(500)
  })
})
