import { describe, it, expect } from 'vitest'
import { countBySubject, formatQuestionTotals, type CountableQuestionRow } from './question-count'
import { buildContentTree, countFor } from './content-tree'

const rows: CountableQuestionRow[] = [
  { topic_id: 't1', class_level: 10, is_active: true, question_subjects: [{ subject_id: 's1' }] },
  { topic_id: 't1', class_level: null, is_active: false, question_subjects: [{ subject_id: 's1' }] },
  { topic_id: null, class_level: 12, is_active: true, question_subjects: [{ subject_id: 's1' }, { subject_id: 's1' }] },
]

describe('Zählregel (PROJ-131, B35)', () => {
  it('Baum und Start (Fächer-Schnittstelle) zeigen für ein Fach dieselbe Zahl', () => {
    const tree = buildContentTree({
      subjects: [
        { id: 's1', name: 'BGP', code: 'BGP', is_active: true, department_id: 'd', version_number: 1, departments: null },
      ],
      topics: [{ id: 't1', name: 'x', subject_id: 's1', version_number: 1 }],
      questions: rows,
    })
    const treeSubject = tree.departments[0].subjects[0]
    const start = countBySubject(rows).get('s1')!
    expect(countFor(treeSubject.counts, 'all')).toBe(start.total)
    expect(countFor(treeSubject.hidden, 'all')).toBe(start.hidden)
    // Summe der Einträge unter dem Fach (Thema + Ohne Thema) ergibt das Fach
    expect(countFor(treeSubject.topics[0].counts, 'all') + countFor(treeSubject.no_topic, 'all')).toBe(start.total)
    expect(countFor(tree.counts, 'all')).toBe(start.total)
  })

  it('schreibt „davon N ausgeblendet“ nur, wenn es welche gibt', () => {
    expect(formatQuestionTotals({ total: 24, hidden: 3 })).toBe('24 Fragen, davon 3 ausgeblendet')
    expect(formatQuestionTotals({ total: 1, hidden: 0 })).toBe('1 Frage')
    expect(formatQuestionTotals({ total: 1445, hidden: 0 })).toBe('1.445 Fragen')
  })
})
