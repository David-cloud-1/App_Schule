import { describe, it, expect } from 'vitest'
import { assessmentNavCount, buildTaskEntries, EMPTY_TASK_COUNTS, formatTaskBadge, parseTaskCounts } from './teacher-tasks'

const counts = (over: Partial<typeof EMPTY_TASK_COUNTS>) => ({ ...EMPTY_TASK_COUNTS, ...over })

describe('buildTaskEntries', () => {
  it('lässt Quellen mit 0, null oder ungültigen Werten weg', () => {
    expect(buildTaskEntries(EMPTY_TASK_COUNTS)).toEqual([])
    expect(buildTaskEntries(counts({ openReports: 0, draftQuestions: -1, upcomingDrafts: Number.NaN }))).toEqual([])
  })

  it('sortiert nach Dringlichkeit: Termine, Meldungen, Entwürfe, Freigaben', () => {
    const ids = buildTaskEntries(
      counts({ unreleasedAssessments: 1, draftQuestions: 2, openReports: 3, upcomingDrafts: 4 }),
    ).map((e) => e.id)
    expect(ids).toEqual(['upcomingDrafts', 'openReports', 'draftQuestions', 'unreleasedAssessments'])
  })

  it('bildet Einzahl und Mehrzahl und verlinkt auf die passende Seite', () => {
    const [one] = buildTaskEntries(counts({ openReports: 1 }))
    expect(one.text).toBe('1 gemeldete Frage wartet auf dich')
    expect(one.href).toBe('/admin/gemeldete-fragen')
    const [many] = buildTaskEntries(counts({ openReports: 3 }))
    expect(many.text).toBe('3 gemeldete Fragen warten auf dich')
    const [rel] = buildTaskEntries(counts({ unreleasedAssessments: 2 }))
    expect(rel.text).toContain('2 Nachweise sind beendet')
    const [draft] = buildTaskEntries(counts({ upcomingDrafts: 1 }))
    expect(draft.text).toContain('1 Nachweis im Entwurf hat')
  })
})

describe('formatTaskBadge', () => {
  it('ist leer bei 0 und ungültig, zeigt „99+“ ab 100', () => {
    expect(formatTaskBadge(0)).toBeNull()
    expect(formatTaskBadge(undefined)).toBeNull()
    expect(formatTaskBadge(Number.NaN)).toBeNull()
    expect(formatTaskBadge(7)).toBe('7')
    expect(formatTaskBadge(99)).toBe('99')
    expect(formatTaskBadge(100)).toBe('99+')
  })
})

describe('parseTaskCounts', () => {
  it('übernimmt gültige Zahlen und macht den Rest zu null', () => {
    expect(
      parseTaskCounts({ counts: { openReports: 2, unreleasedAssessments: 'x', upcomingDrafts: null, draftQuestions: -3 } }),
    ).toEqual({ openReports: 2, unreleasedAssessments: null, upcomingDrafts: null, draftQuestions: null })
  })

  it('übersteht kaputte Antworten', () => {
    expect(parseTaskCounts(null)).toEqual(EMPTY_TASK_COUNTS)
    expect(parseTaskCounts({ assessments: [] })).toEqual(EMPTY_TASK_COUNTS)
    expect(parseTaskCounts('x')).toEqual(EMPTY_TASK_COUNTS)
  })
})

describe('assessmentNavCount', () => {
  it('addiert Freigaben und Termine und kommt mit null zurecht', () => {
    expect(assessmentNavCount(counts({ unreleasedAssessments: 2, upcomingDrafts: 1 }))).toBe(3)
    expect(assessmentNavCount(EMPTY_TASK_COUNTS)).toBe(0)
  })
})
