import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

function makeRequest(method: string, params: Record<string, string> = {}, body?: unknown) {
  const url = new URL('http://localhost/api/admin/questions')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

const mockAdminUser = { id: 'admin-uuid', email: 'admin@test.com' }
const mockProfile = { role: 'admin' }

function makeAdminSupabase(overrides: {
  profileData?: unknown
  profileError?: unknown
  queryData?: unknown
  queryError?: unknown
  queryCount?: number
  insertData?: unknown
  insertError?: unknown
} = {}) {
  const questionInsertBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: overrides.insertData ?? { id: 'new-q-uuid' },
      error: overrides.insertError ?? null,
    }),
  }
  const answerInsertBuilder = {
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  const questionSubjectsBuilder = {
    insert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  const subjectBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'subj-uuid' }, error: null }),
  }
  const questionListBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({
      data: overrides.queryData ?? [],
      error: overrides.queryError ?? null,
      count: overrides.queryCount ?? 0,
    }),
  }
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: overrides.profileData ?? mockProfile,
      error: overrides.profileError ?? null,
    }),
  }
  const auditBuilder = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  }

  // questions table: used for both list (GET) and insert (POST)
  // Combine both builders so either path works
  const questionsBuilder = {
    ...questionListBuilder,
    insert: vi.fn().mockReturnValue(questionInsertBuilder),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({
      data: overrides.queryData ?? [],
      error: overrides.queryError ?? null,
      count: overrides.queryCount ?? 0,
    }),
  }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder
      if (table === 'subjects') return subjectBuilder
      if (table === 'question_subjects') return questionSubjectsBuilder
      if (table === 'answer_options') return answerInsertBuilder
      if (table === 'admin_audit_log') return auditBuilder
      return questionsBuilder
    }),
  }
}

function makeUnauthSupabase() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(),
  }
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

const validCreateBody = {
  question_text: 'Wofür steht BGP?',
  difficulty: 'leicht',
  answers: [
    { text: 'Richtig', is_correct: true },
    { text: 'Falsch A', is_correct: false },
    { text: 'Falsch B', is_correct: false },
    { text: 'Falsch C', is_correct: false },
  ],
  subject_ids: ['550e8400-e29b-41d4-a716-446655440000'],
}

describe('GET /api/admin/questions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminSupabase() as never)
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(403)
  })

  it('returns paginated questions for admin', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ queryData: [{ id: 'q1', question_text: 'Test?', answer_options: [], question_subjects: [] }], queryCount: 1 }) as never
    )
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.questions).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(body.totalPages).toBe(1)
  })

  it('returns 400 for invalid query params', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await GET(makeRequest('GET', { status: 'unknown' }))
    expect(res.status).toBe(400)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ queryError: { message: 'DB error' } }) as never
    )
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/admin/questions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await POST(makeRequest('POST', {}, validCreateBody))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminSupabase() as never)
    const res = await POST(makeRequest('POST', {}, validCreateBody))
    expect(res.status).toBe(403)
  })

  it('creates a question and returns 201', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', {}, validCreateBody))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('new-q-uuid')
  })

  it('returns 400 when question_text is empty', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', {}, { ...validCreateBody, question_text: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when no correct answer is provided', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const badAnswers = validCreateBody.answers.map((a) => ({ ...a, is_correct: false }))
    const res = await POST(makeRequest('POST', {}, { ...validCreateBody, answers: badAnswers }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('richtige Antwort')
  })

  it('returns 400 when more than one correct answer', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const twoCorrect = validCreateBody.answers.map((a, i) => ({ ...a, is_correct: i < 2 }))
    const res = await POST(makeRequest('POST', {}, { ...validCreateBody, answers: twoCorrect }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when subject_ids is empty', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', {}, { ...validCreateBody, subject_ids: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const url = new URL('http://localhost/api/admin/questions')
    const req = new NextRequest(url, { method: 'POST', body: 'not-json', headers: { 'content-type': 'application/json' } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
