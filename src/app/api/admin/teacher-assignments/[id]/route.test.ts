import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'
import { DELETE } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const params = { params: Promise.resolve({ id: 'assign-1' }) }

beforeEach(() => vi.clearAllMocks())

function makeSupabase(role: 'admin' | 'department_admin', existing: unknown = { teacher_id: 't1', department_id: 'd1', subject_id: null }) {
  const { client, writes } = chainMock((table, calls) => {
    if (table === 'profiles') return { data: { role, department_id: 'dept-sped' } }
    if (table === 'admin_audit_log') return {}
    if (table === 'teacher_subject_assignments') {
      if (hasCall(calls, 'maybeSingle')) return { data: existing }
      return { error: null }
    }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1', email: 'a@a.de' } } }) },
  })
  return { client, writes }
}

describe('DELETE /api/admin/teacher-assignments/[id]', () => {
  it('returns 403 for a department_admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('department_admin').client as never)
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(403)
  })

  it('returns 404 when the entry does not exist', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin', null).client as never)
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(404)
  })

  it('removes the entry for a super-admin', async () => {
    const { client, writes } = makeSupabase('admin')
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(200)
    expect(writes.some((w) => w.table === 'teacher_subject_assignments' && w.method === 'delete')).toBe(true)
  })
})
