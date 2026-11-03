import { z } from 'zod'

/**
 * Nutzer-Detailseite (PROJ-59): reine Hilfsfunktionen ohne Datenbankzugriff.
 * Die Schnittstellen und die Oberfläche teilen sich hier Regeln, Beschriftungen
 * und das Aufbereiten der Rohdaten.
 */

export const DISPLAY_NAME_MIN = 2
export const DISPLAY_NAME_MAX = 50

/** Anzeigename: getrimmt, 2 bis 50 Zeichen, keine Steuer- und Zeilenumbruch-Zeichen */
export const displayNameSchema = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN, `Der Name braucht mindestens ${DISPLAY_NAME_MIN} Zeichen.`)
  .max(DISPLAY_NAME_MAX, `Der Name darf höchstens ${DISPLAY_NAME_MAX} Zeichen haben.`)
  .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), 'Der Name enthält ungültige Zeichen.')

/** Protokoll-Einträge, die auf der Detailseite angelegt werden */
export const USER_ACTIONS = {
  rename: 'user.rename',
  emailChange: 'user.email_change',
  emailConfirm: 'user.email_confirm',
  progressReset: 'user.progress_reset',
} as const

/** Klartext für alle Protokoll-Einträge, die eine Person betreffen können */
export const USER_ACTION_LABEL: Record<string, string> = {
  'user.ban': 'Gesperrt',
  'user.unban': 'Entsperrt',
  'user.role_change': 'Rolle geändert',
  'user.move_department': 'Bereich gewechselt',
  'user.password_set': 'Passwort neu vergeben',
  'user.rename': 'Name geändert',
  'user.email_change': 'E-Mail geändert',
  'user.email_confirm': 'E-Mail als bestätigt markiert',
  'user.progress_reset': 'Fortschritt zurückgesetzt',
  'user.delete': 'Konto gelöscht',
}

export function userActionLabel(actionType: string): string {
  return USER_ACTION_LABEL[actionType] ?? actionType
}

/** Datum als JJJJ-MM-TT in der Zeitzone Europa/Berlin (wie bei Streak und Blitzrunde) */
export function berlinDateStr(date: Date): string {
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

export const ACTIVITY_DAYS = 30

export type ActivityDay = { date: string; learned: boolean }

/**
 * Kalenderstreifen: die letzten `days` Tage (ältester zuerst, heute zuletzt),
 * je Tag „gelernt“ oder „nicht gelernt“. `learnedDates` sind Berliner Daten.
 */
export function buildActivityStrip(
  learnedDates: Iterable<string>,
  now: Date = new Date(),
  days: number = ACTIVITY_DAYS,
): ActivityDay[] {
  const learned = new Set(learnedDates)
  const strip: ActivityDay[] = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = berlinDateStr(new Date(now.getTime() - offset * 86_400_000))
    strip.push({ date, learned: learned.has(date) })
  }
  return strip
}

export type SessionStatRow = {
  subject_id: string | null
  score: number
  total: number
  completed_at: string
}

export type SubjectStat = {
  subjectId: string | null
  name: string
  answered: number
  correct: number
  /** Trefferquote in ganzen Prozent */
  percent: number
  lastLearnedAt: string | null
}

export const MIXED_SUBJECT_NAME = 'Gemischt'

/**
 * Lernstand je Fach aus den Lern-Sessions. Sessions ohne Fach (gemischte Runde)
 * stehen unter „Gemischt“. Fächer ohne beantwortete Fragen entfallen; die
 * Reihenfolge: meiste Antworten zuerst.
 */
export function aggregateSubjectStats(rows: SessionStatRow[], names: Map<string, string>): SubjectStat[] {
  const byKey = new Map<string, SubjectStat>()
  for (const row of rows) {
    const key = row.subject_id ?? '__mixed__'
    const entry =
      byKey.get(key) ??
      ({
        subjectId: row.subject_id,
        name: row.subject_id ? (names.get(row.subject_id) ?? 'Unbekanntes Fach') : MIXED_SUBJECT_NAME,
        answered: 0,
        correct: 0,
        percent: 0,
        lastLearnedAt: null,
      } satisfies SubjectStat)
    entry.answered += row.total
    entry.correct += row.score
    if (!entry.lastLearnedAt || row.completed_at > entry.lastLearnedAt) entry.lastLearnedAt = row.completed_at
    byKey.set(key, entry)
  }
  return [...byKey.values()]
    .filter((s) => s.answered > 0)
    .map((s) => ({ ...s, percent: Math.round((s.correct / s.answered) * 100) }))
    .sort((a, b) => b.answered - a.answered)
}

/** Bezeichnung, die man zur Bestätigung eintippen muss: Anzeigename, sonst E-Mail */
export function resetConfirmLabel(displayName: string | null, email: string | null): string {
  return (displayName?.trim() || email?.trim() || '').trim()
}

/** Stimmt die getippte Bestätigung mit dem Namen überein? (Leerraum außen egal, sonst genau) */
export function resetConfirmationMatches(typed: unknown, label: string): boolean {
  return typeof typed === 'string' && label.length > 0 && typed.trim() === label
}

/** Rohdaten-Tabellen, die „Fortschritt zurücksetzen“ leert (Reihenfolge: abhängige zuerst) */
export const RESET_TABLES = [
  'quiz_answers',
  'quiz_sessions',
  'user_badges',
  'blitz_rounds',
  'blitz_starts',
  'betrieb_platzierungen',
  'user_shop_items',
] as const

export type UserSectionKey = 'overview' | 'learning' | 'badges' | 'assessments' | 'log'

export const USER_SECTION_KEYS: readonly UserSectionKey[] = ['overview', 'learning', 'badges', 'assessments', 'log']

export function isUserSectionKey(value: string): value is UserSectionKey {
  return (USER_SECTION_KEYS as readonly string[]).includes(value)
}
