import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const SESSION_ID = '660e8400-e29b-41d4-a716-446655440000'
const SUBJECT_ID = '770e8400-e29b-41d4-a716-446655440001'

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

function makeSupabaseMock({
  user = { id: USER_ID },
  subjects = [{ id: SUBJECT_ID }],
  questionLinks = [{ question_id: '880e8400-e29b-41d4-a716-446655440001' }],
  questions = [{ id: '880e8400-e29b-41d4-a716-446655440001', question_text: 'Q?', type: 'multiple_choice', difficulty: 'medium', explanation: null, sample_answer: null, answer_options: [] }],
  activeSet = null as { question_ids: string[] } | null,
  sessionInsert = { id: SESSION_ID },
  sessionError = null as unknown,
}: {
  user?: unknown
  subjects?: unknown[]
  questionLinks?: unknown[]
  questions?: unknown[]
  activeSet?: { question_ids: string[] } | null
  sessionInsert?: unknown
  sessionError?: unknown
} = {}) {
  const fromImpl = (table: string) => {
    if (table === 'exam_question_sets') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: activeSet, error: null }),
                }),
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'subjects') {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: subjects, error: null }),
        }),
      }
    }
    if (table === 'question_subjects') {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: questionLinks, error: null }),
        }),
      }
    }
    if (table === 'questions') {
      return {
        select: () => ({
          in: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: questions, error: null }),
              eq: () => ({
                limit: () => Promise.resolve({ data: questions, error: null }),
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'exam_sessions') {
      return {
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: sessionInsert, error: sessionError }),
          }),
        }),
      }
    }
    return {}
  }

  return {
    auth: { getUser: () => Promise.resolve({ data: { user } }) },
    from: vi.fn((table: string) => fromImpl(table)),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/exam/sessions', () => {
  it('creates a session for valid part selection', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ parts: [2] }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.sessionId).toBe(SESSION_ID)
    expect(data.parts).toBeDefined()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ user: null }) as never)
    const res = await POST(makeRequest({ parts: [2] }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid parts payload', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ parts: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid part number', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ parts: [4] }))
    expect(res.status).toBe(400)
  })

  it('returns 500 when session insert fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ sessionInsert: null, sessionError: new Error('DB error') }) as never,
    )
    const res = await POST(makeRequest({ parts: [2] }))
    expect(res.status).toBe(500)
  })
})
