import { describe, it, expect } from 'vitest'
import {
  IHK_DEFAULT_SCALE,
  validateGradingScale,
  gradeForPercent,
  scoreAssessmentQuestions,
  effectiveAssessmentStatus,
  normalizeAccessCode,
  formatAccessCode,
  generateAccessCode,
  shuffle,
  buildParticipantRows,
  gradeSnapshot,
  applyGrading,
  snapshotQuestionIds,
  csvEscape,
  buildStudentReports,
  type SessionRow,
} from './graded-assessments'

describe('validateGradingScale', () => {
  it('accepts the IHK default scale', () => {
    expect(validateGradingScale(IHK_DEFAULT_SCALE)).toBeNull()
  })

  it('rejects a scale with fewer than 6 entries', () => {
    expect(validateGradingScale(IHK_DEFAULT_SCALE.slice(0, 5))).toMatch(/6 Einträge/)
  })

  it('rejects a scale missing one grade (duplicate instead of grade 2)', () => {
    const broken = [IHK_DEFAULT_SCALE[0], IHK_DEFAULT_SCALE[0], ...IHK_DEFAULT_SCALE.slice(2)]
    expect(validateGradingScale(broken)).toMatch(/Noten 1 bis 6/)
  })

  it('rejects boundaries that are not strictly descending', () => {
    const scale = IHK_DEFAULT_SCALE.map((b) => (b.grade === 2 ? { ...b, minPercent: 95 } : b))
    expect(validateGradingScale(scale)).toMatch(/absteigend/)
  })

  it('rejects a scale where grade 6 does not start at 0', () => {
    const scale = IHK_DEFAULT_SCALE.map((b) => (b.grade === 6 ? { ...b, minPercent: 5 } : b))
    expect(validateGradingScale(scale)).toMatch(/0 %/)
  })

  it('rejects out-of-range percentages', () => {
    const scale = IHK_DEFAULT_SCALE.map((b) => (b.grade === 1 ? { ...b, minPercent: 150 } : b))
    expect(validateGradingScale(scale)).toMatch(/0 und 100/)
  })
})

describe('gradeForPercent', () => {
  it.each([
    [100, 1], [92, 1], [91, 2], [81, 2], [80, 3], [67, 3], [66, 4], [50, 4], [49, 5], [30, 5], [29, 6], [0, 6],
  ])('maps %i%% to Note %i (IHK scale)', (percent, expected) => {
    expect(gradeForPercent(percent, IHK_DEFAULT_SCALE)).toBe(expected)
  })
})

describe('scoreAssessmentQuestions', () => {
  it('scores only multiple_choice questions and ignores stray open questions', () => {
    const questions = [
      { type: 'multiple_choice', is_correct: true },
      { type: 'multiple_choice', is_correct: true },
      { type: 'multiple_choice', is_correct: false },
      { type: 'multiple_choice', is_correct: false },
      { type: 'open', is_correct: undefined },
    ]
    const result = scoreAssessmentQuestions(questions, IHK_DEFAULT_SCALE)
    expect(result).toEqual({ points: 2, totalPoints: 4, percent: 50, grade: 4 })
  })

  it('treats unanswered (is_correct undefined) questions as wrong', () => {
    const questions = [
      { type: 'multiple_choice', is_correct: true },
      { type: 'multiple_choice' },
    ]
    const result = scoreAssessmentQuestions(questions, IHK_DEFAULT_SCALE)
    expect(result.points).toBe(1)
    expect(result.totalPoints).toBe(2)
    expect(result.percent).toBe(50)
  })

  it('returns 0% / Note 6 for an empty question list rather than dividing by zero', () => {
    expect(scoreAssessmentQuestions([], IHK_DEFAULT_SCALE)).toEqual({ points: 0, totalPoints: 0, percent: 0, grade: 6 })
  })
})

describe('effectiveAssessmentStatus', () => {
  const opensAt = '2026-01-01T08:00:00.000Z'
  const closesAt = '2026-01-01T10:00:00.000Z'

  it('is not_open while still a draft, even inside the window', () => {
    expect(effectiveAssessmentStatus('draft', opensAt, closesAt, new Date('2026-01-01T09:00:00Z'))).toBe('not_open')
  })

  it('is closed once the admin closed it, even inside the window', () => {
    expect(effectiveAssessmentStatus('closed', opensAt, closesAt, new Date('2026-01-01T09:00:00Z'))).toBe('closed')
  })

  it('is not_open when opened ahead of the scheduled start', () => {
    expect(effectiveAssessmentStatus('open', opensAt, closesAt, new Date('2026-01-01T07:00:00Z'))).toBe('not_open')
  })

  it('auto-closes once closesAt has passed, even if the admin never clicked close', () => {
    expect(effectiveAssessmentStatus('open', opensAt, closesAt, new Date('2026-01-01T11:00:00Z'))).toBe('closed')
  })

  it('is open inside the window while status is open', () => {
    expect(effectiveAssessmentStatus('open', opensAt, closesAt, new Date('2026-01-01T09:00:00Z'))).toBe('open')
  })
})

describe('code generation / normalization', () => {
  it('generates 6-character codes from the unambiguous alphabet only', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateAccessCode()
      expect(code).toHaveLength(6)
      expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]+$/)
      expect(code).not.toMatch(/[01OIL]/)
    }
  })

  it('normalizes lowercase, spaces and dashes to the canonical form', () => {
    expect(normalizeAccessCode('7k2m-qx')).toBe('7K2MQX')
    expect(normalizeAccessCode(' 7K2M QX ')).toBe('7K2MQX')
  })

  it('formats a 6-char code as two blocks', () => {
    expect(formatAccessCode('7K2MQX')).toBe('7K2M-QX')
  })
})

describe('shuffle', () => {
  it('returns all the same elements without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const result = shuffle(input)
    expect(result).toHaveLength(input.length)
    expect([...result].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('buildParticipantRows', () => {
  const scale = IHK_DEFAULT_SCALE

  it('leaves score fields null for an in-progress session', () => {
    const rows = buildParticipantRows([
      {
        id: 's1', participant_name: 'Max Muster', started_at: '2026-01-01T08:00:00Z', ended_at: null,
        status: 'in_progress', excluded_from_grading: false, results_json: { parts: { '1': { questions: [] } } },
      },
    ], 1, scale)
    expect(rows[0].points).toBeNull()
    expect(rows[0].grade).toBeNull()
    expect(rows[0].status).toBe('in_progress')
  })

  it('computes points/percent/grade and duration for a completed session', () => {
    const rows = buildParticipantRows([
      {
        id: 's1', participant_name: 'Max Muster', started_at: '2026-01-01T08:00:00Z', ended_at: '2026-01-01T08:30:00Z',
        status: 'completed', excluded_from_grading: false,
        results_json: { parts: { '1': { questions: [
          { id: 'q1', type: 'multiple_choice', is_correct: true },
          { id: 'q2', type: 'multiple_choice', is_correct: true },
        ] } } },
      },
    ], 1, scale)
    expect(rows[0]).toMatchObject({ points: 2, totalPoints: 2, percent: 100, grade: 1, durationMinutes: 30, status: 'completed' })
  })
})

describe('gradeSnapshot', () => {
  const snapshot = [
    { id: 'q1', question_text: 'Q1', type: 'multiple_choice', difficulty: 'leicht', part: 1, answer_options: [
      { id: 'a', option_text: 'A', display_order: 1 }, { id: 'b', option_text: 'B', display_order: 2 },
    ] },
    { id: 'q2', question_text: 'Q2', type: 'multiple_choice', difficulty: 'leicht', part: 1, answer_options: [
      { id: 'c', option_text: 'C', display_order: 1 }, { id: 'd', option_text: 'D', display_order: 2 },
    ] },
  ]
  const key = new Map([
    ['q1', { explanation: 'weil A', sampleAnswer: null, options: new Map([['a', true], ['b', false]]) }],
    ['q2', { explanation: 'weil D', sampleAnswer: null, options: new Map([['c', false], ['d', true]]) }],
  ])

  it('grades from the server-side key, not from anything stored in the snapshot', () => {
    const { part, scored } = gradeSnapshot(snapshot, { q1: 'a', q2: 'c' }, key, IHK_DEFAULT_SCALE)
    expect(scored).toMatchObject({ points: 1, totalPoints: 2, percent: 50, grade: 4 })
    expect(part.questions[0]).toMatchObject({ is_correct: true, correct_option_id: 'a', student_answer: 'a', explanation: 'weil A' })
    expect(part.questions[1]).toMatchObject({ is_correct: false, correct_option_id: 'd', student_answer: 'c' })
    expect((part.questions[1].answer_options.find((o) => o.id === 'd') as { is_correct: boolean } | undefined)?.is_correct).toBe(true)
  })

  it('keeps the participant-specific order of the snapshot', () => {
    const { part } = gradeSnapshot([snapshot[1], snapshot[0]], {}, key, IHK_DEFAULT_SCALE)
    expect(part.questions.map((q) => q.id)).toEqual(['q2', 'q1'])
  })

  it('drops questions deleted after the snapshot for everyone alike', () => {
    const onlyQ1 = new Map([...key].filter(([id]) => id === 'q1'))
    const { scored } = gradeSnapshot(snapshot, { q1: 'a' }, onlyQ1, IHK_DEFAULT_SCALE)
    expect(scored).toMatchObject({ points: 1, totalPoints: 1, percent: 100 })
  })
})

describe('applyGrading', () => {
  const key = new Map([
    ['q1', { explanation: null, sampleAnswer: null, options: new Map([['a', true], ['b', false]]) }],
  ])
  const snapshot = [{ id: 'q1', question_text: 'Q1', type: 'multiple_choice', difficulty: 'leicht', part: 1, answer_options: [
    { id: 'a', option_text: 'A', display_order: 1 }, { id: 'b', option_text: 'B', display_order: 2 },
  ] }]
  const base = { participant_name: 'X', started_at: '2026-01-01T08:00:00Z', ended_at: '2026-01-01T08:10:00Z', excluded_from_grading: false }

  it('grades unreleased (raw snapshot array) and aborted attempts alike', () => {
    const rows = applyGrading([
      { ...base, id: 's1', status: 'completed', results_json: { parts: { '1': snapshot }, submitted_answers: { q1: 'a' } } as never },
      { ...base, id: 's2', status: 'aborted', results_json: { parts: { '1': snapshot }, submitted_answers: { q1: 'b' } } as never },
    ], 1, key, IHK_DEFAULT_SCALE)
    const participants = buildParticipantRows(rows, 1, IHK_DEFAULT_SCALE)
    expect(participants.map((p) => p.grade)).toEqual([1, 6])
  })

  it('leaves in-progress attempts ungraded', () => {
    const rows = applyGrading([
      { ...base, id: 's1', ended_at: null, status: 'in_progress', results_json: { parts: { '1': snapshot } } as never },
    ], 1, key, IHK_DEFAULT_SCALE)
    expect(buildParticipantRows(rows, 1, IHK_DEFAULT_SCALE)[0].grade).toBeNull()
  })

  it('collects snapshot question ids from both stored shapes', () => {
    expect(snapshotQuestionIds([
      { ...base, id: 's1', status: 'completed', results_json: { parts: { '1': snapshot } } as never },
      { ...base, id: 's2', status: 'completed', results_json: { parts: { '1': { questions: snapshot } } } as never },
    ], 1)).toEqual(['q1'])
  })
})

describe('csvEscape', () => {
  it.each(['=HYPERLINK("http://x";"klick")', '+49 123', '-5', '@SUM(A1)'])('neutralises formula-like value %s', (value) => {
    expect(csvEscape(value).replace(/^"/, '').startsWith("'")).toBe(true)
  })

  it('quotes values containing the separator or quotes', () => {
    expect(csvEscape('Müller; Anna')).toBe('"Müller; Anna"')
    expect(csvEscape('Anna "Nana" M.')).toBe('"Anna ""Nana"" M."')
  })

  it('leaves ordinary names untouched', () => {
    expect(csvEscape('Anna Müller')).toBe('Anna Müller')
  })
})

describe('buildStudentReports', () => {
  const snapshot = [
    { id: 'q1', question_text: 'Frage 1', type: 'multiple_choice', difficulty: 'easy', part: 1,
      answer_options: [{ id: 'a', option_text: 'A', display_order: 2 }, { id: 'b', option_text: 'B', display_order: 1 }] },
    { id: 'q2', question_text: 'Frage 2', type: 'multiple_choice', difficulty: 'easy', part: 1,
      answer_options: [{ id: 'c', option_text: 'C', display_order: 1 }, { id: 'd', option_text: 'D', display_order: 2 }] },
  ]
  const key = new Map([
    ['q1', { explanation: 'weil B', sampleAnswer: null, options: new Map([['a', false], ['b', true]]) }],
    ['q2', { explanation: null, sampleAnswer: null, options: new Map([['c', true], ['d', false]]) }],
  ])
  const row = (id: string, name: string, answers: Record<string, string>, extra: Partial<SessionRow> = {}): SessionRow => ({
    id,
    participant_name: name,
    started_at: '2026-10-01T08:00:00Z',
    ended_at: '2026-10-01T08:30:00Z',
    status: 'completed',
    excluded_from_grading: false,
    results_json: { parts: { '1': snapshot }, submitted_answers: answers } as unknown as SessionRow['results_json'],
    ...extra,
  })
  const build = (rows: SessionRow[]) =>
    buildStudentReports(applyGrading(rows, 1, key, IHK_DEFAULT_SCALE), 1, IHK_DEFAULT_SCALE)

  it('marks correct, wrong and unanswered questions and sorts options by display order', () => {
    const [report] = build([row('s1', 'Anna', { q1: 'a' })])
    expect(report.questions.map((q) => q.result)).toEqual(['wrong', 'unanswered'])
    expect(report.questions[0].options.map((o) => o.id)).toEqual(['b', 'a'])
    expect(report.questions[0].options.find((o) => o.id === 'a')?.selected).toBe(true)
    expect(report.questions[0].options.find((o) => o.id === 'b')?.isCorrect).toBe(true)
    expect(report.questions[0].explanation).toBe('weil B')
    expect(report.points).toBe(0)
    expect(report.totalPoints).toBe(2)
    expect(report.grade).toBe(6)
  })

  it('uses the same points and grade as the participant list', () => {
    const rows = applyGrading([row('s1', 'Anna', { q1: 'b', q2: 'c' })], 1, key, IHK_DEFAULT_SCALE)
    const [report] = buildStudentReports(rows, 1, IHK_DEFAULT_SCALE)
    const [participant] = buildParticipantRows(rows, 1, IHK_DEFAULT_SCALE)
    expect(report.points).toBe(participant.points)
    expect(report.grade).toBe(participant.grade)
    expect(report.grade).toBe(1)
  })

  it('leaves out in-progress attempts', () => {
    const reports = build([row('s1', 'Anna', {}, { status: 'in_progress', ended_at: null }), row('s2', 'Ben', { q1: 'b' })])
    expect(reports.map((r) => r.name)).toEqual(['Ben'])
  })

  it('shows excluded participants without grade and answers', () => {
    const [report] = build([row('s1', 'Anna', { q1: 'b', q2: 'c' }, { excluded_from_grading: true })])
    expect(report.excluded).toBe(true)
    expect(report.grade).toBeNull()
    expect(report.points).toBeNull()
    expect(report.questions).toEqual([])
  })

  it('sorts alphabetically with German collation', () => {
    const reports = build([row('s1', 'Zoe', {}), row('s2', 'Änne', {}), row('s3', 'Bernd', {})])
    expect(reports.map((r) => r.name)).toEqual(['Änne', 'Bernd', 'Zoe'])
  })
})
