import { describe, expect, it } from 'vitest'
import {
  changedAfterAnswers,
  filterRows,
  needsAnswerCheck,
  questionSearchLink,
  rankQuestions,
  rankTopics,
  solveRate,
  topWrongShare,
  type DifficultyRow,
} from './difficulty'

function row(p: Partial<DifficultyRow> = {}): DifficultyRow {
  return {
    question_id: 'q', question_text: 'Frage', class_level: 10, topic_id: 't1', topic_name: 'Thema 1',
    subject_id: 's1', subject_name: 'BGP', department_id: 'd', attempts: 30, correct: 15,
    top_wrong_option_text: null, top_wrong_count: 0, open_reports: 0, last_changed_at: null, first_counted_at: null,
    ...p,
  }
}

describe('difficulty', () => {
  it('rechnet Quote und Anteil', () => {
    expect(solveRate(1, 3)).toBe(33)
    expect(solveRate(0, 0)).toBeNull()
    expect(topWrongShare({ attempts: 20, top_wrong_count: 5 })).toBe(25)
    expect(topWrongShare({ attempts: 20, top_wrong_count: 0 })).toBeNull()
  })

  it('markiert „Antwort prüfen“ nur, wenn eine falsche Antwort die richtige übertrifft', () => {
    expect(needsAnswerCheck({ correct: 5, top_wrong_count: 6 })).toBe(true)
    expect(needsAnswerCheck({ correct: 6, top_wrong_count: 6 })).toBe(false)
  })

  it('erkennt Änderung nach den ersten Antworten', () => {
    expect(changedAfterAnswers({ last_changed_at: '2026-11-02', first_counted_at: '2026-11-01' })).toBe(true)
    expect(changedAfterAnswers({ last_changed_at: '2026-10-01', first_counted_at: '2026-11-01' })).toBe(false)
    expect(changedAfterAnswers({ last_changed_at: null, first_counted_at: '2026-11-01' })).toBe(false)
  })

  it('trennt Fragen unter der Mindestanzahl und sortiert nach niedrigster Quote', () => {
    const { ranked, tooFew } = rankQuestions(
      [
        row({ question_id: 'a', attempts: 20, correct: 10 }),
        row({ question_id: 'b', attempts: 40, correct: 8 }),
        row({ question_id: 'c', attempts: 5, correct: 0 }),
        row({ question_id: 'd', attempts: 0, correct: 0 }),
      ],
      20,
    )
    expect(ranked.map((r) => r.question_id)).toEqual(['b', 'a'])
    expect(tooFew.map((r) => r.question_id)).toEqual(['c'])
  })

  it('fasst Themen zusammen, auch „Ohne Thema“', () => {
    const { ranked, tooFew } = rankTopics(
      [
        row({ attempts: 20, correct: 10 }),
        row({ attempts: 10, correct: 0 }),
        row({ topic_id: null, topic_name: null, attempts: 3, correct: 1 }),
        row({ attempts: 0, correct: 0 }),
      ],
      20,
    )
    expect(ranked).toHaveLength(1)
    expect(ranked[0]).toMatchObject({ attempts: 30, correct: 10, questions: 3, questionsWithAnswers: 2 })
    expect(tooFew[0].name).toBe('Ohne Thema')
  })

  it('filtert nach Fach und Thema', () => {
    const rows = [row({ subject_id: 's1' }), row({ subject_id: 's2' }), row({ topic_id: null })]
    expect(filterRows(rows, { subjectId: 's2' })).toHaveLength(1)
    expect(filterRows(rows, { topicKey: 'ohne-thema' })).toHaveLength(1)
    expect(filterRows(rows, {})).toHaveLength(3)
  })
})

describe('questionSearchLink', () => {
  it('nimmt den Anfang der Frage unverändert', () => {
    expect(questionSearchLink('Welche Autobahn verbindet Dortmund und Kassel?')).toBe(
      '/admin/questions?q=' + encodeURIComponent('Welche Autobahn verbindet Dortmund und Kassel?')
    )
  })
  it('bricht am Komma ab und nimmt das längste Stück, damit die Suche den Originaltext trifft', () => {
    const url = questionSearchLink('Welche Autobahn, die Dortmund mit Kassel und Frankfurt am Main verbindet, ist gemeint?')
    expect(decodeURIComponent(url.split('q=')[1])).toBe('die Dortmund mit Kassel und Frankfurt am Main verbindet')
  })
  it('kürzt auf höchstens 60 Zeichen', () => {
    const q = decodeURIComponent(questionSearchLink('a'.repeat(100)).split('q=')[1])
    expect(q.length).toBe(60)
  })
})
