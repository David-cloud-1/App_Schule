import { describe, it, expect } from 'vitest'
import { buildContentTree, countFor, emptyCounts, levelLabel, totalsFor } from './content-tree'

const dept = { id: 'd1', name: 'Spedition', code: 'SPED' }
const subject = (id: string, code: string) => ({
  id,
  name: code,
  code,
  is_active: true,
  department_id: 'd1',
  version_number: 1,
  departments: dept,
})

describe('buildContentTree', () => {
  it('zählt Fragen je Fach, Thema und Klassenstufe', () => {
    const tree = buildContentTree({
      subjects: [subject('s1', 'KSK')],
      topics: [
        { id: 't1', name: 'Kosten', subject_id: 's1', version_number: 1 },
        { id: 't2', name: 'Leer', subject_id: 's1', version_number: 1 },
      ],
      questions: [
        { topic_id: 't1', class_level: 10, is_active: true, question_subjects: [{ subject_id: 's1' }] },
        { topic_id: 't1', class_level: 11, is_active: true, question_subjects: [{ subject_id: 's1' }] },
        { topic_id: null, class_level: null, is_active: true, question_subjects: [{ subject_id: 's1' }] },
      ],
    })
    const s = tree.departments[0].subjects[0]
    expect(countFor(s.counts, 'all')).toBe(3)
    expect(countFor(s.no_topic, 'all')).toBe(1)
    expect(countFor(s.topics[0].counts, 'all')).toBe(2)
    expect(countFor(s.topics[0].counts, 10)).toBe(1)
    expect(countFor(s.topics[0].counts, 12)).toBe(0)
    expect(countFor(s.topics[1].counts, 'all')).toBe(0)
  })

  it('zählt eine Frage mit mehreren Fächern in jedem Fach, aber je Fach nur einmal', () => {
    const tree = buildContentTree({
      subjects: [subject('s1', 'KSK'), subject('s2', 'BGP')],
      topics: [],
      questions: [
        { topic_id: null, class_level: 10, is_active: true, question_subjects: [{ subject_id: 's1' }, { subject_id: 's2' }, { subject_id: 's2' }] },
      ],
    })
    const [a, b] = tree.departments[0].subjects
    expect(countFor(a.counts, 'all')).toBe(1)
    expect(countFor(b.counts, 'all')).toBe(1)
  })

  it('ignoriert Fächer und Themen außerhalb des Bereichs', () => {
    const tree = buildContentTree({
      subjects: [subject('s1', 'KSK')],
      topics: [{ id: 'tx', name: 'Fremd', subject_id: 'unbekannt', version_number: 1 }],
      questions: [{ topic_id: 'tx', class_level: 10, is_active: true, question_subjects: [{ subject_id: 'unbekannt' }] }],
    })
    expect(tree.departments[0].subjects[0].topics).toHaveLength(0)
    expect(countFor(tree.departments[0].subjects[0].counts, 'all')).toBe(0)
  })

  it('gruppiert Fächer nach Bereich', () => {
    const tree = buildContentTree({
      subjects: [
        subject('s1', 'KSK'),
        { ...subject('s2', 'KSK'), department_id: 'd2', departments: { id: 'd2', name: 'Tourismus', code: 'TOUR' } },
      ],
      topics: [],
      questions: [],
    })
    expect(tree.departments.map((d) => d.code)).toEqual(['SPED', 'TOUR'])
  })
})

describe('countFor', () => {
  it('Alle zählt auch Fragen ohne Stufe, ein Filter nicht', () => {
    const c = { ...emptyCounts(), l11: 2, none: 3 }
    expect(countFor(c, 'all')).toBe(5)
    expect(countFor(c, 11)).toBe(2)
  })
})

import { resolveSelection, topicVisible, NO_TOPIC } from './content-tree'

describe('resolveSelection', () => {
  const tree = buildContentTree({
    subjects: [subject('s1', 'KSK')],
    topics: [
      { id: 't1', name: 'Kosten', subject_id: 's1', version_number: 1 },
      { id: 't2', name: 'Leer', subject_id: 's1', version_number: 1 },
    ],
    questions: [
      { topic_id: 't1', class_level: 10, is_active: true, question_subjects: [{ subject_id: 's1' }] },
      { topic_id: null, class_level: 11, is_active: true, question_subjects: [{ subject_id: 's1' }] },
    ],
  })

  it('findet Fach, Thema und „Ohne Thema“', () => {
    expect(resolveSelection(tree, { subjectId: 's1', topicId: null }, 'all').kind).toBe('subject')
    expect(resolveSelection(tree, { subjectId: 's1', topicId: 't1' }, 'all').kind).toBe('topic')
    expect(resolveSelection(tree, { subjectId: 's1', topicId: NO_TOPIC }, 'all').kind).toBe('notopic')
  })

  it('ohne Auswahl ist „Alle Fächer“ gewählt; Unbekanntes führt dorthin zurück (PROJ-131)', () => {
    expect(resolveSelection(tree, { subjectId: null, topicId: null }, 'all')).toEqual({ kind: 'all' })
    expect(resolveSelection(tree, { subjectId: 'x', topicId: null }, 'all')).toEqual({ kind: 'all', reason: 'missing' })
    expect(resolveSelection(tree, { subjectId: 's1', topicId: 'weg' }, 'all')).toEqual({ kind: 'all', reason: 'missing' })
  })

  it('fällt aufs Fach zurück, wenn der Klassenfilter das Thema ausblendet', () => {
    expect(topicVisible(tree.departments[0].subjects[0].topics[0], 11)).toBe(false)
    expect(resolveSelection(tree, { subjectId: 's1', topicId: 't1' }, 11)).toMatchObject({
      kind: 'subject',
      reason: 'hidden',
    })
    expect(resolveSelection(tree, { subjectId: 's1', topicId: NO_TOPIC }, 10)).toMatchObject({
      kind: 'subject',
      reason: 'hidden',
    })
  })
})

describe('„Alle Fächer“ und ausgeblendete Fragen (PROJ-131)', () => {
  const tree = buildContentTree({
    subjects: [subject('s1', 'KSK'), subject('s2', 'BGP')],
    topics: [{ id: 't1', name: 'Kosten', subject_id: 's1', version_number: 1 }],
    questions: [
      { topic_id: 't1', class_level: 10, is_active: false, question_subjects: [{ subject_id: 's1' }] },
      { topic_id: null, class_level: 11, is_active: true, question_subjects: [{ subject_id: 's1' }, { subject_id: 's2' }] },
    ],
  })

  it('zählt eine Frage in zwei Fächern bei „Alle Fächer“ nur einmal', () => {
    expect(countFor(tree.counts, 'all')).toBe(2)
    expect(countFor(tree.hidden, 'all')).toBe(1)
  })

  it('zählt ausgeblendete Fragen mit und nennt sie', () => {
    const s = tree.departments[0].subjects[0]
    expect(totalsFor(s, 'all')).toEqual({ total: 2, hidden: 1 })
    expect(totalsFor(s.topics[0], 'all')).toEqual({ total: 1, hidden: 1 })
    expect(totalsFor({ counts: s.no_topic, hidden: s.no_topic_hidden }, 'all')).toEqual({ total: 1, hidden: 0 })
  })

  it('nennt die Stufen eines Themas in einer Zeile', () => {
    expect(levelLabel(tree.departments[0].subjects[0].counts)).toBe('Stufe 10, 11')
    expect(levelLabel(emptyCounts())).toBe('')
  })
})
