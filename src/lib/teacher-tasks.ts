/**
 * „Zu erledigen“ auf der Startseite des Lehrkräfte-Bereichs (PROJ-81).
 * Reine Hilfen ohne Datenbank: aus den Zählern (siehe GET /api/admin/tasks)
 * werden Zeilen mit Satz, Ziel und Dringlichkeit gebaut.
 */

/** `null` = diese Quelle ließ sich nicht lesen und wird ausgeblendet */
export interface TaskCounts {
  /** gemeldete Fragen, die noch auf Prüfung warten (PROJ-73) */
  openReports: number | null
  /** beendete Nachweise mit Abgaben, deren Ergebnisse noch nicht freigegeben sind */
  unreleasedAssessments: number | null
  /** Nachweise im Entwurf mit Termin in den nächsten 7 Tagen */
  upcomingDrafts: number | null
  /** KI-/Import-Entwürfe von Fragen, die noch geprüft werden müssen (nur Admins) */
  draftQuestions: number | null
}

export type TaskId = 'upcomingDrafts' | 'openReports' | 'draftQuestions' | 'unreleasedAssessments'

export interface TaskEntry {
  id: TaskId
  count: number
  href: string
  text: string
}

export const EMPTY_TASK_COUNTS: TaskCounts = {
  openReports: null,
  unreleasedAssessments: null,
  upcomingDrafts: null,
  draftQuestions: null,
}

/** Reihenfolge nach Dringlichkeit: Termine zuerst, Freigaben zuletzt */
const ORDER: TaskId[] = ['upcomingDrafts', 'openReports', 'draftQuestions', 'unreleasedAssessments']

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

const SENTENCE: Record<TaskId, { href: string; text: (n: number) => string }> = {
  upcomingDrafts: {
    href: '/admin/leistungsnachweise',
    text: (n) =>
      `${n} ${plural(n, 'Nachweis im Entwurf hat', 'Nachweise im Entwurf haben')} in den nächsten 7 Tagen einen Termin`,
  },
  openReports: {
    href: '/admin/gemeldete-fragen',
    text: (n) => `${n} ${plural(n, 'gemeldete Frage wartet', 'gemeldete Fragen warten')} auf dich`,
  },
  draftQuestions: {
    href: '/admin/ai-generator',
    text: (n) => `${n} ${plural(n, 'Fragen-Entwurf wartet', 'Fragen-Entwürfe warten')} auf Prüfung`,
  },
  unreleasedAssessments: {
    href: '/admin/leistungsnachweise',
    text: (n) =>
      `${n} ${plural(n, 'Nachweis ist beendet', 'Nachweise sind beendet')}, die Ergebnisse sind noch nicht freigegeben`,
  },
}

/** Zeilen für die Karte: nur Quellen mit mindestens einem offenen Punkt, nach Dringlichkeit sortiert. */
export function buildTaskEntries(counts: TaskCounts): TaskEntry[] {
  return ORDER.flatMap((id) => {
    const count = counts[id]
    if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return []
    return [{ id, count, href: SENTENCE[id].href, text: SENTENCE[id].text(count) }]
  })
}

/** Zähler für die Seitenleiste: leer bei 0, „99+“ ab 100 */
export function formatTaskBadge(count: number | null | undefined): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return null
  return count >= 100 ? '99+' : String(Math.floor(count))
}

/** Antwort der Schnittstelle prüfen; fremde oder kaputte Antworten ergeben leere Zähler. */
export function parseTaskCounts(raw: unknown): TaskCounts {
  const counts = (raw as { counts?: Record<string, unknown> } | null)?.counts
  if (!counts || typeof counts !== 'object') return { ...EMPTY_TASK_COUNTS }
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
  return {
    openReports: num(counts.openReports),
    unreleasedAssessments: num(counts.unreleasedAssessments),
    upcomingDrafts: num(counts.upcomingDrafts),
    draftQuestions: num(counts.draftQuestions),
  }
}

/** Anzahl für den Seitenleisten-Eintrag „Leistungsnachweise“ */
export function assessmentNavCount(counts: TaskCounts): number {
  return (counts.unreleasedAssessments ?? 0) + (counts.upcomingDrafts ?? 0)
}
