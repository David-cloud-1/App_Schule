import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH, DELETE } from './route'
import { NextRequest } from 'next/server'

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

function makeAdminSupabase(
  updateError: unknown = null,
  deleteError: unknown = null,
  quizHistoryCount: number | null = 0
) {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
  }
  const questionUpdateBuilder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: updateError }),
  }
  const questionDeleteBuilder = {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: deleteError }),
  }
  const answerBuilder = {
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  const subjectsBuilder = {
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  const quizHistoryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ count: quizHistoryCount, error: null }),
  }
  const auditBuilder = { insert: vi.fn().mockResolvedValue({ error: null }) }

  const mockAdmin = { id: 'admin-uuid', email: 'admin@test.com' }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAdmin } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder
      if (table === 'answer_options') return answerBuilder
      if (table === 'question_subjects') return subjectsBuilder
      if (table === 'quiz_answers') return quizHistoryBuilder
      if (table === 'admin_audit_log') return auditBuilder
      // questions: returns update or delete builder depending on context
      return { ...questionUpdateBuilder, ...questionDeleteBuilder }
    }),
  }
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
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase(null, null, 0) as never)
    const res = await DELETE(makeRequest('DELETE'), makeCtx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.softDeleted).toBeUndefined()
  })

  it('soft-deletes question when quiz history exists', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase(null, null, 3) as never)
    const res = await DELETE(makeRequest('DELETE'), makeCtx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.softDeleted).toBe(true)
  })
})
