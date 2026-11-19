import { KALENDER_ABTEILUNGEN, type AbteilungId } from '@/lib/kalender'

/**
 * Abwesenheitskalender (PROJ-120) — Typen und reine Hilfsfunktionen.
 *
 * Alle Daten sind Kalendertage als „JJJJ-MM-TT“-Text (deutsche Ortszeit, ohne
 * Zeitstempel). Gerechnet wird in UTC, damit weder Zeitzone noch Zeitumstellung
 * einen Tag verschieben können.
 */

export const ABSENCE_HREF = '/admin/kalender'
export const ABSENCE_API = '/api/admin/kalender'
export const ABSENCE_LIST_PAGE = 499

/** Abteilungen aus der gemeinsamen Quelle `kalender.ts` (Kennung, Kürzel, Name) */
export const DEPARTMENTS = KALENDER_ABTEILUNGEN.map((a) => ({ code: a.id, short: a.kurz, name: a.name }))

export type AbsenceDepartment = AbteilungId
export type DepartmentFilter = 'alle' | AbsenceDepartment
export type SubstituteStatus = 'open' | 'entered' | 'not_needed'
export type SubstituteFilter = 'alle' | 'open' | 'entered'
export type CalendarView = 'month' | 'week' | 'list'

/** Farben der Arten: Namen der `ws-*`-Tokens, keine freien Farbwerte */
export type AbsenceColor = 'green' | 'blue' | 'orange' | 'red' | 'gold' | 'faint'

export interface AbsenceType {
  id: string
  name: string
  color: AbsenceColor
  /** Name eines Symbols aus `absence-icons` */
  icon: string
  /** „Sonstige Abwesenheit“: zeigt das optionale Freitextfeld */
  hasFreeText: boolean
  active: boolean
  /** Feste Art („Sonstige Abwesenheit“): nicht deaktivierbar */
  fixed: boolean
}

export interface Absence {
  id: string
  personId: string
  personName: string
  createdById: string
  createdByName: string
  typeId: string
  typeName: string
  typeColor: AbsenceColor
  typeIcon: string
  dateFrom: string
  dateTo: string
  allDay: boolean
  timeFrom: string | null
  timeTo: string | null
  allDepartments: boolean
  departments: AbsenceDepartment[]
  freeText: string | null
  note: string | null
  substituteStatus: SubstituteStatus
  statusSetByName: string | null
  statusSetAt: string | null
  changedAfterSubstitute: boolean
  /** Gelöscht, obwohl die Vertretung schon eingetragen war: Planer müssen sie zurücknehmen. */
  cancelledAt: string | null
  cancelledByName: string | null
  version: number
  updatedAt: string
  updatedByName: string | null
  /** Vom Server berechnet: betroffene Person, Ersteller, Planer, Super-Admin */
  canEdit: boolean
}

export interface TeacherOption {
  id: string
  name: string
}

export const NOTE_MAX = 300
export const RANGE_MAX_DAYS = 365

/* ---------------------------------------------------------------- Datum */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function toUtc(iso: string): number {
  const m = ISO_RE.exec(iso)
  if (!m) return NaN
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function isIsoDate(value: string): boolean {
  return Number.isFinite(toUtc(value)) && fromUtc(toUtc(value)) === value
}

export function addDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * 86_400_000)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

/** Heute in deutscher Ortszeit, unabhängig von der Zeitzone des Geräts */
export function todayIso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return parts
}

/** 0 = Montag … 6 = Sonntag */
export function weekdayIndex(iso: string): number {
  return (new Date(toUtc(iso)).getUTCDay() + 6) % 7
}

export function isWeekend(iso: string): boolean {
  return weekdayIndex(iso) >= 5
}

export function weekStart(iso: string): string {
  return addDays(iso, -weekdayIndex(iso))
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function addMonths(iso: string, months: number): string {
  const y = Number(iso.slice(0, 4))
  const m = Number(iso.slice(5, 7)) - 1 + months
  return fromUtc(Date.UTC(y, m, 1))
}

/** Die sechs Wochen (42 Tage), die den Monat im Raster zeigen, Montag zuerst */
export function monthGrid(anchor: string): string[] {
  const first = weekStart(monthStart(anchor))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

export function weekDays(anchor: string): string[] {
  const first = weekStart(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

/** Sichtbarer Zeitraum je Ansicht (für die Abfrage an den Server) */
export function visibleRange(view: CalendarView, anchor: string): { from: string; to: string } {
  if (view === 'week') {
    const days = weekDays(anchor)
    return { from: days[0], to: days[6] }
  }
  if (view === 'month') {
    const grid = monthGrid(anchor)
    return { from: grid[0], to: grid[41] }
  }
  // Liste: der gewählte Monat, Einträge werden seitenweise nachgeladen
  const first = monthStart(anchor)
  return { from: first, to: addDays(addMonths(first, 1), -1) }
}

export function shiftAnchor(view: CalendarView, anchor: string, direction: 1 | -1): string {
  if (view === 'week') return addDays(anchor, 7 * direction)
  return addMonths(monthStart(anchor), direction)
}

const dateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
const dayMonthFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const monthFmt = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const longDayFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(toUtc(iso)))
}

export function formatLongDay(iso: string): string {
  return longDayFmt.format(new Date(toUtc(iso)))
}

export function periodTitle(view: CalendarView, anchor: string): string {
  if (view === 'week') {
    const days = weekDays(anchor)
    return `${dayMonthFmt.format(new Date(toUtc(days[0])))} – ${dateFmt.format(new Date(toUtc(days[6])))}`
  }
  return monthFmt.format(new Date(toUtc(anchor)))
}

/** „24.–25.11.2026“, „24.11.2026“, „24.11., 08:00–12:00 Uhr“ */
export function formatRange(a: Pick<Absence, 'dateFrom' | 'dateTo' | 'allDay' | 'timeFrom' | 'timeTo'>): string {
  const sameDay = a.dateFrom === a.dateTo
  const days = sameDay
    ? formatDate(a.dateFrom)
    : `${dayMonthFmt.format(new Date(toUtc(a.dateFrom)))} – ${formatDate(a.dateTo)}`
  if (a.allDay || !a.timeFrom || !a.timeTo) return days
  return `${days}, ${a.timeFrom}–${a.timeTo} Uhr`
}

/* --------------------------------------------------------------- Filter */

export function coversDay(a: Pick<Absence, 'dateFrom' | 'dateTo'>, day: string): boolean {
  return a.dateFrom <= day && day <= a.dateTo
}

export function overlaps(
  a: Pick<Absence, 'dateFrom' | 'dateTo'>,
  b: Pick<Absence, 'dateFrom' | 'dateTo'>,
): boolean {
  return a.dateFrom <= b.dateTo && b.dateFrom <= a.dateTo
}

/** Abteilungsfilter: Einträge dieser Abteilung und Einträge für „alle Abteilungen“ */
export function matchesDepartment(a: Pick<Absence, 'allDepartments' | 'departments'>, filter: DepartmentFilter): boolean {
  if (filter === 'alle') return true
  return a.allDepartments || a.departments.includes(filter)
}

export function matchesSubstitute(
  a: Pick<Absence, 'substituteStatus'> & { cancelledAt?: string | null },
  filter: SubstituteFilter,
): boolean {
  if (filter === 'alle') return true
  // Stornierte Einträge brauchen noch eine Handlung der Planer → zählen als „offen“
  if (filter === 'open') return a.substituteStatus === 'open' || !!a.cancelledAt
  if (a.cancelledAt) return false
  return a.substituteStatus === 'entered' || a.substituteStatus === 'not_needed'
}

export interface AbsenceFilters {
  department: DepartmentFilter
  substitute: SubstituteFilter
  typeId: string | 'alle'
  search: string
}

export const DEFAULT_FILTERS: AbsenceFilters = { department: 'alle', substitute: 'alle', typeId: 'alle', search: '' }

export function applyFilters(items: Absence[], f: AbsenceFilters): Absence[] {
  const q = f.search.trim().toLocaleLowerCase('de-DE')
  return items.filter(
    (a) =>
      matchesDepartment(a, f.department) &&
      matchesSubstitute(a, f.substitute) &&
      (f.typeId === 'alle' || a.typeId === f.typeId) &&
      (!q || a.personName.toLocaleLowerCase('de-DE').includes(q)),
  )
}

export function sortAbsences(items: Absence[]): Absence[] {
  return [...items].sort(
    (a, b) =>
      a.dateFrom.localeCompare(b.dateFrom) ||
      (a.timeFrom ?? '').localeCompare(b.timeFrom ?? '') ||
      a.personName.localeCompare(b.personName, 'de'),
  )
}

export function absencesOnDay(items: Absence[], day: string): Absence[] {
  return sortAbsences(items.filter((a) => coversDay(a, day)))
}

/** Liste nach Starttag gruppiert (Agenda-Ansicht) */
export function groupByStartDay(items: Absence[]): { day: string; items: Absence[] }[] {
  const groups = new Map<string, Absence[]>()
  for (const a of sortAbsences(items)) {
    const list = groups.get(a.dateFrom)
    if (list) list.push(a)
    else groups.set(a.dateFrom, [a])
  }
  return [...groups.entries()].map(([day, list]) => ({ day, items: list }))
}

export function departmentLabel(a: Pick<Absence, 'allDepartments' | 'departments'>): string {
  if (a.allDepartments) return 'Alle'
  return DEPARTMENTS.filter((d) => a.departments.includes(d.code))
    .map((d) => d.short)
    .join(', ')
}

export function substituteLabel(status: SubstituteStatus): string {
  if (status === 'entered') return 'In Untis erfasst'
  if (status === 'not_needed') return 'Keine Vertretung nötig'
  return 'Vertretung offen'
}

/* ------------------------------------------------------------- Formular */

export interface AbsenceFormValues {
  personId: string
  typeId: string
  dateFrom: string
  dateTo: string
  allDay: boolean
  timeFrom: string
  timeTo: string
  allDepartments: boolean
  departments: AbsenceDepartment[]
  freeText: string
  note: string
}

export type AbsenceFormErrors = Partial<Record<keyof AbsenceFormValues, string>>

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Prüft das Formular; Fehlertexte stehen am jeweiligen Feld */
export function validateAbsenceForm(v: AbsenceFormValues): AbsenceFormErrors {
  const errors: AbsenceFormErrors = {}
  if (!v.personId) errors.personId = 'Bitte eine Person wählen.'
  if (!v.typeId) errors.typeId = 'Bitte eine Art wählen.'
  if (!isIsoDate(v.dateFrom)) errors.dateFrom = 'Bitte ein Startdatum angeben.'
  if (!isIsoDate(v.dateTo)) errors.dateTo = 'Bitte ein Enddatum angeben.'
  if (!errors.dateFrom && !errors.dateTo) {
    if (v.dateTo < v.dateFrom) errors.dateTo = 'Das Ende darf nicht vor dem Beginn liegen.'
    else if (daysBetween(v.dateFrom, v.dateTo) + 1 > RANGE_MAX_DAYS)
      errors.dateTo = `Ein Eintrag kann höchstens ${RANGE_MAX_DAYS} Tage umfassen.`
  }
  if (!v.allDay) {
    if (!TIME_RE.test(v.timeFrom)) errors.timeFrom = 'Bitte eine Uhrzeit angeben.'
    if (!TIME_RE.test(v.timeTo)) errors.timeTo = 'Bitte eine Uhrzeit angeben.'
    if (!errors.timeFrom && !errors.timeTo && !errors.dateFrom && !errors.dateTo) {
      // Bei eintägigen Einträgen muss das Ende nach dem Beginn liegen
      if (v.dateFrom === v.dateTo && v.timeTo <= v.timeFrom) errors.timeTo = 'Die Endzeit muss nach der Startzeit liegen.'
    }
  }
  if (!v.allDepartments && v.departments.length === 0)
    errors.departments = 'Bitte mindestens eine Abteilung oder „Alle Abteilungen“ wählen.'
  if (v.freeText.length > NOTE_MAX) errors.freeText = `Höchstens ${NOTE_MAX} Zeichen.`
  if (v.note.length > NOTE_MAX) errors.note = `Höchstens ${NOTE_MAX} Zeichen.`
  return errors
}

export function emptyForm(personId: string, day: string, typeId = ''): AbsenceFormValues {
  return {
    personId,
    typeId,
    dateFrom: day,
    dateTo: day,
    allDay: true,
    timeFrom: '08:00',
    timeTo: '12:00',
    allDepartments: false,
    departments: [],
    freeText: '',
    note: '',
  }
}

export function formFromAbsence(a: Absence): AbsenceFormValues {
  return {
    personId: a.personId,
    typeId: a.typeId,
    dateFrom: a.dateFrom,
    dateTo: a.dateTo,
    allDay: a.allDay,
    timeFrom: a.timeFrom ?? '08:00',
    timeTo: a.timeTo ?? '12:00',
    allDepartments: a.allDepartments,
    departments: a.departments,
    freeText: a.freeText ?? '',
    note: a.note ?? '',
  }
}

/** Überschneidung derselben Person (Warnung, kein Verbot) */
export function findOverlaps(
  items: Absence[],
  v: Pick<AbsenceFormValues, 'personId' | 'dateFrom' | 'dateTo'>,
  ignoreId?: string,
): Absence[] {
  if (!isIsoDate(v.dateFrom) || !isIsoDate(v.dateTo)) return []
  return items.filter((a) => a.id !== ignoreId && a.personId === v.personId && overlaps(a, v))
}
