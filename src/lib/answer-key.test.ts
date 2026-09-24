import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { createServiceClient } from '@/lib/supabase-server'
import { attachAnswerKey, fetchAnswerKey, getLockedQuestionIds, verifyAnswers } from './answer-key'

function keyClient(rows: unknown[]) {
  const inFn = vi.fn().mockImplementation((_col: string, ids: string[]) =>
    Promise.resolve({ data: (rows as { id: string }[]).filter((r) => ids.includes(r.id)), error: null }),
  )
  return { client: { from: vi.fn(() => ({ select: vi.fn().mockReturnValue({ in: inFn }) })) }, inFn }
}

describe('attachAnswerKey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('merges is_correct from the server-side key into questions loaded without it', async () => {
    const { client } = keyClient([
      { id: 'q1', explanation: null, sample_answer: null, answer_options: [{ id: 'a', is_correct: true }, { id: 'b', is_correct: false }] },
    ])
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const result = await attachAnswerKey([
      { id: 'q1', question_text: 'Q', answer_options: [{ id: 'a', option_text: 'A' }, { id: 'b', option_text: 'B' }] },
    ])

    expect(result[0].question_text).toBe('Q')
    expect(result[0].answer_options).toEqual([
      { id: 'a', option_text: 'A', is_correct: true },
      { id: 'b', option_text: 'B', is_correct: false },
    ])
  })

  it('does not query at all for an empty list', async () => {
    const { client } = keyClient([])
    vi.mocked(createServiceClient).mockReturnValue(client as never)
    expect(await attachAnswerKey([])).toEqual([])
    expect(client.from).not.toHaveBeenCalled()
  })
})

describe('fetchAnswerKey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('splits large id lists into chunks so the request URL stays short', async () => {
    const ids = Array.from({ length: 450 }, (_, i) => `q${i}`)
    const { client, inFn } = keyClient(ids.map((id) => ({ id, explanation: null, sample_answer: null, answer_options: [] })))
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const key = await fetchAnswerKey(ids)

    expect(inFn).toHaveBeenCalledTimes(3)
    expect(key.size).toBe(450)
  })
})

describe('getLockedQuestionIds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('locks questions of open assessments and of assessments with attempts still running', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'exam_sessions') {
        return { select: () => ({ eq: () => ({ not: () => Promise.resolve({ data: [{ assessment_id: 'closed-but-running' }, { assessment_id: 'open-1' }] }) }) }) }
      }
      // graded_assessments: first call = open ones (.eq), second = running ones (.in)
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [{ id: 'open-1', question_ids_snapshot: ['q1', 'q2'] }] }),
          in: (_col: string, ids: string[]) => {
            expect(ids).toEqual(['closed-but-running'])
            return Promise.resolve({ data: [{ question_ids_snapshot: ['q3'] }] })
          },
        }),
      }
    })
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)

    expect([...(await getLockedQuestionIds())].sort()).toEqual(['q1', 'q2', 'q3'])
  })
})

describe('verifyAnswers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('decides correctness from the key, ignores the client flag and counts each question once', async () => {
    const { client } = keyClient([
      { id: 'q1', explanation: null, sample_answer: null, answer_options: [{ id: 'a', is_correct: true }, { id: 'b', is_correct: false }] },
      { id: 'q2', explanation: null, sample_answer: null, answer_options: [{ id: 'c', is_correct: false }, { id: 'd', is_correct: true }] },
    ])
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const result = await verifyAnswers([
      { question_id: 'q1', selected_option_id: 'a', is_correct: false }, // really correct
      { question_id: 'q2', selected_option_id: 'c', is_correct: true },  // client lies
      { question_id: 'q1', selected_option_id: 'a', is_correct: true },  // repeat → dropped
      { question_id: 'qX', selected_option_id: 'z', is_correct: true },  // unknown question
    ])

    expect(result.map((a) => [a.question_id, a.is_correct])).toEqual([
      ['q1', true],
      ['q2', false],
      ['qX', false],
    ])
  })
})
