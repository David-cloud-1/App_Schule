import { describe, expect, it } from 'vitest'
import { examPartLabel, examPartSubjectCodes, findExamPart, mapExamPart } from './exam-parts'

const ROW = {
  id: 'p1', code: 'LEISTUNG', part_number: 1, name: 'Leistungserstellung in Spedition und Logistik',
  title: 'Leistungserstellung', subtitle: 'Spedition & Logistik', short_label: 'Leistungserstellung',
  icon_name: 'Truck', color: '#3B82F6', question_count: 20, duration_minutes: 90,
  open_question_share: '0.70', default_subject_id: 'stg',
  exam_part_subjects: [
    { subjects: { id: 'lop', code: 'LOP', sort_order: 4 } },
    { subjects: { id: 'stg', code: 'STG', sort_order: 3 } },
    { subjects: null },
  ],
}

describe('mapExamPart', () => {
  it('wandelt den Anteil offener Fragen (numeric → String) in eine Zahl', () => {
    expect(mapExamPart(ROW).openQuestionShare).toBe(0.7)
    expect(mapExamPart({ ...ROW, open_question_share: '0' }).openQuestionShare).toBe(0)
  })

  it('sortiert die Fächer des Teils nach ihrer Reihenfolge und überspringt leere Verknüpfungen', () => {
    expect(mapExamPart(ROW).subjects).toEqual([{ id: 'stg', code: 'STG' }, { id: 'lop', code: 'LOP' }])
  })
})

describe('Beschriftungen', () => {
  const part = mapExamPart(ROW)
  it('examPartSubjectCodes', () => expect(examPartSubjectCodes(part)).toBe('STG / LOP'))
  it('examPartLabel', () => expect(examPartLabel(part)).toBe('Teil 1 – Leistungserstellung'))
  it('examPartLabel ohne Teil zeigt die Nummer', () => expect(examPartLabel(undefined, 7)).toBe('Teil 7'))
  it('findExamPart', () => {
    expect(findExamPart([part], 1)?.id).toBe('p1')
    expect(findExamPart([part], 2)).toBeUndefined()
  })
})
