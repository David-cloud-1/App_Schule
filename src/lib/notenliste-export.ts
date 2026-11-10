// PROJ-77: Notenliste als CSV für Excel – Spalten, Sortierung, Namensteilung,
// Dateiname. Reine Funktionen; die Schnittstelle liefert nur die Teilnehmerzeilen.

import { csvEscape, type ParticipantRow } from '@/lib/graded-assessments'

export const NOTENLISTE_COLUMNS = ['name', 'group', 'points', 'max', 'percent', 'grade', 'submitted', 'duration'] as const
export type NotenlisteColumn = (typeof NOTENLISTE_COLUMNS)[number]

export const NOTENLISTE_COLUMN_LABELS: Record<NotenlisteColumn, string> = {
  name: 'Name',
  group: 'Gruppe',
  points: 'Punkte',
  max: 'Maximum',
  percent: 'Prozent',
  grade: 'Note',
  submitted: 'Abgabezeit',
  duration: 'Bearbeitungsdauer (Min.)',
}

export const NOTENLISTE_SORTS = ['name', 'grade', 'points'] as const
export type NotenlisteSort = (typeof NOTENLISTE_SORTS)[number]

export const NOTE_EXCLUDED_TEXT = 'von der Wertung ausgeschlossen'
export const NOTE_MISSING_TEXT = 'nicht abgegeben'

export type NotenlisteOptions = {
  columns: NotenlisteColumn[]
  sort: NotenlisteSort
  /** „Vorname Nachname“ → „Nachname, Vorname“ */
  splitName: boolean
}

const BERLIN = { timeZone: 'Europe/Berlin' } as const

/** Letztes Wort gilt als Nachname, der Rest als Vorname. Ein einzelnes Wort bleibt unverändert. */
export function splitFullName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return { first: '', last: parts[0] ?? '' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}

export function formatName(name: string, split: boolean): string {
  if (!split) return name
  const { first, last } = splitFullName(name)
  return first ? `${last}, ${first}` : name
}

type Group = 0 | 1 | 2 // 0 gewertet, 1 nicht abgegeben, 2 ausgeschlossen (steht am Ende)

function groupOf(p: ParticipantRow): Group {
  if (p.excluded) return 2
  if (p.status === 'in_progress') return 1
  return 0
}

const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true })

function compareByName(a: ParticipantRow, b: ParticipantRow): number {
  const an = splitFullName(a.name)
  const bn = splitFullName(b.name)
  return collator.compare(an.last, bn.last) || collator.compare(an.first, bn.first)
}

export function sortParticipants(rows: ParticipantRow[], sort: NotenlisteSort): ParticipantRow[] {
  return [...rows].sort((a, b) => {
    const g = groupOf(a) - groupOf(b)
    if (g !== 0) return g
    if (sort === 'grade') {
      // Beste Note zuerst; ohne Note ans Ende der Gruppe
      const ag = a.grade ?? 99
      const bg = b.grade ?? 99
      if (ag !== bg) return ag - bg
      return (b.points ?? -1) - (a.points ?? -1) || compareByName(a, b)
    }
    if (sort === 'points') {
      const diff = (b.points ?? -1) - (a.points ?? -1)
      return diff || compareByName(a, b)
    }
    return compareByName(a, b)
  })
}

function cell(p: ParticipantRow, column: NotenlisteColumn, opts: NotenlisteOptions): string {
  switch (column) {
    case 'name':
      return csvEscape(formatName(p.name, opts.splitName))
    case 'group':
      return p.group ?? ''
    case 'points':
      return p.points != null ? String(p.points) : ''
    case 'max':
      return p.totalPoints != null ? String(p.totalPoints) : ''
    case 'percent':
      return p.percent != null ? String(p.percent) : ''
    case 'grade':
      if (p.excluded) return NOTE_EXCLUDED_TEXT
      if (p.status === 'in_progress') return NOTE_MISSING_TEXT
      return p.grade != null ? String(p.grade) : ''
    case 'submitted':
      return p.submittedAt ? new Date(p.submittedAt).toLocaleString('de-DE', BERLIN) : ''
    case 'duration':
      return p.durationMinutes != null ? String(p.durationMinutes) : ''
  }
}

/** Fertige Datei: UTF-8 mit BOM, Semikolon, Windows-Zeilenumbrüche (Excel). */
export function buildNotenlisteCsv(rows: ParticipantRow[], opts: NotenlisteOptions): string {
  // Spaltenreihenfolge ist fest, unabhängig von der Reihenfolge der Auswahl
  const columns = NOTENLISTE_COLUMNS.filter((c) => opts.columns.includes(c))
  const lines = [columns.map((c) => NOTENLISTE_COLUMN_LABELS[c]).join(';')]
  for (const p of sortParticipants(rows, opts.sort)) {
    lines.push(columns.map((c) => cell(p, c, opts)).join(';'))
  }
  return '﻿' + lines.join('\r\n')
}

/** Gibt es etwas zu exportieren? (mindestens eine Abgabe) */
export function hasExportableRows(rows: ParticipantRow[]): boolean {
  return rows.some((r) => r.status === 'completed')
}

export function berlinDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { ...BERLIN, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** `Notenliste_<Titel>_<Datum>.csv` – ohne Zeichen, die Dateisysteme stören. Umlaute bleiben erhalten. */
export function notenlisteFilename(title: string, date: Date = new Date()): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '')
    .replace(/[.\s]+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim()
    .replace(/ /g, '_')
  return `Notenliste_${cleaned || 'Nachweis'}_${berlinDate(date)}.csv`
}

/** Header-Wert mit ASCII-Rückfall und UTF-8-Variante, damit Umlaute im Dateinamen ankommen. */
export function contentDisposition(filename: string): string {
  const ascii = filename
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}
