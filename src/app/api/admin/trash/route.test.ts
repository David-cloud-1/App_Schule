import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

function makeRequest(url: string) {
  return new NextRequest(url)
}

beforeEach(() => vi.clearAllMocks())

function makeSupabase(opts: {
  role?: 'admin' | 'department_admin' | 'teacher'
  departmentId?: string | null
  assignments?: { department_id: string; subject_id: string | null }[]
}) {
  const { role = 'admin', departmentId = 'dept-1', assignments = [] } = opts
  const { client } = chainMock((table) => {
    if (table === 'profiles') return { data: { role, department_id: departmentId } }
    if (table === 'teacher_subject_assignments') return { data: assignments }
    if (table === 'questions') return { data: [{ id: 'q-1', question_text: 'Alt', deleted_at: '2026-10-27T00:00:00Z' }] }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.de' } } }) },
  })
  return client
}

describe('GET /api/admin/trash', () => {
  it('lehnt einen unbekannten Inhaltstyp ab', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin' }) as never)
    const res = await GET(makeRequest('http://localhost/x?type=nonsense'))
    expect(res.status).toBe(400)
  })

  it('zeigt dem Super-Admin gelöschte Fragen', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin' }) as never)
    const res = await GET(makeRequest('http://localhost/x?type=question'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.items).toHaveLength(1)
  })

  it('zeigt einer Lehrkraft ohne Zuständigkeit keine gelöschten Fragen (403, PROJ-48)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'teacher', assignments: [] }) as never)
    const res = await GET(makeRequest('http://localhost/x?type=question'))
    expect(res.status).toBe(403)
  })
})
