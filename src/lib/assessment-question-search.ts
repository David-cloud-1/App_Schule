/**
 * PROJ-133: Fragen-Suche für Schritt 2 („Prüfen“). Reine Rechenlogik ohne
 * Datenbank: filtert die zulässigen Fragen eines Bereichs und liefert höchstens
 * eine Seite von 25 Treffern. Den Pool liefert `loadCandidates`.
 */
import type { Candidate, Level } from '@/lib/assessment-suggest'

export const SEARCH_PAGE_SIZE = 25
export const MAX_LOOKUP_IDS = 60

export type QuestionSearchParams = {
  /** Suchwort: jedes Wort muss im Fragetext oder im Thema vorkommen */
  text: string
  subjects: string[]
  topics: string[]
  level: Level | null
  offset: number
}

/** Was die Oberfläche je Treffer braucht (schlank, ohne Rohzahlen) */
export type SearchHit = {
  id: string
  question_text: string
  topic: string | null
  class_level: number | null
  subject_codes: string[]
  level: Level
  rate: number | null
  isPrivate: boolean
  blocked: boolean
  openReports: number
}

export type QuestionSearchResult = {
  items: SearchHit[]
  /** Treffer insgesamt, nicht nur auf dieser Seite */
  total: number
  /** Offset der nächsten Seite, null wenn nichts mehr kommt */
  nextOffset: number | null
}

export function toHit(c: Candidate): SearchHit {
  return {
    id: c.id,
    question_text: c.question_text,
    topic: c.topic,
    class_level: c.class_level,
    subject_codes: c.subject_codes,
    level: c.level,
    rate: c.rate,
    isPrivate: c.isPrivate,
    blocked: c.blocked,
    openReports: c.openReports,
  }
}

export function searchQuestions(pool: Candidate[], params: QuestionSearchParams): QuestionSearchResult {
  const words = params.text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const subjects = new Set(params.subjects)
  const topics = new Set(params.topics)

  const matches = pool.filter((q) => {
    if (subjects.size > 0 && !q.subject_codes.some((c) => subjects.has(c))) return false
    if (topics.size > 0 && !(q.topic && topics.has(q.topic))) return false
    if (params.level && q.level !== params.level) return false
    if (words.length > 0) {
      const haystack = `${q.question_text} ${q.topic ?? ''}`.toLowerCase()
      if (!words.every((w) => haystack.includes(w))) return false
    }
    return true
  })

  const start = Math.max(0, params.offset)
  const page = matches.slice(start, start + SEARCH_PAGE_SIZE)
  const end = start + page.length
  return {
    items: page.map(toHit),
    total: matches.length,
    nextOffset: end < matches.length ? end : null,
  }
}

/** Fragen per Nummer nachladen (z. B. Übergabe aus „Schwierig“); unbekannte Nummern kommen als `missing` zurück */
export function lookupQuestions(pool: Candidate[], ids: string[]): { items: SearchHit[]; missing: string[] } {
  const byId = new Map(pool.map((q) => [q.id, q]))
  const unique = [...new Set(ids)]
  const items: SearchHit[] = []
  const missing: string[] = []
  for (const id of unique) {
    const q = byId.get(id)
    if (q) items.push(toHit(q))
    else missing.push(id)
  }
  return { items, missing }
}
