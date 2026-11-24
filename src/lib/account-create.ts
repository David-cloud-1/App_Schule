import Papa from 'papaparse'
import { neutralizeCsvText } from '@/lib/user-csv'
import { ROLE_LABEL, type UserRole } from '@/lib/roles'

/**
 * Konten anlegen (PROJ-62): gemeinsame Typen und reine Logik für die Oberfläche
 * und die Schnittstellen. Hier steht nichts, was Passwörter speichert: sie
 * existieren nur in der Antwort an den Super-Admin und im Arbeitsspeicher
 * der Seite.
 */

/** Höchstens so viele Zeilen pro Datei (Spec: darüber „Bitte in mehrere Dateien teilen“) */
export const BULK_MAX_ROWS = 300

/** So viele Zeilen gehen pro Aufruf an den Server, damit die Zeitgrenze von Vercel nicht reißt */
export const BULK_CHUNK_SIZE = 25

/** Sammel-Anlage: nur diese Rollen. Admin-Rollen gibt es nur einzeln und mit Bestätigung. */
export const BULK_ROLES = ['student', 'teacher'] as const
export type BulkRole = (typeof BULK_ROLES)[number]

/** Einzel-Anlage: zusätzlich der Super-Admin (mit Bestätigung) */
export const SINGLE_ROLES = ['student', 'teacher', 'admin'] as const
export type SingleRole = (typeof SINGLE_ROLES)[number]

export const SINGLE_ROLE_OPTIONS: readonly { value: SingleRole; label: string }[] = SINGLE_ROLES.map((value) => ({
  value,
  label: ROLE_LABEL[value],
}))

/** Wie die Rolle in einer CSV-Spalte heißen darf (klein geschrieben verglichen) */
const ROLE_WORDS: Record<string, BulkRole> = {
  azubi: 'student',
  student: 'student',
  schueler: 'student',
  schüler: 'student',
  schülerin: 'student',
  lehrkraft: 'teacher',
  lehrer: 'teacher',
  lehrerin: 'teacher',
  teacher: 'teacher',
}

/** Leer = Azubi (Standard laut Spec); unbekanntes Wort = `null` */
export function parseBulkRole(value: string): BulkRole | null {
  const word = value.trim().toLowerCase()
  if (word === '') return 'student'
  return ROLE_WORDS[word] ?? null
}

export interface CreateAccountInput {
  name: string
  email: string
  role: SingleRole
  departmentId: string
  password: string
}

/** Ein angelegtes Konto samt Start-Passwort, so wie der Server es einmalig zurückgibt */
export interface CreatedAccount {
  name: string
  email: string
  password: string
  role: SingleRole
  departmentName: string | null
  /** Adresse des Bereichs für den Zugangszettel; fehlt sie, gilt die aktuelle Adresse */
  appUrl?: string | null
}

/** Eine Zeile der hochgeladenen Liste, wie der Browser sie an den Server schickt */
export interface RawAccountRow {
  /** Zeile in der Datei (1 = erste Zeile), für Meldungen */
  line: number
  name: string
  email: string
  /** Kürzel oder Name aus der Bereichs-Spalte; leer = Bereich für alle */
  department: string
  /** Wort aus der Rollen-Spalte; leer = Azubi */
  role: string
}

export type RowStatus = 'ok' | 'warning' | 'error'

export interface PreviewRow {
  line: number
  name: string
  email: string
  departmentId: string | null
  departmentName: string | null
  role: BulkRole | null
  status: RowStatus
  /** Begründung bei Warnung und Fehler */
  reason: string | null
}

/** Antwort der Vorschau: legt noch nichts an */
export interface PreviewResponse {
  rows: PreviewRow[]
}

/** Anfrage der Vorschau und der Sammel-Anlage (Letztere: nur die OK-Zeilen, in Päckchen) */
export interface CreateBulkRequest {
  rows: RawAccountRow[]
  /** Bereich für alle Zeilen, die keinen eigenen haben */
  defaultDepartmentId: string | null
  /** Gleiche Kennung für alle Päckchen einer Sammel-Anlage (zählt für das Limit „3 pro Stunde“) */
  batchId?: string
  batchIndex?: number
  batchCount?: number
  /** Nur im letzten Päckchen: Zahlen aus der Vorschau fürs Protokoll „Sammel-Anlage“ */
  summary?: { skipped: number; invalid: number; failed: number }
}

export interface FailedRow {
  line: number
  name: string
  email: string
  reason: string
}

export interface BulkCreateResponse {
  created: (CreatedAccount & { line: number })[]
  /** Zeilen, die nicht angelegt wurden (existiert inzwischen, Fehler beim Anlegen) */
  failed: FailedRow[]
}

export function summarizePreview(rows: readonly PreviewRow[]): Record<RowStatus, number> {
  const summary: Record<RowStatus, number> = { ok: 0, warning: 0, error: 0 }
  for (const row of rows) summary[row.status] += 1
  return summary
}

export function chunkRows<T>(rows: readonly T[], size = BULK_CHUNK_SIZE): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size))
  return chunks
}

// ---------------------------------------------------------------------------
// CSV einlesen (im Browser, die Datei verlässt den Rechner nicht)
// ---------------------------------------------------------------------------

/** UTF-8, sonst Windows-1252 (so speichert Excel eine „CSV“ ohne UTF-8-Wahl) */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    text = new TextDecoder('windows-1252').decode(buffer)
  }
  return text.replace(/^﻿/, '')
}

export interface CsvTable {
  /** Überschriften; ohne Kopfzeile „Spalte 1“, „Spalte 2“ … */
  headers: string[]
  records: string[][]
  hasHeader: boolean
}

/** Spaltenzuordnung: Nummer der Spalte oder `null`, wenn nicht eindeutig erkannt */
export interface ColumnMap {
  name: number | null
  email: number | null
  department: number | null
  role: number | null
}

const HEADER_ALIASES: Record<keyof ColumnMap, readonly string[]> = {
  name: ['name', 'anzeigename', 'vollername', 'vorundnachname', 'azubi', 'schueler', 'schüler', 'person'],
  email: ['email', 'emailadresse', 'mail', 'mailadresse', 'emailadr'],
  department: ['bereich', 'fachbereich'],
  role: ['rolle'],
}

export function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9äöüß]/g, '')
}

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Datei lesen: Trennzeichen (Komma oder Semikolon) wird erkannt, leere Zeilen entfallen */
export function parseCsvText(text: string): CsvTable | { error: string } {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
  const rows = parsed.data.map((row) => row.map((cell) => collapse(String(cell ?? ''))))
  if (rows.length === 0) return { error: 'Die Datei enthält keine Zeilen.' }

  // Eine Kopfzeile erkennt man daran, dass keine Zelle wie eine E-Mail aussieht
  const hasHeader = !rows[0].some((cell) => cell.includes('@'))
  const width = Math.max(...rows.map((row) => row.length))
  const headers = hasHeader
    ? Array.from({ length: width }, (_, i) => rows[0][i] ?? '')
    : Array.from({ length: width }, (_, i) => `Spalte ${i + 1}`)
  const records = hasHeader ? rows.slice(1) : rows
  if (records.length === 0) return { error: 'Die Datei enthält nur eine Kopfzeile, aber keine Personen.' }
  return { headers, records, hasHeader }
}

/** Spalten anhand der Kopfzeile erkennen; ohne Kopfzeile zählt, wo E-Mail-Adressen stehen */
export function detectColumns(table: CsvTable): ColumnMap {
  const map: ColumnMap = { name: null, email: null, department: null, role: null }

  if (table.hasHeader) {
    const normalized = table.headers.map(normalizeHeader)
    for (const key of Object.keys(HEADER_ALIASES) as (keyof ColumnMap)[]) {
      const hits = normalized.flatMap((header, index) => (HEADER_ALIASES[key].includes(header) ? [index] : []))
      // Zwei Spalten mit demselben Sinn sind nicht eindeutig: dann ordnet der Super-Admin zu
      map[key] = hits.length === 1 ? hits[0] : null
    }
    return map
  }

  const emailColumn = table.headers.findIndex((_, i) => {
    const values = table.records.map((row) => row[i] ?? '').filter(Boolean)
    return values.length > 0 && values.every((value) => value.includes('@'))
  })
  if (emailColumn >= 0) {
    map.email = emailColumn
    const nameColumn = table.headers.findIndex((_, i) => i !== emailColumn)
    map.name = nameColumn >= 0 ? nameColumn : null
  }
  return map
}

export function columnsComplete(map: ColumnMap): boolean {
  return map.name !== null && map.email !== null
}

/** Zeilen der Datei in das Format für den Server bringen (E-Mail klein, Leerzeichen am Rand weg) */
export function mapRecords(table: CsvTable, map: ColumnMap): RawAccountRow[] {
  const firstLine = table.hasHeader ? 2 : 1
  const pick = (row: string[], column: number | null) => (column === null ? '' : (row[column] ?? ''))
  return table.records.map((row, index) => ({
    line: firstLine + index,
    name: collapse(pick(row, map.name)),
    email: pick(row, map.email).trim().toLowerCase(),
    department: collapse(pick(row, map.department)),
    role: collapse(pick(row, map.role)),
  }))
}

export type ReadCsvResult = { table: CsvTable; map: ColumnMap } | { error: string }

/** Alles in einem Schritt: Datei lesen, Spalten erkennen, Zeilenzahl prüfen */
export function readAccountCsv(buffer: ArrayBuffer): ReadCsvResult {
  const table = parseCsvText(decodeCsvBuffer(buffer))
  if ('error' in table) return table
  if (table.records.length > BULK_MAX_ROWS) {
    return {
      error: `Die Datei hat ${table.records.length} Zeilen. Bitte in mehrere Dateien mit höchstens ${BULK_MAX_ROWS} Zeilen teilen.`,
    }
  }
  return { table, map: detectColumns(table) }
}

// ---------------------------------------------------------------------------
// CSV schreiben
// ---------------------------------------------------------------------------

const BOM = '﻿'
const SEPARATOR = ';'
const LINE_BREAK = '\r\n'

function csvCell(value: string, neutralize: boolean): string {
  const text = neutralize ? neutralizeCsvText(value) : value
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const ACCESS_CSV_HEADER = ['Name', 'E-Mail', 'Start-Passwort'] as const

/**
 * Zugangsliste zum Herunterladen. Namen werden gegen Excel-Formeln entschärft
 * (wie beim Nutzer-Export). Das Passwort bleibt unverändert, damit es stimmt;
 * erzeugte Passwörter beginnen immer mit einem Buchstaben.
 */
export function buildAccessCsv(accounts: readonly Pick<CreatedAccount, 'name' | 'email' | 'password'>[]): string {
  const rows = accounts.map((a) =>
    [csvCell(a.name, true), csvCell(a.email, true), csvCell(a.password, false)].join(SEPARATOR),
  )
  return BOM + [ACCESS_CSV_HEADER.join(SEPARATOR), ...rows].join(LINE_BREAK) + LINE_BREAK
}

export function accessCsvFilename(date = new Date()): string {
  return `zugangsdaten-${date.toISOString().slice(0, 10)}.csv`
}

export const TEMPLATE_FILENAME = 'konten-vorlage.csv'

/** Vorlage zum Herunterladen: eine Beispielzeile, Semikolon wie in deutschem Excel */
export function buildTemplateCsv(): string {
  const header = ['Name', 'E-Mail', 'Bereich', 'Rolle'].join(SEPARATOR)
  const example = ['Max Mustermann', 'max.mustermann@example.de', 'Spedition', 'Azubi'].join(SEPARATOR)
  return BOM + [header, example].join(LINE_BREAK) + LINE_BREAK
}

export const RETRY_FILENAME = 'konten-nicht-angelegt.csv'

/** Zeilen, die nicht angelegt wurden, im Format der Vorlage: direkt wieder hochladbar */
export function buildRetryCsv(rows: readonly Pick<RawAccountRow, 'name' | 'email' | 'department' | 'role'>[]): string {
  const header = ['Name', 'E-Mail', 'Bereich', 'Rolle'].join(SEPARATOR)
  const body = rows.map((r) =>
    [csvCell(r.name, true), csvCell(r.email, true), csvCell(r.department, true), csvCell(r.role, true)].join(SEPARATOR),
  )
  return BOM + [header, ...body].join(LINE_BREAK) + LINE_BREAK
}

/** Nur zum Anzeigen: Rollenwort für die Vorschau-Tabelle */
export function roleLabelOf(role: UserRole | null): string {
  return role ? ROLE_LABEL[role] : '–'
}
