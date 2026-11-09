import { describe, it, expect } from 'vitest'
import {
  alternativesFor,
  buildSuggestion,
  estimateMinutes,
  levelFor,
  mixToCounts,
  summarize,
  MIX_PRESETS,
  type Candidate,
  type Level,
} from './assessment-suggest'

let n = 0
function cand(level: Level, topic: string | null = 'T1', over: Partial<Candidate> = {}): Candidate {
  n += 1
  return {
    id: `q${n}`,
    question_text: `Frage Nummer ${n} zum Thema ${topic} ${'x'.repeat(n)}`,
    topic,
    class_level: 11,
    subject_codes: ['BGP'],
    isPrivate: false,
    attempts: 50,
    correct: level === 'leicht' ? 45 : level === 'schwer' ? 10 : 30,
    openReports: 0,
    blocked: false,
    level,
    rate: level === 'leicht' ? 90 : level === 'schwer' ? 20 : 60,
    rated: true,
    ...over,
  }
}
const many = (level: Level, count: number, topic: string | null = 'T1') =>
  Array.from({ length: count }, () => cand(level, topic))
// deterministischer Zufall
function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

describe('levelFor', () => {
  it('stuft nach Lösungsquote ein', () => {
    expect(levelFor(20, 15)).toEqual({ level: 'leicht', rate: 75, rated: true })
    expect(levelFor(20, 14).level).toBe('mittel')
    expect(levelFor(100, 40).level).toBe('mittel')
    expect(levelFor(100, 39).level).toBe('schwer')
  })
  it('wertet zu wenige Antworten als mittel ohne Quote', () => {
    expect(levelFor(19, 19)).toEqual({ level: 'mittel', rate: null, rated: false })
    expect(levelFor(0, 0).rated).toBe(false)
  })
})

describe('mixToCounts', () => {
  it('ausgewogen bei 20 Fragen: 6/10/4', () => {
    expect(mixToCounts(20, MIX_PRESETS.ausgewogen)).toEqual({ leicht: 6, mittel: 10, schwer: 4 })
  })
  it('die Summe stimmt immer, Rest geht an die größte Nachkommastelle', () => {
    const c = mixToCounts(7, MIX_PRESETS.ausgewogen)
    expect(c.leicht + c.mittel + c.schwer).toBe(7)
    expect(c).toEqual({ leicht: 2, mittel: 4, schwer: 1 })
  })
  it('0 % bleibt 0, auch wenn Rest zu verteilen ist', () => {
    const c = mixToCounts(5, { leicht: 50, mittel: 0, schwer: 50 })
    expect(c.mittel).toBe(0)
    expect(c.leicht + c.schwer).toBe(5)
  })
  it('liefert Nullen ohne Anzahl oder Summe', () => {
    expect(mixToCounts(0, MIX_PRESETS.ausgewogen)).toEqual({ leicht: 0, mittel: 0, schwer: 0 })
    expect(mixToCounts(10, { leicht: 0, mittel: 0, schwer: 0 })).toEqual({ leicht: 0, mittel: 0, schwer: 0 })
  })
})

describe('buildSuggestion', () => {
  it('trifft Anzahl und Mix, wenn genug Fragen da sind', () => {
    const pool = [...many('leicht', 20, 'A'), ...many('mittel', 20, 'B'), ...many('schwer', 20, 'C')]
    const r = buildSuggestion(pool, { count: 20, mix: MIX_PRESETS.ausgewogen, fixed: [], preferNot: new Set(), random: seeded() })
    expect(r.items).toHaveLength(20)
    expect(r.shortages).toEqual([])
    expect(summarize(r.items).perLevel).toEqual({ leicht: 6, mittel: 10, schwer: 4 })
    expect(new Set(r.items.map((q) => q.id)).size).toBe(20)
  })

  it('meldet fehlende Fragen je Stufe und füllt nicht mit anderen Stufen auf', () => {
    const pool = [...many('leicht', 10, 'A'), ...many('mittel', 10, 'A'), ...many('schwer', 1, 'A')]
    const r = buildSuggestion(pool, { count: 20, mix: MIX_PRESETS.ausgewogen, fixed: [], preferNot: new Set(), random: seeded() })
    expect(r.shortages).toEqual([{ level: 'schwer', missing: 3 }])
    expect(r.items).toHaveLength(17)
    expect(r.items.filter((q) => q.level === 'schwer')).toHaveLength(1)
  })

  it('liefert bei leerem Pool nichts und nennt alle Fehlbeträge', () => {
    const r = buildSuggestion([], { count: 10, mix: MIX_PRESETS.ausgewogen, fixed: [], preferNot: new Set(), random: seeded() })
    expect(r.items).toEqual([])
    expect(r.shortages.reduce((s, x) => s + x.missing, 0)).toBe(10)
  })

  it('behält Fixierte, zählt sie zur Anzahl und doppelt sie nicht', () => {
    const pool = [...many('leicht', 10), ...many('mittel', 10), ...many('schwer', 10)]
    const fixed = [pool[0], pool[10]]
    const r = buildSuggestion(pool, { count: 10, mix: MIX_PRESETS.ausgewogen, fixed, preferNot: new Set(), random: seeded() })
    expect(r.items).toHaveLength(10)
    expect(r.items.slice(0, 2).map((q) => q.id)).toEqual([pool[0].id, pool[10].id])
    expect(new Set(r.items.map((q) => q.id)).size).toBe(10)
    expect(summarize(r.items).perLevel).toEqual({ leicht: 3, mittel: 5, schwer: 2 })
  })

  it('zieht nicht mehr als gewünscht, wenn Fixierte eine Stufe überfüllen', () => {
    const pool = [...many('leicht', 10), ...many('mittel', 10), ...many('schwer', 10)]
    const fixed = pool.slice(0, 8) // 8 leichte, Soll nur 3 bei 10 Fragen
    const r = buildSuggestion(pool, { count: 10, mix: MIX_PRESETS.ausgewogen, fixed, preferNot: new Set(), random: seeded() })
    expect(r.items).toHaveLength(10)
  })

  it('meidet beim Neu-Würfeln frühere Vorschläge, solange Alternativen da sind', () => {
    const pool = [...many('leicht', 10), ...many('mittel', 10), ...many('schwer', 10)]
    const first = buildSuggestion(pool, { count: 10, mix: MIX_PRESETS.ausgewogen, fixed: [], preferNot: new Set(), random: seeded(3) })
    const again = buildSuggestion(pool, {
      count: 10,
      mix: MIX_PRESETS.ausgewogen,
      fixed: [],
      preferNot: new Set(first.items.map((q) => q.id)),
      random: seeded(9),
    })
    const old = new Set(first.items.map((q) => q.id))
    expect(again.items.filter((q) => old.has(q.id))).toHaveLength(0)
  })

  it('greift auf frühere Vorschläge zurück, wenn es sonst zu wenige gäbe', () => {
    const pool = many('mittel', 5)
    const r = buildSuggestion(pool, {
      count: 5,
      mix: { leicht: 0, mittel: 100, schwer: 0 },
      fixed: [],
      preferNot: new Set(pool.map((q) => q.id)),
      random: seeded(),
    })
    expect(r.items).toHaveLength(5)
    expect(r.shortages).toEqual([])
  })

  it('verteilt reihum auf die Themen', () => {
    const pool = [...many('mittel', 10, 'A'), ...many('mittel', 10, 'B'), ...many('mittel', 10, 'C')]
    const r = buildSuggestion(pool, { count: 9, mix: { leicht: 0, mittel: 100, schwer: 0 }, fixed: [], preferNot: new Set(), random: seeded() })
    const per = summarize(r.items).perTopic
    expect(per.map((p) => p.count)).toEqual([3, 3, 3])
  })

  it('meidet Fast-Dubletten im selben Thema, soweit möglich', () => {
    const same = (suffix: string) => cand('mittel', 'A', { question_text: `Was ist ein Frachtbrief und wofür braucht man ihn? ${suffix}` })
    const pool = [same('a'), same('b'), same('c'), cand('mittel', 'A', { question_text: 'Wer haftet beim Transportschaden?' })]
    const r = buildSuggestion(pool, { count: 2, mix: { leicht: 0, mittel: 100, schwer: 0 }, fixed: [], preferNot: new Set(), random: seeded() })
    expect(r.items).toHaveLength(2)
    expect(r.items.some((q) => q.question_text.startsWith('Wer haftet'))).toBe(true)
  })

  it('nimmt Dubletten, wenn sonst zu wenig da wäre', () => {
    const same = (s: string) => cand('mittel', 'A', { question_text: `Was ist ein Frachtbrief und wofür braucht man ihn? ${s}` })
    const r = buildSuggestion([same('a'), same('b'), same('c')], {
      count: 3,
      mix: { leicht: 0, mittel: 100, schwer: 0 },
      fixed: [],
      preferNot: new Set(),
      random: seeded(),
    })
    expect(r.items).toHaveLength(3)
  })
})

describe('alternativesFor', () => {
  it('bietet höchstens 3 mit gleichem Thema und gleicher Stufe, ohne Ausgeschlossene', () => {
    const target = cand('schwer', 'A')
    const pool = [target, ...many('schwer', 6, 'A'), ...many('schwer', 3, 'B'), ...many('leicht', 3, 'A')]
    const exclude = new Set([pool[1].id])
    const alts = alternativesFor(target, pool, exclude, seeded())
    expect(alts).toHaveLength(3)
    for (const a of alts) {
      expect(a.topic).toBe('A')
      expect(a.level).toBe('schwer')
      expect(a.id).not.toBe(target.id)
      expect(exclude.has(a.id)).toBe(false)
    }
  })
  it('liefert weniger, wenn nicht mehr passen — ohne zu weiten', () => {
    const target = cand('mittel', 'A')
    const alts = alternativesFor(target, [target, cand('mittel', 'A'), cand('leicht', 'A')], new Set(), seeded())
    expect(alts).toHaveLength(1)
  })
})

describe('estimateMinutes / summarize', () => {
  it('rechnet lange Texte mit 1,5 und rundet auf', () => {
    const long = { question_text: 'x'.repeat(250) }
    const short = { question_text: 'kurz' }
    expect(estimateMinutes([short, short])).toBe(2)
    expect(estimateMinutes([long, short])).toBe(3) // 2,5 → 3
  })
  it('zählt Themen, Stufen und ungewertete Fragen', () => {
    const items = [cand('leicht', 'A'), cand('schwer', null), cand('mittel', 'A', { rated: false, rate: null })]
    const s = summarize(items)
    expect(s.perLevel).toEqual({ leicht: 1, mittel: 1, schwer: 1 })
    expect(s.perTopic).toEqual([
      { topic: 'A', count: 2 },
      { topic: 'Ohne Thema', count: 1 },
    ])
    expect(s.unrated).toBe(1)
  })
})
