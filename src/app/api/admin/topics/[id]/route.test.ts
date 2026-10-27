import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'
import { PATCH, DELETE } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const TOPIC_ID = 't-1'

function makeCtx(id = TOPIC_ID) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body?: unknown) {
  return new NextRequest(`http://localhost/api/admin/topics/${TOPIC_ID}`, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

function makeSupabase(opts: {
  role?: 'admin' | 'department_admin' | 'teacher'
  assignments?: { department_id: string; subject_id: string | null }[]
  topicSubjectId?: string
  topicDepartmentId?: string
}) {
  const {
    role = 'teacher',
    assignments = [],
    topicSubjectId = 'subj-a',
    topicDepartmentId = 'dept-sped',
  } = opts
  const { client, writes } = chainMock((table, calls) => {
    if (table === 'profiles') return { data: { role, department_id: 'dept-sped' } }
    if (table === 'teacher_subject_assignments') return { data: assignments }
    if (table === 'admin_audit_log') return {}
    if (table === 'topics') {
      if (hasCall(calls, 'maybeSingle')) {
        return { data: { subjects: { id: topicSubjectId, department_id: topicDepartmentId } } }
      }
      return { data: { id: TOPIC_ID, name: 'Thema', subject_id: topicSubjectId }, error: null }
    }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'teacher-1', email: 't@a.de' } } }) },
  })
  return { client, writes }
}

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/admin/topics/[id] (PROJ-48)', () => {
  it('returns 404 for a teacher without responsibility for the topic\'s subject (regression: used to always 403)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ role: 'teacher', assignments: [{ department_id: 'dept-sped', subject_id: 'subj-other' }] }).client as never
    )
    const res = await PATCH(makeRequest({ name: 'Neuer Name' }), makeCtx())
    expect(res.status).toBe(404)
  })

  it('allows a teacher responsible for the subject to rename the topic', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ role: 'teacher', assignments: [{ department_id: 'dept-sped', subject_id: 'subj-a' }] }).client as never
    )
    const res = await PATCH(makeRequest({ name: 'Neuer Name' }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('still allows a department_admin regardless of assignments', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'department_admin' }).client as never)
    const res = await PATCH(makeRequest({ name: 'Neuer Name' }), makeCtx())
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/admin/topics/[id] (PROJ-48)', () => {
  it('returns 404 for a teacher without responsibility for the topic\'s subject', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ role: 'teacher', assignments: [{ department_id: 'dept-sped', subject_id: 'subj-other' }] }).client as never
    )
    const res = await DELETE({} as unknown as NextRequest, makeCtx())
    expect(res.status).toBe(404)
  })

  it('allows a teacher responsible for the subject to delete (soft-delete) the topic', async () => {
    const { client, writes } = makeSupabase({ role: 'teacher', assignments: [{ department_id: 'dept-sped', subject_id: 'subj-a' }] })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await DELETE({} as unknown as NextRequest, makeCtx())
    expect(res.status).toBe(200)
    expect(writes.find((w) => w.table === 'topics' && w.method === 'update')?.payload).toMatchObject({
      deleted_at: expect.any(String),
    })
  })
})
