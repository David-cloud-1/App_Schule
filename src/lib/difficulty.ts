/**
 * PROJ-74: Auswertung „Was fällt allen schwer?“ – reine Rechenlogik.
 * Die Datenbank liefert je Frage Summen (question_difficulty_stats); hier wird
 * gefiltert, gerankt, zu Themen zusammengefasst und die Ampel bestimmt.
 * Keine Personendaten.
 */
export interface DifficultyRow {
  question_id: string
  question_text: string
  class_level: number | null
  topic_id: string | null
  topic_name: string | null
  subject_id: string
  subject_name: string
  department_id: string | null
  attempts: number
  correct: number
  top_wrong_option_text: string | null
  top_wrong_count: number
  open_reports: number
  last_changed_at: string | null
  first_counted_at: string | null
}

export const DEFAULT_MIN_ATTEMPTS = 20
export const MIN_ATTEMPTS_LOWEST = 5
export const NO_TOPIC_KEY = 'ohne-thema'

/** Lösungsquote in Prozent (0–100), null ohne Antworten */
export function solveRate(correct: number, attempts: number): number | null {
  return attempts > 0 ? Math.round((correct / attempts) * 100) : null
}

/** Anteil der häufigsten falschen Antwort an allen Antworten, in Prozent */
export function topWrongShare(row: Pick<DifficultyRow, 'attempts' | 'top_wrong_count'>): number | null {
  return row.attempts > 0 && row.top_wrong_count > 0 ? Math.round((row.top_wrong_count / row.attempts) * 100) : null
}

/** „Antwort prüfen“: Eine falsche Antwort wurde häufiger gewählt als die richtige */
export function needsAnswerCheck(row: Pick<DifficultyRow, 'correct' | 'top_wrong_count'>): boolean {
  return row.top_wrong_count > row.correct
}

/** Wurde die Frage geändert, nachdem schon Antworten gezählt wurden? */
export function changedAfterAnswers(row: Pick<DifficultyRow, 'last_changed_at' | 'first_counted_at'>): boolean {
  if (!row.last_changed_at || !row.first_counted_at) return false
  return new Date(row.last_changed_at).getTime() > new Date(row.first_counted_at).getTime()
}

export interface DifficultyFilter {
  subjectId?: string | null
  topicKey?: string | null
}

export function filterRows(rows: DifficultyRow[], f: DifficultyFilter): DifficultyRow[] {
  return rows.filter((r) => {
    if (f.subjectId && r.subject_id !== f.subjectId) return false
    if (f.topicKey && (r.topic_id ?? NO_TOPIC_KEY) !== f.topicKey) return false
    return true
  })
}

/** Niedrigste Quote zuerst; bei Gleichstand mehr Antworten zuerst */
function byRate(a: { correct: number; attempts: number }, b: { correct: number; attempts: number }): number {
  const ra = a.attempts > 0 ? a.correct / a.attempts : 1
  const rb = b.attempts > 0 ? b.correct / b.attempts : 1
  return ra - rb || b.attempts - a.attempts
}

export interface RankedQuestions {
  ranked: DifficultyRow[]
  tooFew: DifficultyRow[]
}

export function rankQuestions(rows: DifficultyRow[], minAttempts: number): RankedQuestions {
  const withAnswers = rows.filter((r) => r.attempts > 0)
  return {
    ranked: withAnswers.filter((r) => r.attempts >= minAttempts).sort(byRate),
    tooFew: withAnswers.filter((r) => r.attempts < minAttempts).sort((a, b) => b.attempts - a.attempts),
  }
}

export interface TopicStat {
  key: string
  topic_id: string | null
  name: string
  subject_name: string
  attempts: number
  correct: number
  questions: number
  questionsWithAnswers: number
}

export interface RankedTopics {
  ranked: TopicStat[]
  tooFew: TopicStat[]
}

export function rankTopics(rows: DifficultyRow[], minAttempts: number): RankedTopics {
  const map = new Map<string, TopicStat>()
  for (const r of rows) {
    const key = r.topic_id ?? NO_TOPIC_KEY
    const mapKey = `${key}|${r.subject_id}`
    let t = map.get(mapKey)
    if (!t) {
      t = {
        key,
        topic_id: r.topic_id,
        name: r.topic_name ?? 'Ohne Thema',
        subject_name: r.subject_name,
        attempts: 0,
        correct: 0,
        questions: 0,
        questionsWithAnswers: 0,
      }
      map.set(mapKey, t)
    }
    t.attempts += r.attempts
    t.correct += r.correct
    t.questions += 1
    if (r.attempts > 0) t.questionsWithAnswers += 1
  }
  const all = [...map.values()].filter((t) => t.attempts > 0)
  return {
    ranked: all.filter((t) => t.attempts >= minAttempts).sort(byRate),
    tooFew: all.filter((t) => t.attempts < minAttempts).sort((a, b) => b.attempts - a.attempts),
  }
}

/** Suchlink in die Fragenliste (wie in der Meldungs-Inbox) */
export function questionSearchLink(text: string): string {
  const q = text.replace(/[,()%*]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  return `/admin/questions?q=${encodeURIComponent(q)}`
}
