import { describe, it, expect } from 'vitest'
import {
  buildTopicPath,
  correctPercent,
  matchesClassLevel,
  naturalCompare,
  parseClassLevel,
  quizHref,
  subjectPageHref,
  subjectProgress,
  topicState,
  type LearnQuestion,
} from './learn-library'

const q = (id: string, topicId: string | null, classLevel: number | null, subjectId = 'stg'): LearnQuestion => ({
  id,
  subjectId,
  topicId,
  classLevel,
})

describe('parseClassLevel', () => {
  it('nimmt nur Klassenstufen des Bereichs', () => {
    expect(parseClassLevel('10', [10, 11, 12])).toBe(10)
    expect(parseClassLevel('13', [10, 11, 12])).toBeNull()
    expect(parseClassLevel('abc', [10])).toBeNull()
    expect(parseClassLevel('', [10])).toBeNull()
    expect(parseClassLevel(undefined, [10])).toBeNull()
  })
})

describe('matchesClassLevel', () => {
  it('zählt Fragen ohne Klassenstufe in jeder Klassenstufe mit', () => {
    expect(matchesClassLevel({ classLevel: null }, 10)).toBe(true)
    expect(matchesClassLevel({ classLevel: 11 }, 10)).toBe(false)
    expect(matchesClassLevel({ classLevel: 11 }, null)).toBe(true)
  })
})

describe('correctPercent & subjectProgress', () => {
  it('rundet und liefert 0 ohne Fragen', () => {
    expect(correctPercent([], new Set())).toBe(0)
    expect(correctPercent(['a', 'b', 'c'], new Set(['a']))).toBe(33)
  })

  it('filtert nach Fach und Klassenstufe', () => {
    const questions = [q('a', 't1', 10), q('b', 't1', 11), q('c', null, null), q('d', 'x', 10, 'ksk')]
    const correct = new Set(['a', 'd'])
    expect(subjectProgress(questions, 'stg', null, correct)).toEqual({ total: 3, percent: 33 })
    expect(subjectProgress(questions, 'stg', 10, correct)).toEqual({ total: 2, percent: 50 })
    expect(subjectProgress(questions, 'stg', 12, correct)).toEqual({ total: 1, percent: 0 })
  })
})

describe('topicState', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']
  it('neu, angefangen, gemeistert ab 80 %', () => {
    expect(topicState(ids, new Set(), new Set())).toBe('neu')
    expect(topicState(ids, new Set(['a']), new Set())).toBe('angefangen')
    expect(topicState(ids, new Set(['a', 'b', 'c']), new Set(['a', 'b', 'c']))).toBe('angefangen')
    expect(topicState(ids, new Set(ids), new Set(['a', 'b', 'c', 'd']))).toBe('gemeistert')
  })
})

describe('naturalCompare', () => {
  it('sortiert Zahlen als Zahlen und ignoriert Großschreibung', () => {
    const sorted = ['LKW Teil 10', 'lkw Teil 2', 'Heft 1', 'LKW Teil 1'].sort(naturalCompare)
    expect(sorted).toEqual(['Heft 1', 'LKW Teil 1', 'lkw Teil 2', 'LKW Teil 10'])
  })
})

describe('buildTopicPath', () => {
  const topics = [
    { id: 't2', name: 'Teil 2' },
    { id: 't10', name: 'Teil 10' },
    { id: 't1', name: 'Teil 1' },
    { id: 'mix', name: 'Gemischtes Thema' },
  ]
  const questions = [
    q('a', 't1', 10),
    q('b', 't1', 10),
    q('c', 't2', 10),
    q('d', 't10', 10),
    q('e', 'mix', 10),
    q('f', 'mix', 11),
    q('g', null, null),
  ]

  it('gruppiert bei „Alle“ nach Klassenstufe und sortiert natürlich', () => {
    const groups = buildTopicPath({ questions, topics, level: null, answeredIds: new Set(), correctIds: new Set(), lastTopicId: null })
    expect(groups.map((g) => g.classLevel)).toEqual([10, 11])
    expect(groups[0].topics.map((t) => t.name)).toEqual(['Gemischtes Thema', 'Teil 1', 'Teil 2', 'Teil 10'])
    expect(groups[1].topics.map((t) => t.id)).toEqual(['mix'])
    expect(groups[0].topics.find((t) => t.id === 'mix')!.total).toBe(1)
  })

  it('zeigt bei gewählter Klassenstufe nur diese Gruppe', () => {
    const groups = buildTopicPath({ questions, topics, level: 11, answeredIds: new Set(), correctIds: new Set(), lastTopicId: null })
    expect(groups).toHaveLength(1)
    expect(groups[0].classLevel).toBe(11)
    expect(groups[0].topics.map((t) => t.id)).toEqual(['mix'])
  })

  it('lässt unbekannte Themen und Fragen ohne Thema weg', () => {
    const groups = buildTopicPath({
      questions: [...questions, q('z', 'geloescht', 10)],
      topics,
      level: 10,
      answeredIds: new Set(),
      correctIds: new Set(),
      lastTopicId: null,
    })
    expect(groups[0].topics.map((t) => t.id)).not.toContain('geloescht')
  })

  it('Thema nur mit Fragen ohne Klassenstufe landet zuletzt', () => {
    const groups = buildTopicPath({
      questions: [q('a', 't1', 10), q('x', 't2', null)],
      topics,
      level: null,
      answeredIds: new Set(),
      correctIds: new Set(),
      lastTopicId: null,
    })
    expect(groups.map((g) => g.classLevel)).toEqual([10, null])
  })

  it('markiert das letzte, nicht gemeisterte Thema als „Weiter hier“', () => {
    const groups = buildTopicPath({
      questions,
      topics,
      level: 10,
      answeredIds: new Set(['a', 'c']),
      correctIds: new Set(),
      lastTopicId: 't2',
    })
    const next = groups.flatMap((g) => g.topics).filter((t) => t.isNext)
    expect(next.map((t) => t.id)).toEqual(['t2'])
  })

  it('fällt auf das erste angefangene, dann das erste neue Thema zurück', () => {
    const mastered = buildTopicPath({
      questions,
      topics,
      level: 10,
      answeredIds: new Set(['a', 'b', 'd']),
      correctIds: new Set(['a', 'b']),
      lastTopicId: 't1', // gemeistert → zählt nicht
    })
    expect(mastered[0].topics.find((t) => t.isNext)!.id).toBe('t10')

    const fresh = buildTopicPath({ questions, topics, level: 10, answeredIds: new Set(), correctIds: new Set(), lastTopicId: null })
    expect(fresh[0].topics.find((t) => t.isNext)!.name).toBe('Gemischtes Thema')
  })

  it('setzt keine Markierung, wenn alles gemeistert ist', () => {
    const all = new Set(questions.map((x) => x.id))
    const groups = buildTopicPath({ questions, topics, level: null, answeredIds: all, correctIds: all, lastTopicId: 't1' })
    expect(groups.flatMap((g) => g.topics).some((t) => t.isNext)).toBe(false)
  })
})

describe('Adressen', () => {
  it('baut Quiz- und Fachseiten-Adressen', () => {
    expect(quizHref({})).toBe('/quiz')
    expect(quizHref({ classLevel: 10 })).toBe('/quiz?class_level=10')
    expect(quizHref({ subjectId: 's', classLevel: 11, topicId: 't' })).toBe('/quiz?subject=s&class_level=11&topic=t')
    expect(subjectPageHref('STG')).toBe('/subjects/stg')
  })
})
