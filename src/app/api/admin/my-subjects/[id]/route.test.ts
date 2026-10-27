import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, eqValue } from '@/test/supabase-chain-mock'
import { DELETE } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const params = { params: Promise.resolve({ id: 'assign-1' }) }

beforeEach(() => vi.clearAllMocks())

function makeSupabase(role = 'teacher', deletedRows: unknown[] = [{ id: 'assign-1' }]) {
  const { client, queries } = chainMock((table) => {
    if (table === 'profiles') return { data: { role } }
    if (table === 'teacher_subject_assignments') return { data: deletedRows, error: null }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'teacher-1', email: 't@a.de' } } }) },
  })
  return { client, queries }
}

describe('DELETE /api/admin/my-subjects/[id]', () => {
  it('returns 403 for a non-teacher', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin').client as never)
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(403)
  })

  it('deletes only the caller\'s own assignment row', async () => {
    const { client, queries } = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(200)
    const call = queries.find((q) => q.table === 'teacher_subject_assignments')!
    expect(eqValue(call.calls, 'teacher_id')).toBe('teacher-1')
    expect(eqValue(call.calls, 'id')).toBe('assign-1')
  })

  it('returns 404 instead of a silent "ok" when no own row matched the id (QA fix)', async () => {
    const { client } = makeSupabase('teacher', [])
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(404)
  })
})
