import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH, DELETE } from './route'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const QUESTION_ID = '550e8400-e29b-41d4-a716-446655440001'

function makeCtx(id = QUESTION_ID) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(method: string, body?: unknown) {
  const url = new URL(`http://localhost/api/admin/questions/${QUESTION_ID}`)
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

function makeAdminSupabase(opts: {
  updateError?: unknown
  deleteError?: unknown
  quizHistoryCount?: number | null
  role?: string
  departmentId?: string
  questionDepartmentId?: string | null
} = {}) {
  const {
    updateError = null,
    deleteError = null,
    quizHistoryCount = 0,
    role = 'admin',
    departmentId = 'dept-sped',
    questionDepartmentId = 'dept-sped',
  } = opts

  const { client } = chainMock((table, calls) => {
    if (table === 'profiles') return { data: { role, department_id: departmentId } }
    if (table === 'admin_audit_log') return {}
    if (table === 'answer_options') return { error: null }
    if (table === 'question_subjects') {
      if (hasCall(calls, 'maybeSingle')) {
        return {
          data: questionDepartmentId === null ? null : { subjects: { department_id: questionDepartmentId } },
        }
      }
      return { error: null }
    }
    if (table === 'quiz_answers') return { count: quizHistoryCount, error: null }
    if (table === 'questions') {
      if (hasCall(calls, 'update')) return { error: updateError }
      if (hasCall(calls, 'delete')) return { error: deleteError }
      return {}
    }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid', email: 'admin@test.com' } } }) },
  })
  return client
}

function makeUnauthSupabase() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

function makeNonAdminSupabase() {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'student' }, error: null }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-uuid' } } }) },
    from: vi.fn().mockReturnValue(profileBuilder),
  }
}

describe('PATCH /api/admin/questions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await PATCH(makeRequest('PATCH', { is_active: false }), makeCtx())
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminSupabase() as never)
    const res = await PATCH(makeRequest('PATCH', { is_active: false }), makeCtx())
    expect(res.status).toBe(403)
  })

  it('department_admin gets 404 for an orphaned question with no subject link (fail closed)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ role: 'department_admin', questionDepartmentId: null }) as never
    )
    const res = await PATCH(makeRequest('PATCH', { is_active: false }), makeCtx())
    expect(res.status).toBe(404)
  })

  it('super-admin can still reach an orphaned question with no subject link', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ questionDepartmentId: null }) as never)
    const res = await PATCH(makeRequest('PATCH', { is_active: false }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('toggles is_active and returns ok', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest('PATCH', { is_active: false }), makeCtx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 400 when answers provided but no correct answer', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const noCorrect = [
      { text: 'A', is_correct: false }, { text: 'B', is_correct: false },
      { text: 'C', is_correct: false }, { text: 'D', is_correct: false },
    ]
    const res = await PATCH(makeRequest('PATCH', { answers: noCorrect }), makeCtx())
    expect(res.status).toBe(400)
  })

  it('returns 400 when body has no fields', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest('PATCH', {}), makeCtx())
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const url = new URL(`http://localhost/api/admin/questions/${QUESTION_ID}`)
    const req = new NextRequest(url, { method: 'PATCH', body: 'bad', headers: { 'content-type': 'application/json' } })
    const res = await PATCH(req, makeCtx())
    expect(res.status).toBe(400)
  })

  it('department_admin gets 404 for a question of a foreign department (PROJ-24)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ role: 'department_admin', departmentId: 'dept-sped', questionDepartmentId: 'dept-tour' }) as never
    )
    const res = await PATCH(makeRequest('PATCH', { is_active: false }), makeCtx())
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/admin/questions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await DELETE(makeRequest('DELETE'), makeCtx())
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminSupabase() as never)
    const res = await DELETE(makeRequest('DELETE'), makeCtx())
    expect(res.status).toBe(403)
  })

  it('hard-deletes question when no quiz history exists', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ quizHistoryCount: 0 }) as never)
    const res = await DELETE(makeRequest('DELETE'), makeCtx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.softDeleted).toBeUndefined()
  })

  it('soft-deletes question when quiz history exists', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ quizHistoryCount: 3 }) as never)
    const res = await DELETE(makeRequest('DELETE'), makeCtx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.softDeleted).toBe(true)
  })

  it('department_admin gets 404 when deleting a question of a foreign department (PROJ-24)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ role: 'department_admin', departmentId: 'dept-sped', questionDepartmentId: 'dept-tour' }) as never
    )
    const res = await DELETE(makeRequest('DELETE'), makeCtx())
    expect(res.status).toBe(404)
  })
})
