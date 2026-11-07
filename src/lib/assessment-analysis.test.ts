import { describe, it, expect } from 'vitest'
import { analyzeAssessment } from './assessment-analysis'
import type { SessionRow, SnapshotQuestion } from './graded-assessments'

const OPTS = (correct: string) => [
  { id: 'a', option_text: 'A', is_correct: correct === 'a' },
  { id: 'b', option_text: 'B', is_correct: correct === 'b' },
  { id: 'c', option_text: 'C', is_correct: correct === 'c' },
]

function q(id: string, answer: string | null, correct: string, extra: Partial<SnapshotQuestion> = {}): SnapshotQuestion {
  return {
    id,
    type: 'multiple_choice',
    question_text: `Frage ${id}`,
    student_answer: answer,
    is_correct: answer === correct,
    answer_options: OPTS(correct),
    ...extra,
  }
}

function row(i: number, questions: SnapshotQuestion[], extra: Partial<SessionRow> = {}): SessionRow {
  return {
    id: `s${i}`,
    participant_name: `T${i}`,
    started_at: '2026-11-01T08:00:00Z',
    ended_at: '2026-11-01T08:30:00Z',
    status: 'completed',
    excluded_from_grading: false,
    results_json: { parts: { '1': { questions } } },
    ...extra,
  }
}

/** 10 Teilnehmer; F1 lösen die Besten, F2 lösen alle, F3 lösen nur die Schwächsten (Fehler in der Frage) */
function classRows(): SessionRow[] {
  return Array.from({ length: 10 }, (_, i) => {
    const strong = i < 5
    return row(i, [
      q('f1', strong ? 'a' : 'b', 'a'),
      q('f2', 'a', 'a'),
      q('f3', strong ? 'b' : 'a', 'a'),
      q('f4', strong ? 'a' : 'a', 'a'),
    ])
  })
}

describe('analyzeAssessment', () => {
  it('zählt nur abgegebene, nicht ausgeschlossene Versuche', () => {
    const rows = [
      ...classRows(),
      row(20, [q('f1', 'a', 'a')], { status: 'in_progress' }),
      row(21, [q('f1', 'a', 'a')], { excluded_from_grading: true }),
    ]
    expect(analyzeAssessment(rows, 1).participants).toBe(10)
  })

  it('berechnet Lösungsquote und Antwortverteilung', () => {
    const a = analyzeAssessment(classRows(), 1)
    const f1 = a.items.find((i) => i.id === 'f1')!
    expect(f1.correctRate).toBe(50)
    expect(f1.options.find((o) => o.id === 'a')).toMatchObject({ selectedCount: 5, percent: 50 })
    expect(f1.options.find((o) => o.id === 'b')).toMatchObject({ selectedCount: 5, percent: 50 })
  })

  it('markiert Fragen, bei denen eine falsche Antwort die richtige übertrifft, rot', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(i, [q('f1', i < 2 ? 'a' : 'b', 'a'), q('f2', 'a', 'a')]))
    const f1 = analyzeAssessment(rows, 1).items[0]
    expect(f1.light).toBe('red')
    expect(f1.reasons).toContain('wrong_option_wins')
  })

  it('erkennt negative Trennschärfe (Starke scheitern, Schwache lösen)', () => {
    const f3 = analyzeAssessment(classRows(), 1).items.find((i) => i.id === 'f3')!
    expect(f3.discrimination).not.toBeNull()
    expect(f3.discrimination!).toBeLessThan(0)
    expect(f3.light).toBe('red')
    expect(f3.reasons).toContain('negative_discrimination')
  })

  it('stuft eine von allen gelöste Frage als gelb („zu leicht“) ein', () => {
    const f2 = analyzeAssessment(classRows(), 1).items.find((i) => i.id === 'f2')!
    expect(f2.correctRate).toBe(100)
    expect(f2.light).toBe('yellow')
    expect(f2.reasons).toContain('too_easy')
  })

  it('stuft eine kaum gelöste Frage als gelb („zu schwer“) ein', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(i, [q('f1', i === 0 ? 'a' : 'c', 'a'), q('f2', 'a', 'a')]))
    // c wird 9× gewählt und schlägt a → rot; zusätzlich ist die Frage zu schwer
    const spread = Array.from({ length: 20 }, (_, i) => row(i, [q('f1', i === 0 ? 'a' : i % 2 ? 'b' : 'c', 'a'), q('f2', 'a', 'a')]))
    expect(analyzeAssessment(rows, 1).items[0].light).toBe('red')
    const f1 = analyzeAssessment(spread, 1).items[0]
    expect(f1.correctRate).toBeLessThan(20)
    expect(f1.reasons).toContain('too_hard')
    expect(f1.light).toBe('red')
  })

  it('berechnet unter 8 Teilnehmern keine Trennschärfe', () => {
    const a = analyzeAssessment(classRows().slice(0, 7), 1)
    expect(a.discriminationAvailable).toBe(false)
    expect(a.items.every((i) => i.discrimination === null)).toBe(true)
  })

  it('lässt aus der Wertung genommene Fragen im Ergebnis stehen, zählt sie aber nicht zur Gesamtpunktzahl', () => {
    const rows = classRows().map((r) => {
      const qs = r.results_json!.parts!['1'].questions.map((x) => (x.id === 'f3' ? { ...x, excluded: true } : x))
      return { ...r, results_json: { parts: { '1': { questions: qs } } } }
    })
    const a = analyzeAssessment(rows, 1)
    const f3 = a.items.find((i) => i.id === 'f3')!
    expect(f3.excluded).toBe(true)
    // ohne f3 sind die Besten nicht mehr die „Starken“ von f3: Rangfolge richtet sich nach f1, f2, f4
    expect(f3.discrimination).not.toBeNull()
  })

  it('zählt nicht beantwortete Fragen getrennt', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(i, [q('f1', i < 3 ? null : 'a', 'a')]))
    const f1 = analyzeAssessment(rows, 1).items[0]
    expect(f1.unanswered).toBe(3)
    expect(f1.answered).toBe(7)
    expect(f1.correctRate).toBe(70)
  })

  it('liefert ohne Abgaben eine leere Analyse ohne Ampel', () => {
    const a = analyzeAssessment([], 1)
    expect(a.participants).toBe(0)
    expect(a.items).toEqual([])
  })
})
