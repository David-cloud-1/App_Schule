import { describe, expect, it } from 'vitest'
import { planBulkReplacement, replacementsFor } from './assessment-replace'
import type { Candidate } from './assessment-suggest'

let n = 0
function cand(over: Partial<Candidate> = {}): Candidate {
  n++
  return {
    id: `q${n}`,
    question_text: `Eigener Fragetext Nummer ${n} mit genug Länge`,
    topic: 'A',
    class_level: 11,
    subject_codes: ['BGP'],
    isPrivate: false,
    attempts: 30,
    correct: 15,
    openReports: 0,
    blocked: false,
    level: 'mittel',
    rate: 50,
    rated: true,
    ...over,
  }
}
const first = () => 0

describe('replacementsFor', () => {
  it('nimmt nur das gleiche Thema und bevorzugt die gleiche Stufe', () => {
    const pool = [
      cand({ id: 'schwer', level: 'schwer' }),
      cand({ id: 'mittel', level: 'mittel' }),
      cand({ id: 'leicht', level: 'leicht' }),
      cand({ id: 'fremd', topic: 'B' }),
    ]
    const r = replacementsFor({ id: 'x', topic: 'A', level: 'mittel' }, pool, new Set(), first)
    expect(r.map((c) => c.id)[0]).toBe('mittel')
    expect(r.map((c) => c.id)).not.toContain('fremd')
    expect(r).toHaveLength(3)
  })
  it('lässt ausgeschlossene und die Frage selbst weg, höchstens 5', () => {
    const pool = Array.from({ length: 9 }, (_, i) => cand({ id: `p${i}` }))
    const r = replacementsFor({ id: 'p0', topic: 'A', level: 'mittel' }, pool, new Set(['p1']), first)
    expect(r).toHaveLength(5)
    expect(r.map((c) => c.id)).not.toContain('p0')
    expect(r.map((c) => c.id)).not.toContain('p1')
  })
  it('bietet Fast-Dubletten nur einmal an', () => {
    const text = 'Gleicher Textanfang bei beiden Fragen, danach verschieden'
    const pool = [cand({ id: 'a', question_text: text + ' 1' }), cand({ id: 'b', question_text: text + ' 2' })]
    expect(replacementsFor({ id: 'x', topic: 'A', level: 'mittel' }, pool, new Set(), first)).toHaveLength(1)
  })
  it('liefert nichts, wenn das Thema leer gespielt ist', () => {
    expect(replacementsFor({ id: 'x', topic: 'Z', level: 'leicht' }, [cand()], new Set(), first)).toEqual([])
  })
})

describe('planBulkReplacement', () => {
  it('vergibt keinen Ersatz doppelt', () => {
    const pool = [cand({ id: 'e1' }), cand({ id: 'e2' })]
    const plan = planBulkReplacement(
      [
        { id: 't1', topic: 'A', level: 'mittel' },
        { id: 't2', topic: 'A', level: 'mittel' },
        { id: 't3', topic: 'A', level: 'mittel' },
      ],
      pool,
      new Set(),
      first,
    )
    const ids = plan.map((p) => p.replacement?.id).filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
    expect(plan.filter((p) => p.replacement === null)).toHaveLength(1)
    expect(plan.map((p) => p.targetId)).toEqual(['t1', 't2', 't3'])
  })
  it('bedient zuerst, wer wenig Auswahl hat', () => {
    const pool = [cand({ id: 'nurA', topic: 'A' }), cand({ id: 'a2', topic: 'A' }), cand({ id: 'b1', topic: 'B' })]
    const plan = planBulkReplacement(
      [
        { id: 'tA', topic: 'A', level: 'mittel' },
        { id: 'tB', topic: 'B', level: 'mittel' },
      ],
      pool,
      new Set(),
      first,
    )
    expect(plan.find((p) => p.targetId === 'tB')?.replacement?.id).toBe('b1')
    expect(plan.find((p) => p.targetId === 'tA')?.replacement).not.toBeNull()
  })
})
