import { berlinDay } from '@/lib/engagement-metrics'

/**
 * Sortieren und Aktivitäts-Filter der Nutzerliste (PROJ-57).
 * Reine Logik ohne React, damit Seite und Export (PROJ-61) dieselbe Reihenfolge nutzen.
 */

export type UserListRow = {
  display_name: string | null
  email: string | null
  department_name?: string | null
  total_xp: number
  current_streak: number
  last_session_date: string | null
  last_sign_in_at?: string | null
  banned: boolean
}

export const SORT_KEYS = ['name', 'email', 'department', 'xp', 'streak', 'session', 'login', 'status'] as const
export type SortKey = (typeof SORT_KEYS)[number]
export type SortDir = 'asc' | 'desc'

export const ACTIVITY_FILTERS = ['all', '7', '14', '30', 'never'] as const
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]

export const SORT_LABEL: Record<SortKey, string> = {
  name: 'Name',
  email: 'E-Mail',
  department: 'Bereich',
  xp: 'XP',
  streak: 'Streak',
  session: 'Letzte Session',
  login: 'Letzter Login',
  status: 'Status',
}

export const ACTIVITY_LABEL: Record<ActivityFilter, string> = {
  all: 'Alle Aktivitäten',
  '7': 'Seit 7 Tagen inaktiv',
  '14': 'Seit 14 Tagen inaktiv',
  '30': 'Seit 30 Tagen inaktiv',
  never: 'Nie eingeloggt',
}

export const DEFAULT_SORT: { key: SortKey; dir: SortDir } = { key: 'xp', dir: 'desc' }

/** Erster Klick: Texte A→Z, Zahlen und Daten mit dem höchsten bzw. neuesten Wert oben */
export function defaultDir(key: SortKey): SortDir {
  return key === 'name' || key === 'email' || key === 'department' || key === 'status' ? 'asc' : 'desc'
}

const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true })

type SortValue = string | number | null

function sortValue(row: UserListRow, key: SortKey): SortValue {
  switch (key) {
    case 'name':
      return row.display_name?.trim() || null
    case 'email':
      return row.email || null
    case 'department':
      return row.department_name || null
    case 'xp':
      return row.total_xp
    case 'streak':
      return row.current_streak
    case 'session':
      return row.last_session_date ? Date.parse(row.last_session_date) : null
    case 'login':
      return row.last_sign_in_at ? Date.parse(row.last_sign_in_at) : null
    case 'status':
      // Aktiv vor Gesperrt
      return row.banned ? 1 : 0
  }
}

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

/**
 * Sortiert eine Kopie der Liste. Leere Werte stehen in beiden Richtungen am Ende,
 * bei Gleichstand entscheidet der Name (A→Z), damit die Reihenfolge stabil bleibt.
 */
export function sortUsers<T extends UserListRow>(rows: readonly T[], key: SortKey, dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va === null || vb === null) {
      if (va !== vb) return va === null ? 1 : -1
    } else {
      const c = compareValues(va, vb)
      if (c !== 0) return c * sign
    }
    return collator.compare(a.display_name ?? '', b.display_name ?? '')
  })
}

/** Ganze Kalendertage zwischen zwei Berliner Tagesstempeln (YYYY-MM-DD) */
function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000)
}

/**
 * „Seit X Tagen inaktiv“: letzte Lern-Session liegt mehr als X Kalendertage
 * (Europe/Berlin) zurück oder fehlt ganz. „Nie eingeloggt“: kein einziger Login.
 */
export function matchesActivity(row: UserListRow, filter: ActivityFilter, now: Date = new Date()): boolean {
  if (filter === 'all') return true
  if (filter === 'never') return !row.last_sign_in_at
  if (!row.last_session_date) return true
  // last_session_date ist ein reines Datum (Berliner Tag); ein Zeitstempel wird auf den Tag gekürzt
  const lastDay = /^\d{4}-\d{2}-\d{2}$/.test(row.last_session_date)
    ? row.last_session_date
    : berlinDay(row.last_session_date)
  return daysBetween(lastDay, berlinDay(now)) > Number(filter)
}

function isOneOf<T extends string>(list: readonly T[], value: string | null): value is T {
  return value !== null && (list as readonly string[]).includes(value)
}

export type UserListView = { sort: SortKey; dir: SortDir; activity: ActivityFilter }

/** Liest Sortierung und Filter aus der Adresse; ungültige Werte fallen still auf den Standard zurück */
export function parseUserListParams(params: URLSearchParams): UserListView {
  const sortParam = params.get('sort')
  const sort = isOneOf(SORT_KEYS, sortParam) ? sortParam : DEFAULT_SORT.key
  const dirParam = params.get('dir')
  const dir = dirParam === 'asc' || dirParam === 'desc' ? dirParam : sort === DEFAULT_SORT.key ? DEFAULT_SORT.dir : defaultDir(sort)
  const activityParam = params.get('aktiv')
  const activity = isOneOf(ACTIVITY_FILTERS, activityParam) ? activityParam : 'all'
  return { sort, dir, activity }
}

/** Schreibt die Ansicht zurück in die Adresse; Standardwerte bleiben weg, damit sie kurz bleibt */
export function userListParams(view: UserListView, base: URLSearchParams = new URLSearchParams()): URLSearchParams {
  const params = new URLSearchParams(base)
  params.delete('sort')
  params.delete('dir')
  params.delete('aktiv')
  if (view.sort !== DEFAULT_SORT.key || view.dir !== DEFAULT_SORT.dir) {
    params.set('sort', view.sort)
    params.set('dir', view.dir)
  }
  if (view.activity !== 'all') params.set('aktiv', view.activity)
  return params
}
