import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const ITEM_ID = '550e8400-e29b-41d4-a716-446655440001'

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

function makeSupabaseMock(user: unknown, rpcResult: { data?: unknown; error?: unknown } = { data: 15, error: null }) {
  return chainMock(
    (table) => {
      if (table === 'profiles') return { data: { department_id: 'dept-sped' } }
      if (table === 'departments') return { data: DEPARTMENT_ROW }
      return {}
    },
    {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      rpc: vi.fn().mockResolvedValue(rpcResult),
    },
  ).client
}

const DEPARTMENT_ROW = {
  id: 'dept-sped', code: 'SPED', slug: 'spedition', domain: null, name: 'Speditionskaufleute', app_name: 'SpediLern',
  tagline: '', meta_title: '', meta_description: '', icon_name: 'Truck', currency_name: 'Frachtmünzen',
  hof_name: 'Speditionshof', prompt_role: '', target_group: '', prompt_notes: null, class_levels: [10, 11, 12], pseudonym_nouns: [],
}

describe('POST /api/shop/purchase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    const res = await POST(makeRequest({ item_id: ITEM_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid item_id', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({ item_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns the new coin balance on success', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { data: 15, error: null }) as never,
    )
    const res = await POST(makeRequest({ item_id: ITEM_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.new_coin_balance).toBe(15)
  })

  it.each([
    ['item_not_found', 404],
    ['item_inactive', 409],
    ['already_owned', 409],
    ['insufficient_funds', 409],
  ])('maps %s to HTTP %i', async (message, status) => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { data: null, error: { message } }) as never,
    )
    const res = await POST(makeRequest({ item_id: ITEM_ID }))
    expect(res.status).toBe(status)
  })

  it('returns 500 for an unrecognized RPC error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { data: null, error: { message: 'some_unexpected_db_error' } }) as never,
    )
    const res = await POST(makeRequest({ item_id: ITEM_ID }))
    expect(res.status).toBe(500)
  })

  it('names the department currency when funds are insufficient', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { data: null, error: { message: 'insufficient_funds' } }) as never,
    )
    const res = await POST(makeRequest({ item_id: ITEM_ID }))
    expect((await res.json()).error).toBe('Nicht genug Frachtmünzen')
  })
})
