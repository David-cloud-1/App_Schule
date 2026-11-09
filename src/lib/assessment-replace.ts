import { dupKey, LEVELS, type Candidate, type Level } from '@/lib/assessment-suggest'

/** Die Frage, die ersetzt werden soll (kann schon aus dem Pool verschwunden sein) */
export interface ReplaceTarget {
  id: string
  topic: string | null
  level: Level
  question_text?: string
}

export const MAX_REPLACEMENTS = 5

function levelDistance(a: Level, b: Level): number {
  return Math.abs(LEVELS.indexOf(a) - LEVELS.indexOf(b))
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Alle passenden Ersatzfragen, beste zuerst: gleiches Thema, dann nächstliegende Stufe, innerhalb zufällig */
function rankedReplacements(
  target: ReplaceTarget,
  pool: Candidate[],
  exclude: Set<string>,
  random: () => number,
): Candidate[] {
  const sameTopic = pool.filter(
    (c) => c.id !== target.id && !exclude.has(c.id) && (c.topic ?? '') === (target.topic ?? ''),
  )
  const byDistance = new Map<number, Candidate[]>()
  for (const c of sameTopic) {
    const d = levelDistance(c.level, target.level)
    byDistance.set(d, [...(byDistance.get(d) ?? []), c])
  }
  const ranked = [...byDistance.keys()]
    .sort((a, b) => a - b)
    .flatMap((d) => shuffled(byDistance.get(d) ?? [], random))
  // Fast-Dubletten (gleicher Textanfang im selben Thema) nur einmal anbieten
  const seen = new Set<string>(target.question_text ? [dupKey({ topic: target.topic, question_text: target.question_text })] : [])
  return ranked.filter((c) => {
    const k = dupKey(c)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Bis zu `n` Ersatzvorschläge für eine Frage (PROJ-79) */
export function replacementsFor(
  target: ReplaceTarget,
  pool: Candidate[],
  exclude: Set<string>,
  random: () => number,
  n = MAX_REPLACEMENTS,
): Candidate[] {
  return rankedReplacements(target, pool, exclude, random).slice(0, n)
}

export interface ReplacementPlanItem {
  targetId: string
  replacement: Candidate | null
}

/**
 * „Alle auffälligen ersetzen“: für jede Frage der beste Ersatz, kein Ersatz doppelt.
 * Wer wenige Kandidaten hat, wird zuerst bedient, damit ihm niemand den einzigen Ersatz wegnimmt.
 */
export function planBulkReplacement(
  targets: ReplaceTarget[],
  pool: Candidate[],
  exclude: Set<string>,
  random: () => number,
): ReplacementPlanItem[] {
  const used = new Set<string>()
  const order = targets
    .map((t, index) => ({ t, index, options: rankedReplacements(t, pool, exclude, random).length }))
    .sort((a, b) => a.options - b.options || a.index - b.index)
  const picked = new Map<string, Candidate | null>()
  for (const { t } of order) {
    const best = rankedReplacements(t, pool, new Set([...exclude, ...used]), random)[0] ?? null
    if (best) used.add(best.id)
    picked.set(t.id, best)
  }
  return targets.map((t) => ({ targetId: t.id, replacement: picked.get(t.id) ?? null }))
}
