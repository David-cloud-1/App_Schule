import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const ITEM_1 = { id: 'item-1', name: 'Sattelschlepper', description: 'desc', icon: '🚛', price: 75 }
const ITEM_2 = { id: 'item-2', name: 'Ampel-Deko', description: 'desc', icon: '🚦', price: 40 }

interface MockOpts {
  items?: unknown
  itemsError?: unknown
  owned?: { item_id: string }[]
  coinBalance?: number | null
}

function makeSupabaseMock(user: unknown, opts: MockOpts = {}) {
  const { items = [ITEM_1, ITEM_2], itemsError = null, owned = [], coinBalance = 90 } = opts

  const itemsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: items, error: itemsError }),
  }
  const ownedBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: owned, error: null }),
  }
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { coin_balance: coinBalance }, error: null }),
  }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'shop_items') return itemsBuilder
      if (table === 'user_shop_items') return ownedBuilder
      return profileBuilder
    }),
  }
}

describe('GET /api/shop/items', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns items with owned flags and the coin balance', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { owned: [{ item_id: 'item-1' }] }) as never,
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.coin_balance).toBe(90)
    expect(body.items).toHaveLength(2)
    expect(body.items.find((i: { id: string }) => i.id === 'item-1').owned).toBe(true)
    expect(body.items.find((i: { id: string }) => i.id === 'item-2').owned).toBe(false)
  })

  it('defaults coin_balance to 0 when the profile row is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { coinBalance: null }) as never,
    )
    const res = await GET()
    const body = await res.json()
    expect(body.coin_balance).toBe(0)
  })

  it('returns 500 when the catalog fetch fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { itemsError: { message: 'DB error' } }) as never,
    )
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
