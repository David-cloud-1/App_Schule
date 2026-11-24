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

const UMLAUTS = /[äöüßÄÖÜ]/g

function umlautCount(text: string): number {
  return (text.match(UMLAUTS) ?? []).length
}

/**
 * UTF-8, sonst Windows-1252 (so speichert Excel für Windows eine „CSV“ ohne
 * UTF-8-Wahl). Excel für Mac schreibt dagegen Mac-Roman: dort wäre „ü“ in
 * Windows-1252 ein „Ÿ“. Zählt die Mac-Lesart mehr Umlaute, gilt sie.
 */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    text = new TextDecoder('windows-1252').decode(buffer)
    try {
      const mac = new TextDecoder('macintosh').decode(buffer)
      if (umlautCount(mac) > umlautCount(text)) text = mac
    } catch {
      // Kodierung dieser Umgebung unbekannt: es bleibt bei Windows-1252
    }
  }
  return text.replace(/^\uFEFF/, '')
}

/** Alle nicht leeren Zeilen der Datei mit ihrer Zeilennummer (1 = erste Zeile der Datei) */
export interface CsvSource {
  rows: string[][]
  lines: number[]
}

export interface CsvTable {
  /** Überschriften; ohne Kopfzeile „Spalte 1“, „Spalte 2“ … */
  headers: string[]
  records: string[][]
  hasHeader: boolean
  /** Zeilennummer jedes Datensatzes in der Datei */
  lines: number[]
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

/** Datei lesen: Trennzeichen (Komma oder Semikolon) wird erkannt, leere Zeilen entfallen, die Zeilennummern bleiben */
export function parseCsvSource(text: string): CsvSource | { error: string } {
  // Das Trennzeichen erkennt Papa nur zuverlässig ohne Leerzeilen; danach wird ohne Überspringen
  // gelesen, damit die Zeilennummern der Datei stimmen
  const delimiter = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy', preview: 20 }).meta.delimiter
  const parsed = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: false })
  const rows: string[][] = []
  const lines: number[] = []
  parsed.data.forEach((raw, index) => {
    const row = raw.map((cell) => collapse(String(cell ?? '')))
    if (row.every((cell) => cell === '')) return
    rows.push(row)
    lines.push(index + 1)
  })
  if (rows.length === 0) return { error: 'Die Datei enthält keine Zeilen.' }
  return { rows, lines }
}

/** Eine Kopfzeile erkennt man daran, dass keine Zelle der ersten Zeile wie eine E-Mail aussieht */
export function guessHasHeader(rows: readonly string[][]): boolean {
  return !rows[0].some((cell) => cell.includes('@'))
}

/** Tabelle aus der Datei bauen; `hasHeader` darf der Super-Admin umschalten, wenn die Schätzung falsch liegt */
export function buildTable(source: CsvSource, hasHeader: boolean): CsvTable | { error: string } {
  const width = Math.max(...source.rows.map((row) => row.length))
  const headers = hasHeader
    ? Array.from({ length: width }, (_, i) => source.rows[0][i] ?? '')
    : Array.from({ length: width }, (_, i) => `Spalte ${i + 1}`)
  const records = hasHeader ? source.rows.slice(1) : source.rows
  const lines = hasHeader ? source.lines.slice(1) : source.lines
  if (records.length === 0) return { error: 'Die Datei enthält nur eine Kopfzeile, aber keine Personen.' }
  if (records.length > BULK_MAX_ROWS) {
    return {
      error: `Die Datei hat ${records.length} Zeilen. Bitte in mehrere Dateien mit höchstens ${BULK_MAX_ROWS} Zeilen teilen.`,
    }
  }
  return { headers, records, hasHeader, lines }
}

/** Alles in einem Schritt mit der geschätzten Kopfzeile */
export function parseCsvText(text: string): CsvTable | { error: string } {
  const source = parseCsvSource(text)
  if ('error' in source) return source
  return buildTable(source, guessHasHeader(source.rows))
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

/** Spalten, die keinem Feld zugeordnet sind (damit nichts stillschweigend wegfällt) */
export function unusedHeaders(table: CsvTable, map: ColumnMap): string[] {
  const used = new Set(Object.values(map).filter((v): v is number => v !== null))
  return table.headers.flatMap((header, i) => (used.has(i) || header === '' ? [] : [header]))
}

/** Zeilen der Datei in das Format für den Server bringen (E-Mail klein, Leerzeichen am Rand weg) */
export function mapRecords(table: CsvTable, map: ColumnMap): RawAccountRow[] {
  const pick = (row: string[], column: number | null) => (column === null ? '' : (row[column] ?? ''))
  return table.records.map((row, index) => ({
    line: table.lines[index],
    name: collapse(pick(row, map.name)),
    email: pick(row, map.email).trim().toLowerCase(),
    department: collapse(pick(row, map.department)),
    role: collapse(pick(row, map.role)),
  }))
}

export type ReadCsvResult = { source: CsvSource; table: CsvTable; map: ColumnMap } | { error: string }

/** Alles in einem Schritt: Datei lesen, Kopfzeile schätzen, Spalten erkennen, Zeilenzahl prüfen */
export function readAccountCsv(buffer: ArrayBuffer): ReadCsvResult {
  const source = parseCsvSource(decodeCsvBuffer(buffer))
  if ('error' in source) return source
  const table = buildTable(source, guessHasHeader(source.rows))
  if ('error' in table) return table
  return { source, table, map: detectColumns(table) }
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
