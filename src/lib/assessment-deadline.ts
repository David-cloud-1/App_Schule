/**
 * PROJ-133: Schnellwahlen für „Beitritt bis“. Alles in der Schulzeitzone
 * (Europe/Berlin), auch an Tagen mit Zeitumstellung. Reine Rechenlogik.
 */

export const SCHOOL_TIME_ZONE = 'Europe/Berlin'

type WallTime = { year: number; month: number; day: number; hour: number; minute: number }

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SCHOOL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Wanduhr-Zeit in der Schulzeitzone zu einem Zeitpunkt */
export function wallTimeInSchoolZone(date: Date): WallTime {
  const parts: Record<string, number> = {}
  for (const p of formatter.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute }
}

/** Abstand der Schulzeitzone zu UTC in Millisekunden (Sommerzeit: +2 h) */
function offsetMs(date: Date): number {
  const t = wallTimeInSchoolZone(date)
  const asUtc = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, 0)
  return asUtc - Math.floor(date.getTime() / 60000) * 60000
}

/** Der Zeitpunkt, an dem in der Schulzeitzone die Uhr `Y-M-D h:min` zeigt */
export function schoolWallTimeToDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0)
  let result = new Date(naive - offsetMs(new Date(naive)))
  // Liegt die Zeitumstellung dazwischen, stimmt der erste Versuch um eine Stunde nicht
  const corrected = new Date(naive - offsetMs(result))
  if (corrected.getTime() !== result.getTime()) result = corrected
  return result
}

/** Heute 23:59 (Schulzeit). Ist es schon später, gilt weiter heute 23:59 – der Aufrufer prüft „Vergangenheit“. */
export function endOfTodayInSchoolZone(now: Date): Date {
  const t = wallTimeInSchoolZone(now)
  return schoolWallTimeToDate(t.year, t.month, t.day, 23, 59)
}

/** Wie lange vor 23:59 „heute“ noch als sinnvoller Vorschlag gilt; danach ist morgen 23:59 besser */
const SAME_DAY_BUFFER_MS = 5 * 60 * 1000

/** Vorschlag für „Beitritt bis“: heute 23:59; bleiben bis dahin weniger als 5 Minuten (oder ist es vorbei), morgen 23:59 */
export function defaultClosesAt(now: Date): Date {
  const today = endOfTodayInSchoolZone(now)
  if (today.getTime() - now.getTime() > SAME_DAY_BUFFER_MS) return today
  const t = wallTimeInSchoolZone(now)
  return schoolWallTimeToDate(t.year, t.month, t.day + 1, 23, 59)
}

export function inOneHour(now: Date): Date {
  return new Date(now.getTime() + 60 * 60 * 1000)
}

/** In einer Woche: gleicher Wochentag und gleiche Uhrzeit nach Wanduhr (nicht 168 Stunden) */
export function inOneWeek(now: Date): Date {
  const t = wallTimeInSchoolZone(now)
  return schoolWallTimeToDate(t.year, t.month, t.day + 7, t.hour, t.minute)
}

export type DeadlineQuickChoice = 'hour' | 'tonight' | 'week'

export function quickDeadline(choice: DeadlineQuickChoice, now: Date): Date {
  if (choice === 'hour') return inOneHour(now)
  if (choice === 'tonight') return defaultClosesAt(now)
  return inOneWeek(now)
}

/** Wert für ein `datetime-local`-Feld in der Schulzeitzone: `2026-11-27T23:59` */
export function toSchoolInputValue(date: Date): string {
  const t = wallTimeInSchoolZone(date)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.year}-${p(t.month)}-${p(t.day)}T${p(t.hour)}:${p(t.minute)}`
}

/** Umkehrung: Wert eines `datetime-local`-Feldes (Schulzeit) -> Zeitpunkt, null bei ungültiger Eingabe */
export function fromSchoolInputValue(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number)
  const date = schoolWallTimeToDate(y, mo, d, h, mi)
  return Number.isNaN(date.getTime()) ? null : date
}
