/**
 * PROJ-78: Nachweis-Vorschlag nach Thema, Anzahl und Schwierigkeit.
 * Reine Rechenlogik ohne Datenbank: Die Schwierigkeit kommt aus der Lösungsquote
 * im freien Üben (PROJ-74), die Auswahl ist regelbasiert (kein KI-Aufruf).
 */

export type Level = 'leicht' | 'mittel' | 'schwer'
export const LEVELS: Level[] = ['leicht', 'mittel', 'schwer']
export type Mix = Record<Level, number>

/** Ab so vielen Antworten gilt die Lösungsquote als belastbar; darunter zählt die Frage als „mittel“ */
export const MIN_RATED_ATTEMPTS = 20
/** Lösungsquote in Prozent: ab 75 leicht, unter 40 schwer */
export const EASY_FROM = 75
export const HARD_BELOW = 40

export const MIN_COUNT = 5
export const MAX_COUNT = 60

export const MIX_PRESETS = {
  ausgewogen: { leicht: 30, mittel: 50, schwer: 20 },
  leichter: { leicht: 50, mittel: 40, schwer: 10 },
  schwerer: { leicht: 10, mittel: 40, schwer: 50 },
} as const satisfies Record<string, Mix>
export type MixPreset = keyof typeof MIX_PRESETS

/** Eine wählbare Frage samt Kennzahlen für den Vorschlag */
export interface Candidate {
  id: string
  question_text: string
  topic: string | null
  class_level: number | null
  subject_codes: string[]
  isPrivate: boolean
  attempts: number
  correct: number
  openReports: number
  blocked: boolean
  /** abgeleitet aus Antworten, siehe levelFor */
  level: Level
  /** Lösungsquote in Prozent, null wenn nicht belastbar */
  rate: number | null
  /** false = zu wenige Antworten, als „mittel“ eingestuft */
  rated: boolean
}

export function levelFor(attempts: number, correct: number): { level: Level; rate: number | null; rated: boolean } {
  if (attempts < MIN_RATED_ATTEMPTS) return { level: 'mittel', rate: null, rated: false }
  const rate = Math.round((correct / attempts) * 100)
  const level: Level = rate >= EASY_FROM ? 'leicht' : rate < HARD_BELOW ? 'schwer' : 'mittel'
  return { level, rate, rated: true }
}

export function mixSum(mix: Mix): number {
  return mix.leicht + mix.mittel + mix.schwer
}

/**
 * Prozent-Verteilung in Stückzahlen. Größter-Rest-Verfahren, damit die Summe
 * immer genau `total` ergibt; bei Gleichstand bekommt „mittel“ den Rest zuerst.
 */
export function mixToCounts(total: number, mix: Mix): Record<Level, number> {
  const sum = mixSum(mix)
  const counts: Record<Level, number> = { leicht: 0, mittel: 0, schwer: 0 }
  if (total <= 0 || sum <= 0) return counts
  const order: Level[] = ['mittel', 'leicht', 'schwer']
  const exact = Object.fromEntries(LEVELS.map((l) => [l, (total * mix[l]) / sum])) as Record<Level, number>
  for (const l of LEVELS) counts[l] = Math.floor(exact[l])
  let rest = total - LEVELS.reduce((s, l) => s + counts[l], 0)
  const byRemainder = [...order].sort((a, b) => exact[b] - Math.floor(exact[b]) - (exact[a] - Math.floor(exact[a])))
  for (let i = 0; rest > 0; i = (i + 1) % byRemainder.length) {
    counts[byRemainder[i]] += 1
    rest -= 1
  }
  return counts
}

function shuffle<T>(list: T[], random: () => number): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Fast-Dubletten: gleiches Thema und gleicher Textanfang */
export function dupKey(q: Pick<Candidate, 'topic' | 'question_text'>): string {
  const start = q.question_text.toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim().slice(0, 40)
  return `${q.topic ?? ''}|${start}`
}

export interface Shortage {
  level: Level
  missing: number
}

export interface SuggestOptions {
  count: number
  mix: Mix
  /** bleiben erhalten (Schloss bzw. bereits gewählte Fragen) und zählen zur Anzahl */
  fixed: Candidate[]
  /** weich: werden nur gezogen, wenn es sonst zu wenig gibt (z. B. beim Neu-Würfeln) */
  preferNot: Set<string>
  random: () => number
}

export interface Suggestion {
  /** Fixierte zuerst, dann die neu gezogenen */
  items: Candidate[]
  shortages: Shortage[]
}

/**
 * Zieht pro Stufe zufällig und verteilt dabei reihum auf die Themen.
 * Reihenfolge der Versuche: frisch ohne Dublette, bekannt ohne Dublette,
 * frisch mit Dublette, bekannt mit Dublette.
 */
function drawLevel(
  cands: Candidate[],
  n: number,
  preferNot: Set<string>,
  taken: Set<string>,
  dupKeys: Set<string>,
  random: () => number,
): Candidate[] {
  const out: Candidate[] = []
  const fresh = cands.filter((c) => !preferNot.has(c.id))
  const stale = cands.filter((c) => preferNot.has(c.id))
  const passes: [Candidate[], boolean][] = [
    [fresh, false],
    [stale, false],
    [fresh, true],
    [stale, true],
  ]
  for (const [list, allowDup] of passes) {
    if (out.length >= n) break
    const groups = new Map<string, Candidate[]>()
    for (const c of list) {
      if (taken.has(c.id)) continue
      const key = c.topic ?? ''
      groups.set(key, [...(groups.get(key) ?? []), c])
    }
    const queues = shuffle([...groups.values()], random).map((g) => shuffle(g, random))
    let progressed = true
    while (out.length < n && progressed) {
      progressed = false
      for (const queue of queues) {
        while (queue.length > 0) {
          const c = queue.shift()!
          if (taken.has(c.id)) continue
          const k = dupKey(c)
          if (!allowDup && dupKeys.has(k)) continue
          taken.add(c.id)
          dupKeys.add(k)
          out.push(c)
          progressed = true
          break
        }
        if (out.length >= n) break
      }
    }
  }
  return out
}

/**
 * Baut den Vorschlag aus dem bereits gefilterten Pool. Es wird nie mit Fragen
 * aufgefüllt, die den Filtern widersprechen — fehlt etwas, steht es in `shortages`.
 */
export function buildSuggestion(pool: Candidate[], opts: SuggestOptions): Suggestion {
  const count = Math.max(0, Math.min(MAX_COUNT, Math.floor(opts.count)))
  const fixedIds = new Set(opts.fixed.map((f) => f.id))
  const target = mixToCounts(count, opts.mix)
  const need: Record<Level, number> = { leicht: 0, mittel: 0, schwer: 0 }
  for (const l of LEVELS) {
    need[l] = Math.max(0, target[l] - opts.fixed.filter((f) => f.level === l).length)
  }
  // Waren Fixierte in einer Stufe über dem Soll, ist der Rest sonst zu groß
  let remaining = Math.max(0, count - opts.fixed.length)
  let over = LEVELS.reduce((s, l) => s + need[l], 0) - remaining
  while (over > 0) {
    const biggest = [...LEVELS].sort((a, b) => need[b] - need[a])[0]
    need[biggest] -= 1
    over -= 1
  }
  remaining = LEVELS.reduce((s, l) => s + need[l], 0)

  const taken = new Set(fixedIds)
  const dupKeys = new Set(opts.fixed.map(dupKey))
  const items: Candidate[] = [...opts.fixed]
  const shortages: Shortage[] = []
  for (const l of LEVELS) {
    if (need[l] === 0) continue
    const drawn = drawLevel(
      pool.filter((c) => c.level === l && !fixedIds.has(c.id)),
      need[l],
      opts.preferNot,
      taken,
      dupKeys,
      opts.random,
    )
    items.push(...drawn)
    if (drawn.length < need[l]) shortages.push({ level: l, missing: need[l] - drawn.length })
  }
  return { items, shortages }
}

/** Bis zu `n` Tauschkandidaten: gleiches Thema, gleiche Stufe, nicht in `excludeIds` */
export function alternativesFor(
  target: Candidate,
  pool: Candidate[],
  excludeIds: Set<string>,
  random: () => number,
  n = 3,
): Candidate[] {
  const same = pool.filter(
    (c) => c.id !== target.id && !excludeIds.has(c.id) && c.level === target.level && (c.topic ?? '') === (target.topic ?? ''),
  )
  const seen = new Set<string>([dupKey(target)])
  const out: Candidate[] = []
  for (const c of shuffle(same, random)) {
    if (out.length >= n) break
    const k = dupKey(c)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

/** Fragen mit langem Text brauchen länger (Bilder gibt es bei Nachweis-Fragen nicht) */
export const LONG_TEXT_CHARS = 200
export const MINUTES_PER_QUESTION = 1
export const LONG_FACTOR = 1.5

export function estimateMinutes(items: Pick<Candidate, 'question_text'>[]): number {
  const total = items.reduce((s, q) => s + MINUTES_PER_QUESTION * (q.question_text.length > LONG_TEXT_CHARS ? LONG_FACTOR : 1), 0)
  return Math.ceil(total)
}

export interface SuggestionSummary {
  perLevel: Record<Level, number>
  perTopic: { topic: string; count: number }[]
  minutes: number
  /** Fragen, die mangels Antworten als „mittel“ gelten */
  unrated: number
}

export function summarize(items: Candidate[]): SuggestionSummary {
  const perLevel: Record<Level, number> = { leicht: 0, mittel: 0, schwer: 0 }
  const topics = new Map<string, number>()
  for (const q of items) {
    perLevel[q.level] += 1
    const t = q.topic ?? 'Ohne Thema'
    topics.set(t, (topics.get(t) ?? 0) + 1)
  }
  return {
    perLevel,
    perTopic: [...topics.entries()].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, 'de')),
    minutes: estimateMinutes(items),
    unrated: items.filter((q) => !q.rated).length,
  }
}
