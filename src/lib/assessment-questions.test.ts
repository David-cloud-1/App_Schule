import { describe, it, expect, vi } from 'vitest'
import { checkQuestionSelection, fetchSelectableQuestions } from './assessment-questions'

const PART = {
  id: 'part-1', code: 'T1', part_number: 1, name: 'n', title: 't', subtitle: 's', short_label: 'T1',
  icon_name: 'x', color: '#fff', question_count: 10, duration_minutes: 90, open_question_share: 0,
  default_subject_id: 's1',
  exam_part_subjects: [{ subjects: { id: 's1', code: 'BGP', sort_order: 1 } }],
}

function makeSupabase(questionRows: unknown[]) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'exam_parts') {
        const b = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [PART], error: null }) }
        return b
      }
      const b = {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: questionRows, error: null }),
      }
      return b
    }),
  } as never
}

const row = (id: string) => ({
  id, question_text: `Frage ${id}`, difficulty: 'mittel', class_level: 10,
  topics: { name: 'Thema' }, question_subjects: [{ subject_id: 's1' }],
})

describe('fetchSelectableQuestions', () => {
  it('maps rows to picker questions with subject codes', async () => {
    const res = await fetchSelectableQuestions(makeSupabase([row('a')]), 'dept', 1)
    expect(res).toEqual([{ id: 'a', question_text: 'Frage a', difficulty: 'mittel', class_level: 10, topic: 'Thema', subject_codes: ['BGP'] }])
  })

  it('returns null for an unknown part', async () => {
    expect(await fetchSelectableQuestions(makeSupabase([]), 'dept', 9)).toBeNull()
  })
})

describe('checkQuestionSelection', () => {
  const rows = ['a', 'b', 'c', 'd', 'e'].map(row)

  it('accepts a valid selection and removes duplicates', async () => {
    const res = await checkQuestionSelection(makeSupabase(rows), 'dept', 1, ['a', 'b', 'c', 'd', 'e', 'a'])
    expect(res).toEqual({ ok: true, ids: ['a', 'b', 'c', 'd', 'e'] })
  })

  it('rejects ids that are not selectable (open, inactive, foreign department)', async () => {
    const res = await checkQuestionSelection(makeSupabase(rows), 'dept', 1, ['a', 'b', 'c', 'd', 'x'])
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects fewer than 5 questions', async () => {
    const res = await checkQuestionSelection(makeSupabase(rows), 'dept', 1, ['a', 'b'])
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/Mindestens 5/) })
  })

  it('rejects an unknown part', async () => {
    const res = await checkQuestionSelection(makeSupabase(rows), 'dept', 9, ['a'])
    expect(res).toMatchObject({ ok: false, status: 400 })
  })
})
