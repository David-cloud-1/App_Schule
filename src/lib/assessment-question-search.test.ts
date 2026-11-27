import { describe, it, expect } from 'vitest'
import { buildFacets, lookupQuestions, searchQuestions, SEARCH_PAGE_SIZE } from './assessment-question-search'
import type { Candidate } from './assessment-suggest'

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
function cand(n: number, over: Partial<Candidate> = {}): Candidate {
  return {
    id: uid(n),
    question_text: `Frage ${n} zur Spedition`,
    topic: 'Thema A',
    class_level: 11,
    subject_codes: ['BGP'],
    isPrivate: false,
    attempts: 0,
    correct: 0,
    openReports: 0,
    blocked: false,
    level: 'mittel',
    rate: null,
    rated: false,
    ...over,
  }
}
const base = { text: '', subjects: [], topics: [], level: null, offset: 0 }

describe('searchQuestions (PROJ-133)', () => {
  it('liefert höchstens 25 Treffer und die Gesamtzahl', () => {
    const pool = Array.from({ length: 60 }, (_, i) => cand(i + 1))
    const r1 = searchQuestions(pool, base)
    expect(r1.items).toHaveLength(SEARCH_PAGE_SIZE)
    expect(r1.total).toBe(60)
    expect(r1.nextOffset).toBe(25)
    const r3 = searchQuestions(pool, { ...base, offset: 50 })
    expect(r3.items).toHaveLength(10)
    expect(r3.nextOffset).toBeNull()
  })

  it('ein leerer Pool ergibt keine Treffer', () => {
    expect(searchQuestions([], base)).toEqual({ items: [], total: 0, nextOffset: null })
  })

  it('jedes Suchwort muss in Text oder Thema vorkommen (ohne Groß/Klein)', () => {
    const pool = [cand(1), cand(2, { question_text: 'Was ist ein CMR-Frachtbrief?', topic: 'Straße' })]
    expect(searchQuestions(pool, { ...base, text: 'cmr frachtbrief' }).items.map((i) => i.id)).toEqual([uid(2)])
    expect(searchQuestions(pool, { ...base, text: 'straße cmr' }).total).toBe(1)
    expect(searchQuestions(pool, { ...base, text: 'cmr spedition' }).total).toBe(0)
  })

  it('filtert nach Fach, Thema und Schwierigkeit', () => {
    const pool = [
      cand(1),
      cand(2, { subject_codes: ['KSK'] }),
      cand(3, { topic: 'Thema B' }),
      cand(4, { level: 'schwer', rate: 20, rated: true }),
    ]
    expect(searchQuestions(pool, { ...base, subjects: ['KSK'] }).items.map((i) => i.id)).toEqual([uid(2)])
    expect(searchQuestions(pool, { ...base, topics: ['Thema B'] }).items.map((i) => i.id)).toEqual([uid(3)])
    expect(searchQuestions(pool, { ...base, level: 'schwer' }).items.map((i) => i.id)).toEqual([uid(4)])
  })

  it('gibt die Anzahl Antworten, aber nicht die Richtig-Zahl weiter', () => {
    const hit = searchQuestions([cand(1, { attempts: 40, correct: 30 })], base).items[0]
    expect(hit.attempts).toBe(40)
    expect(hit).not.toHaveProperty('correct')
  })
})

describe('lookupQuestions', () => {
  it('trennt gefundene und fehlende Fragen und ignoriert Doppelte', () => {
    const r = lookupQuestions([cand(1), cand(2)], [uid(1), uid(1), uid(9)])
    expect(r.items.map((i) => i.id)).toEqual([uid(1)])
    expect(r.missing).toEqual([uid(9)])
  })
})

describe('buildFacets', () => {
  it('sammelt Fächer, Stufen und Themen mit ihren Fächern und Stufen', () => {
    const f = buildFacets([
      cand(1),
      cand(2, { subject_codes: ['KSK'], topic: 'Thema B', class_level: 12 }),
      cand(3, { topic: null, class_level: null }),
    ])
    expect(f.subjects).toEqual(['BGP', 'KSK'])
    expect(f.classLevels).toEqual([11, 12])
    expect(f.topics).toEqual([
      { name: 'Thema A', subjects: ['BGP'], levels: [11] },
      { name: 'Thema B', subjects: ['KSK'], levels: [12] },
    ])
  })
})
