/**
 * Lernbibliothek (PROJ-43): Fortschritt pro Fach und Thema, Themenpfad nach
 * Klassenstufe, „Weiter hier“ und die gemerkte Klassenstufe. Reine Funktionen,
 * damit sie ohne Seite testbar sind.
 */

/** Ab diesem Anteil richtig beantworteter Fragen gilt ein Thema als gemeistert */
export const MASTERY_PERCENT = 80

/** Cookie mit der gewählten Klassenstufe („10“ … oder leer = Alle) */
export const CLASS_LEVEL_COOKIE = 'lern_klasse'

export interface LearnQuestion {
  id: string
  subjectId: string
  topicId: string | null
  classLevel: number | null
}

export type TopicState = 'neu' | 'angefangen' | 'gemeistert'

export interface TopicRow {
  id: string
  name: string
  /** Klassenstufe der Gruppe, in der das Thema steht (null = ohne Klassenstufe) */
  classLevel: number | null
  total: number
  percent: number
  state: TopicState
  isNext: boolean
}

export interface TopicGroup {
  classLevel: number | null
  topics: TopicRow[]
}

/** Gespeicherte Klassenstufe → Zahl; alles Unbekannte zählt als „Alle“ (null). */
export function parseClassLevel(value: string | undefined | null, allowed: number[]): number | null {
  if (!value) return null
  const level = Number(value)
  return allowed.includes(level) ? level : null
}

/** Wie das Quiz: eine Klassenstufe umfasst auch Fragen ohne Klassenstufe. */
export function matchesClassLevel(question: Pick<LearnQuestion, 'classLevel'>, level: number | null): boolean {
  return level === null || question.classLevel === level || question.classLevel === null
}

/** Anteil (0–100, gerundet) der Fragen, die schon einmal richtig beantwortet wurden. */
export function correctPercent(questionIds: string[], correctIds: Set<string>): number {
  if (questionIds.length === 0) return 0
  const correct = questionIds.filter((id) => correctIds.has(id)).length
  return Math.round((correct / questionIds.length) * 100)
}

export function subjectProgress(
  questions: LearnQuestion[],
  subjectId: string,
  level: number | null,
  correctIds: Set<string>,
): { total: number; percent: number } {
  const ids = questions.filter((q) => q.subjectId === subjectId && matchesClassLevel(q, level)).map((q) => q.id)
  return { total: ids.length, percent: correctPercent(ids, correctIds) }
}

export function topicState(questionIds: string[], answeredIds: Set<string>, correctIds: Set<string>): TopicState {
  if (questionIds.length > 0 && correctPercent(questionIds, correctIds) >= MASTERY_PERCENT) return 'gemeistert'
  return questionIds.some((id) => answeredIds.has(id)) ? 'angefangen' : 'neu'
}

const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

/** „Teil 2“ vor „Teil 10“, Groß-/Kleinschreibung egal */
export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b)
}

/**
 * Themenpfad eines Fachs: Gruppen je Klassenstufe (aufsteigend, ohne
 * Klassenstufe zuletzt), darin die Themen natürlich sortiert. Ein Thema mit
 * Fragen aus mehreren Klassenstufen erscheint in jeder davon. Fragen ohne
 * Klassenstufe zählen in jeder Gruppe ihres Themas mit, wie beim Quiz.
 */
export function buildTopicPath(input: {
  questions: LearnQuestion[]
  topics: { id: string; name: string }[]
  level: number | null
  answeredIds: Set<string>
  correctIds: Set<string>
  /** Thema der letzten Themen-Runde in diesem Fach (null = keine) */
  lastTopicId: string | null
}): TopicGroup[] {
  const { questions, topics, level, answeredIds, correctIds, lastTopicId } = input
  const names = new Map(topics.map((t) => [t.id, t.name]))

  const byTopic = new Map<string, LearnQuestion[]>()
  for (const q of questions) {
    if (!q.topicId || !names.has(q.topicId)) continue
    const list = byTopic.get(q.topicId) ?? []
    list.push(q)
    byTopic.set(q.topicId, list)
  }

  const groups = new Map<number | null, TopicRow[]>()
  for (const [topicId, topicQuestions] of byTopic) {
    const levels = new Set(topicQuestions.map((q) => q.classLevel).filter((l): l is number => l !== null))
    const groupLevels: (number | null)[] =
      level !== null ? (levels.has(level) || levels.size === 0 ? [level] : []) : levels.size > 0 ? [...levels] : [null]

    for (const groupLevel of groupLevels) {
      const ids = topicQuestions.filter((q) => matchesClassLevel(q, groupLevel)).map((q) => q.id)
      if (ids.length === 0) continue
      const rows = groups.get(groupLevel) ?? []
      rows.push({
        id: topicId,
        name: names.get(topicId)!,
        classLevel: groupLevel,
        total: ids.length,
        percent: correctPercent(ids, correctIds),
        state: topicState(ids, answeredIds, correctIds),
        isNext: false,
      })
      groups.set(groupLevel, rows)
    }
  }

  const ordered: TopicGroup[] = [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a - b))
    .map(([classLevel, rows]) => ({ classLevel, topics: rows.sort((x, y) => naturalCompare(x.name, y.name)) }))

  markNext(ordered, lastTopicId)
  return ordered
}

/**
 * „Weiter hier“: das zuletzt gelernte, noch nicht gemeisterte Thema; sonst das
 * erste angefangene, sonst das erste neue. Alles gemeistert → keine Markierung.
 */
function markNext(groups: TopicGroup[], lastTopicId: string | null) {
  const rows = groups.flatMap((g) => g.topics)
  const next =
    (lastTopicId && rows.find((r) => r.id === lastTopicId && r.state !== 'gemeistert')) ||
    rows.find((r) => r.state === 'angefangen') ||
    rows.find((r) => r.state === 'neu')
  if (next) next.isNext = true
}

/** Quiz-Adresse einer Lernrunde (Fach, optional Klassenstufe und Thema) */
export function quizHref(opts: { subjectId?: string; classLevel?: number | null; topicId?: string | null }): string {
  const params = new URLSearchParams()
  if (opts.subjectId) params.set('subject', opts.subjectId)
  if (opts.classLevel) params.set('class_level', String(opts.classLevel))
  if (opts.topicId) params.set('topic', opts.topicId)
  const query = params.toString()
  return query ? `/quiz?${query}` : '/quiz'
}

/** Adresse der Fachseite: Kürzel klein geschrieben */
export function subjectPageHref(code: string): string {
  return `/subjects/${encodeURIComponent(code.toLowerCase())}`
}
