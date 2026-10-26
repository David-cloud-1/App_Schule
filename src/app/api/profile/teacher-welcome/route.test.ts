import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chainMock, eqValue } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase-server'
import { POST } from './route'

function makeClient(user: unknown, error: unknown = null) {
  return chainMock(() => ({ error }), {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  })
}

describe('POST /api/profile/teacher-welcome (PROJ-44)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('antwortet 401 ohne Login', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient(null).client as never)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('setzt nur das eigene Feld „Willkommen gesehen“', async () => {
    const mock = makeClient({ id: 'u1' })
    vi.mocked(createClient).mockResolvedValue(mock.client as never)
    const res = await POST()
    expect(res.status).toBe(200)
    expect(mock.writes).toEqual([{ table: 'profiles', method: 'update', payload: { teacher_welcome_seen: true } }])
    expect(eqValue(mock.queries[0].calls, 'id')).toBe('u1')
  })

  it('meldet 500, wenn das Speichern scheitert', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, { message: 'boom' }).client as never)
    const res = await POST()
    expect(res.status).toBe(500)
  })
})
