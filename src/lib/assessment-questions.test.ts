import { describe, it, expect, vi } from 'vitest'
import { checkQuestionSelection, derivePartNumber, fetchSelectableQuestions } from './assessment-questions'
import type { ExamPart } from './exam-parts'

const examPartRow = (n: number, subjectId: string, code: string) => ({
  id: `part-${n}`, code: `T${n}`, part_number: n, name: 'n', title: 't', subtitle: 's', short_label: `T${n}`,
  icon_name: 'x', color: '#fff', question_count: 10, duration_minutes: 90, open_question_share: 0,
  default_subject_id: subjectId,
  exam_part_subjects: [{ subjects: { id: subjectId, code, sort_order: 1 } }],
})
const PARTS = [examPartRow(1, 's1', 'BGP'), examPartRow(2, 's2', 'KSK')]
const SUBJECTS = [
  { id: 's1', code: 'BGP', name: 'BGP', color: '#fff', icon_name: 'x', description: null, is_active: true, sort_order: 1 },
  { id: 's2', code: 'KSK', name: 'KSK', color: '#fff', icon_name: 'x', description: null, is_active: true, sort_order: 2 },
]

function makeSupabase(questionRows: unknown[]) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'exam_parts') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: PARTS, error: null }) }
      }
      if (table === 'subjects') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: SUBJECTS, error: null }) }
      }
      return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: questionRows, error: null }),
      }
    }),
  } as never
}

const row = (id: string, subject = 's1') => ({
  id, question_text: `Frage ${id}`, difficulty: 'mittel', class_level: 10,
  topics: { name: 'Thema' }, question_subjects: [{ subject_id: subject }],
})

describe('fetchSelectableQuestions', () => {
  it('maps rows of all subjects to picker questions with subject codes', async () => {
    const res = await fetchSelectableQuestions(makeSupabase([row('a'), row('b', 's2')]), 'dept')
    expect(res).toEqual([
      { id: 'a', question_text: 'Frage a', difficulty: 'mittel', class_level: 10, topic: 'Thema', subject_codes: ['BGP'] },
      { id: 'b', question_text: 'Frage b', difficulty: 'mittel', class_level: 10, topic: 'Thema', subject_codes: ['KSK'] },
    ])
  })
})

describe('derivePartNumber', () => {
  const parts = PARTS.map((p) => ({
    partNumber: p.part_number, subjects: p.exam_part_subjects.map((e) => ({ id: e.subjects.id, code: e.subjects.code })),
  })) as unknown as ExamPart[]

  it('picks the part with most selected questions', () => {
    const qs = [{ subject_codes: ['KSK'] }, { subject_codes: ['KSK'] }, { subject_codes: ['BGP'] }]
    expect(derivePartNumber(parts, qs)).toBe(2)
  })

  it('takes the lower part on a tie', () => {
    expect(derivePartNumber(parts, [{ subject_codes: ['KSK'] }, { subject_codes: ['BGP'] }])).toBe(1)
  })

  it('falls back to the first part when no subject matches', () => {
    expect(derivePartNumber(parts, [{ subject_codes: ['XYZ'] }])).toBe(1)
  })

  it('returns null without exam parts', () => {
    expect(derivePartNumber([], [{ subject_codes: ['BGP'] }])).toBeNull()
  })
})

describe('checkQuestionSelection', () => {
  const rows = [row('a'), row('b'), row('c', 's2'), row('d', 's2'), row('e', 's2')]

  it('accepts a mixed selection, removes duplicates and derives the part', async () => {
    const res = await checkQuestionSelection(makeSupabase(rows), 'dept', ['a', 'b', 'c', 'd', 'e', 'a'])
    expect(res).toEqual({ ok: true, ids: ['a', 'b', 'c', 'd', 'e'], part: 2 })
  })

  it('rejects ids that are not selectable (open, inactive, foreign department)', async () => {
    const res = await checkQuestionSelection(makeSupabase(rows), 'dept', ['a', 'b', 'c', 'd', 'x'])
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects fewer than 5 questions', async () => {
    const res = await checkQuestionSelection(makeSupabase(rows), 'dept', ['a', 'b'])
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/Mindestens 5/) })
  })
})
