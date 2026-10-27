import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
import { createClient, createServiceClient } from '@/lib/supabase-server'

beforeEach(() => vi.clearAllMocks())

function makeSupabase(role: 'admin' | 'department_admin', rows: unknown[] = []) {
  const { client } = chainMock((table) => {
    if (table === 'profiles') return { data: { role, department_id: 'dept-sped' } }
    if (table === 'teacher_subject_assignments') return { data: rows }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1', email: 'a@a.de' } } }) },
  })
  return client
}

describe('GET /api/admin/teacher-assignments', () => {
  it('returns 403 for a department_admin (super-admin only)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('department_admin') as never)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('lists assignments with display_name, no e-mail lookup needed', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase('admin', [
        {
          id: 'a1',
          created_at: '2026-10-27T00:00:00Z',
          teacher: { id: 't1', display_name: 'Frau Muster' },
          department: { id: 'dept-sped', name: 'Spedition', code: 'SPED' },
          subject: { id: 'subj-ksk', name: 'KSK', code: 'KSK' },
        },
      ]) as never
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assignments).toHaveLength(1)
    expect(body.assignments[0].teacher.name).toBe('Frau Muster')
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('falls back to the e-mail when display_name is missing', async () => {
    vi.mocked(createServiceClient).mockReturnValue({
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: 'teacher@example.com' } } }) } },
    } as never)
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase('admin', [
        {
          id: 'a1',
          created_at: '2026-10-27T00:00:00Z',
          teacher: { id: 't1', display_name: null },
          department: { id: 'dept-sped', name: 'Spedition', code: 'SPED' },
          subject: null,
        },
      ]) as never
    )
    const res = await GET()
    const body = await res.json()
    expect(body.assignments[0].teacher.name).toBe('teacher@example.com')
  })
})
