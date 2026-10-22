/**
 * Reine Rechenfunktionen für den „Heute“-Screen (PROJ-42) und die
 * Wochenaktivität im Profil (PROJ-41). Alle Tage gelten nach deutscher Zeit.
 */

export const DAILY_GOAL = 10

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const DAY_MS = 86_400_000

/** YYYY-MM-DD in Europe/Berlin */
export function toBerlinDateStr(date: Date): string {
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

/** Mittag (UTC) eines Kalendertags — liegt in Berlin sicher auf demselben Tag. */
function noonUtc(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`)
}

export interface WeekDay {
  dateStr: string
  label: string
  learned: boolean
  isToday: boolean
  isFuture: boolean
}

/** Laufende Kalenderwoche Mo–So mit den Lerntagen. */
export function buildCurrentWeek(now: Date, learnedDates: Set<string>): WeekDay[] {
  const today = toBerlinDateStr(now)
  const todayNoon = noonUtc(today)
  const mondayOffset = (todayNoon.getUTCDay() + 6) % 7
  const monday = todayNoon.getTime() - mondayOffset * DAY_MS

  return WEEKDAY_LABELS.map((label, i) => {
    const dateStr = new Date(monday + i * DAY_MS).toISOString().slice(0, 10)
    return {
      dateStr,
      label,
      learned: learnedDates.has(dateStr),
      isToday: dateStr === today,
      isFuture: dateStr > today,
    }
  })
}

/** Die letzten 7 Tage bis heute (Format der bestehenden Wochenaktivitäts-Karte). */
export function buildLast7Days(now: Date, learnedDates: Set<string>) {
  const todayNoon = noonUtc(toBerlinDateStr(now)).getTime()
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(todayNoon - (6 - i) * DAY_MS)
    const dateStr = date.toISOString().slice(0, 10)
    return { date, dateStr, learned: learnedDates.has(dateStr), isToday: i === 6 }
  })
}

/** Heute (Berlin) beantwortete Fragen. */
export function countAnsweredToday(answers: { answered_at: string }[], now: Date): number {
  const today = toBerlinDateStr(now)
  return answers.filter((a) => toBerlinDateStr(new Date(a.answered_at)) === today).length
}

export interface ContinueTarget {
  subjectId: string
  subjectCode: string
  /** null = ganzes Fach (die letzte Runde war themenübergreifend) */
  topicId: string | null
}

/**
 * Ziel für „Weiterlernen“: Fach der letzten Runde; das Thema nur, wenn alle
 * Fragen dieser Runde aus demselben Thema stammten (= Themen-Runde).
 * null, wenn es keine Runde gibt oder das Fach nicht (mehr) zum Bereich gehört.
 */
export function pickContinueTarget(
  lastSubjectId: string | null,
  sessionTopicIds: (string | null)[],
  departmentSubjects: { id: string; code: string }[],
): ContinueTarget | null {
  if (!lastSubjectId) return null
  const subject = departmentSubjects.find((s) => s.id === lastSubjectId)
  if (!subject) return null

  const distinct = new Set(sessionTopicIds)
  const onlyTopic = distinct.size === 1 ? [...distinct][0] : null
  return { subjectId: subject.id, subjectCode: subject.code, topicId: onlyTopic ?? null }
}

/** Quiz-Adresse für ein Weiterlernen-Ziel. */
export function continueHref(target: ContinueTarget): string {
  const params = new URLSearchParams({ subject: target.subjectId })
  if (target.topicId) params.set('topic', target.topicId)
  return `/quiz?${params.toString()}`
}
