import { berlinDay } from '@/lib/engagement-metrics'
import { ROLE_LABEL, type UserRole } from '@/lib/roles'
import { getLevelFromXp } from '@/lib/xp-utils'

/**
 * CSV-Export der Nutzerliste (PROJ-61). Reine Logik ohne React: Die Datei
 * entsteht im Browser aus genau den Zeilen, die die Tabelle zeigt.
 */

export type ExportUser = {
  display_name: string | null
  email: string | null
  role: UserRole
  department_name?: string | null
  total_xp: number
  current_streak: number
  last_session_date: string | null
  last_sign_in_at?: string | null
  created_at?: string | null
  banned: boolean
}

export const CSV_HEADER = [
  'Name',
  'E-Mail',
  'Rolle',
  'Bereich',
  'XP',
  'Level',
  'Streak',
  'Letzte Session',
  'Letzter Login',
  'Status',
  'Registriert am',
] as const

const BOM = '﻿'
const SEPARATOR = ';'
const LINE_BREAK = '\r\n'

/**
 * Excel liest Zellen, die mit = + - @ (oder Tab/Zeilenumbruch) beginnen, als Formel.
 * Namen wählen die Azubis selbst, deshalb bekommt so eine Zelle ein Hochkomma davor.
 */
export function neutralizeCsvText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') return String(value)
  const text = neutralizeCsvText(value)
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** `TT.MM.JJJJ`; Tageswerte (`2026-10-03`) werden nicht über Zeitzonen verschoben, Zeitstempel zählen in Berliner Zeit */
export function formatCsvDate(value: string | null | undefined): string {
  if (!value) return ''
  const day = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : safeBerlinDay(value)
  if (!day) return ''
  const [y, m, d] = day.split('-')
  return `${d}.${m}.${y}`
}

function safeBerlinDay(value: string): string | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : berlinDay(date)
}

export function userCsvRow(user: ExportUser): string {
  return [
    cell(user.display_name?.trim()),
    cell(user.email),
    cell(ROLE_LABEL[user.role] ?? user.role),
    cell(user.department_name),
    cell(user.total_xp),
    cell(getLevelFromXp(user.total_xp)),
    cell(user.current_streak),
    cell(formatCsvDate(user.last_session_date)),
    cell(formatCsvDate(user.last_sign_in_at)),
    cell(user.banned ? 'Gesperrt' : 'Aktiv'),
    cell(formatCsvDate(user.created_at)),
  ].join(SEPARATOR)
}

/** Komplette Datei: UTF-8 mit BOM (Umlaute in Excel), Semikolon, Zeilen in der übergebenen Reihenfolge */
export function buildUsersCsv(users: ExportUser[]): string {
  return BOM + [CSV_HEADER.join(SEPARATOR), ...users.map(userCsvRow)].join(LINE_BREAK) + LINE_BREAK
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** `nutzer-{bereich oder alle}-{JJJJ-MM-TT}.csv` */
export function usersCsvFilename(scope: string | null | undefined, now: Date = new Date()): string {
  return `nutzer-${(scope && slugify(scope)) || 'alle'}-${berlinDay(now)}.csv`
}
