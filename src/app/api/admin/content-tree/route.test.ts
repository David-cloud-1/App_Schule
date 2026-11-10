import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const dept = { id: 'dept-sped', name: 'Spedition', code: 'SPED' }

function makeSupabase(role: 'admin' | 'department_admin' | 'teacher' | 'student' = 'admin') {
  return chainMock(
    (table) => {
      if (table === 'profiles') return { data: { role, department_id: 'dept-sped' } }
      if (table === 'departments') return { data: [{ id: 'dept-sped' }] }
      if (table === 'subjects') {
        return {
          data: [{ id: 's1', name: 'KSK', code: 'KSK', is_active: true, department_id: 'dept-sped', version_number: 2, sort_order: 1, departments: dept }],
        }
      }
      if (table === 'topics') return { data: [{ id: 't1', name: 'Kosten', subject_id: 's1', version_number: 1 }] }
      if (table === 'questions') {
        return {
          data: [
            { topic_id: 't1', class_level: 10, question_subjects: [{ subject_id: 's1' }] },
            { topic_id: null, class_level: null, question_subjects: [{ subject_id: 's1' }] },
          ],
        }
      }
      return {}
    },
    { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) } },
  )
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/admin/content-tree (PROJ-85)', () => {
  it('antwortet 401 ohne Anmeldung', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      from: vi.fn(),
    } as never)
    expect((await GET()).status).toBe(401)
  })

  it('antwortet 403 für Azubis', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('student').client as never)
    expect((await GET()).status).toBe(403)
  })

  it('liefert den Baum mit Zählern', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('teacher').client as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const subject = body.departments[0].subjects[0]
    expect(subject.topics[0].counts.l10).toBe(1)
    expect(subject.no_topic.none).toBe(1)
  })

  it('zählt keine gelöschten Fragen und blendet private vor Nicht-Super-Admins aus', async () => {
    const teacher = makeSupabase('teacher')
    vi.mocked(createClient).mockResolvedValue(teacher.client as never)
    await GET()
    const q = teacher.queries.find((x) => x.table === 'questions')!
    expect(q.calls.find((c) => c.method === 'is')?.args).toEqual(['deleted_at', null])
    expect(q.calls.some((c) => c.method === 'eq' && c.args[0] === 'is_private' && c.args[1] === false)).toBe(true)

    const admin = makeSupabase('admin')
    vi.mocked(createClient).mockResolvedValue(admin.client as never)
    await GET()
    const qa = admin.queries.find((x) => x.table === 'questions')!
    expect(hasCall(qa.calls, 'eq') && qa.calls.some((c) => c.args[0] === 'is_private')).toBe(false)
  })

  it('lässt gelöschte Fächer und Themen weg', async () => {
    const mock = makeSupabase('admin')
    vi.mocked(createClient).mockResolvedValue(mock.client as never)
    await GET()
    for (const table of ['subjects', 'topics']) {
      const query = mock.queries.find((x) => x.table === table)!
      expect(query.calls.find((c) => c.method === 'is')?.args).toEqual(['deleted_at', null])
    }
  })
})
