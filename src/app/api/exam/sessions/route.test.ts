import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

// The answer key is merged in server-side via the service client (PROJ-21).
// These fixtures already carry is_correct, so pass questions through as-is.
vi.mock('@/lib/answer-key', () => ({
  attachAnswerKey: vi.fn(async (qs: unknown[]) => qs),
  getLockedQuestionIds: vi.fn(async () => new Set<string>()),
  fetchAnswerKey: vi.fn(async () => new Map()),
}))

import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const SESSION_ID = '660e8400-e29b-41d4-a716-446655440000'
const SUBJECT_ID = '770e8400-e29b-41d4-a716-446655440001'

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

const SPED = 'dept-sped'
const STG = '770e8400-e29b-41d4-a716-446655440002'
const LOP = '770e8400-e29b-41d4-a716-446655440003'

// Prüfungsaufbau der Spedition, wie in exam_parts hinterlegt (PROJ-22)
function examPart(n: number, questionCount: number, duration: number, openShare: string, subjects: { id: string; code: string }[]) {
  return {
    id: `part-${n}`, code: `P${n}`, part_number: n, name: `Teil ${n}`, title: `Teil ${n}`, subtitle: '',
    short_label: `T${n}`, icon_name: 'BookOpen', color: '#fff', question_count: questionCount,
    duration_minutes: duration, open_question_share: openShare, default_subject_id: subjects[0]?.id ?? null,
    exam_part_subjects: subjects.map((s, i) => ({ subjects: { ...s, sort_order: i } })),
  }
}
const EXAM_PARTS = [
  examPart(1, 20, 90, '0.70', [{ id: STG, code: 'STG' }, { id: LOP, code: 'LOP' }]),
  examPart(2, 15, 90, '0', [{ id: SUBJECT_ID, code: 'KSK' }]),
  examPart(3, 15, 45, '0', [{ id: '770e8400-e29b-41d4-a716-446655440004', code: 'BGP' }]),
]

let lastMock: ReturnType<typeof chainMock>

function makeSupabaseMock({
  user = { id: USER_ID } as unknown,
  questionLinks = [{ question_id: '880e8400-e29b-41d4-a716-446655440001' }] as unknown[],
  questions = [{ id: '880e8400-e29b-41d4-a716-446655440001', question_text: 'Q?', type: 'multiple_choice', difficulty: 'medium', explanation: null, sample_answer: null, answer_options: [] }] as unknown[],
  activeSet = null as { question_ids: string[] } | null,
  sessionInsert = { id: SESSION_ID } as unknown,
  sessionError = null as unknown,
} = {}) {
  lastMock = chainMock(
    (table, calls) => {
      if (table === 'profiles') return { data: { department_id: SPED } }
      if (table === 'departments') return { data: { id: SPED, code: 'SPED', slug: 'spedition', name: 'Spedition', class_levels: [10, 11, 12], pseudonym_nouns: [] } }
      if (table === 'exam_parts') return { data: EXAM_PARTS }
      if (table === 'exam_question_sets') return { data: activeSet }
      if (table === 'question_subjects') return { data: questionLinks }
      if (table === 'questions') return { data: questions }
      if (table === 'exam_sessions' && hasCall(calls, 'insert')) return { data: sessionInsert, error: sessionError }
      return {}
    },
    { auth: { getUser: () => Promise.resolve({ data: { user } }) } },
  )
  return lastMock.client
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

  it('returns 400 for a part the department does not have', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ parts: [4] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('4')
  })

  it('draws the random pool from the subjects of the part', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    await POST(makeRequest({ parts: [1] }))
    const tables = lastMock.from.mock.calls.map((c) => c[0])
    expect(tables).not.toContain('subjects') // Fächer kommen aus dem Prüfungsaufbau, nicht per Kürzel-Suche
  })

  it('splits part 1 into open and multiple-choice questions by the stored share (70 %)', async () => {
    const limits: number[] = []
    const mock = makeSupabaseMock()
    const originalFrom = lastMock.from.getMockImplementation()!
    lastMock.from.mockImplementation((table: string) => {
      const builder = originalFrom(table) as unknown as Record<string, (...a: unknown[]) => unknown>
      if (table === 'questions') {
        const limit = builder.limit
        builder.limit = (n: unknown) => { limits.push(n as number); return limit(n) }
      }
      return builder as never
    })
    vi.mocked(createClient).mockResolvedValue(mock as never)
    const res = await POST(makeRequest({ parts: [1] }))
    expect(res.status).toBe(200)
    expect(limits.sort((a, b) => a - b)).toEqual([6, 14])
  })

  it('stores the part duration from the database', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    await POST(makeRequest({ parts: [3] }))
    const insert = lastMock.writes.find((w) => w.table === 'exam_sessions')?.payload as { results_json: { durationMinutes: number } }
    expect(insert.results_json.durationMinutes).toBe(45)
  })

  it('only looks for active sets in the own department', async () => {
    const seen: unknown[] = []
    const mock = makeSupabaseMock()
    const originalFrom = lastMock.from.getMockImplementation()!
    lastMock.from.mockImplementation((table: string) => {
      const builder = originalFrom(table) as unknown as Record<string, (...a: unknown[]) => unknown>
      if (table === 'exam_question_sets') {
        const eq = builder.eq
        builder.eq = (col: unknown, val: unknown) => { if (col === 'department_id') seen.push(val); return eq(col, val) }
      }
      return builder as never
    })
    vi.mocked(createClient).mockResolvedValue(mock as never)
    await POST(makeRequest({ parts: [2] }))
    expect(seen).toEqual([SPED])
  })

  it('returns 500 when session insert fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ sessionInsert: null, sessionError: new Error('DB error') }) as never,
    )
    const res = await POST(makeRequest({ parts: [2] }))
    expect(res.status).toBe(500)
  })
})
