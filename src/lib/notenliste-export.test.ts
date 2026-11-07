import { describe, expect, it } from 'vitest'
import type { ParticipantRow } from '@/lib/graded-assessments'
import {
  NOTENLISTE_COLUMNS,
  NOTE_EXCLUDED_TEXT,
  NOTE_MISSING_TEXT,
  buildNotenlisteCsv,
  contentDisposition,
  formatName,
  hasExportableRows,
  notenlisteFilename,
  sortParticipants,
  splitFullName,
} from './notenliste-export'

function row(over: Partial<ParticipantRow>): ParticipantRow {
  return {
    sessionId: over.name ?? 'x',
    name: 'Anna Beispiel',
    points: 10,
    totalPoints: 20,
    percent: 50,
    grade: 4,
    durationMinutes: 30,
    submittedAt: '2026-11-07T09:30:00Z',
    excluded: false,
    status: 'completed',
    ...over,
  }
}

const all = { columns: [...NOTENLISTE_COLUMNS], sort: 'name' as const, splitName: false }

describe('Namen', () => {
  it('letztes Wort ist Nachname', () => {
    expect(splitFullName('Hans Peter Müller')).toEqual({ first: 'Hans Peter', last: 'Müller' })
    expect(formatName('Hans Peter Müller', true)).toBe('Müller, Hans Peter')
  })
  it('Einzelwort bleibt unverändert', () => {
    expect(formatName('Madonna', true)).toBe('Madonna')
  })
  it('Schalter aus lässt den Namen stehen', () => {
    expect(formatName('Anna Beispiel', false)).toBe('Anna Beispiel')
  })
})

describe('Sortierung', () => {
  const rows = [
    row({ name: 'Zora Zander', points: 5, grade: 5 }),
    row({ name: 'Ben Ärger', points: 18, grade: 2 }),
    row({ name: 'Cem Ausgeschlossen', excluded: true, grade: 1, points: 20 }),
    row({ name: 'Dora Fehlt', status: 'in_progress', points: null, grade: null, submittedAt: null }),
    row({ name: 'Eva Mittel', points: 12, grade: 3 }),
  ]
  it('nach Nachname A–Z, Ausgeschlossene zuletzt, Nicht-Abgegebene davor', () => {
    expect(sortParticipants(rows, 'name').map((r) => r.name)).toEqual([
      'Ben Ärger', 'Eva Mittel', 'Zora Zander', 'Dora Fehlt', 'Cem Ausgeschlossen',
    ])
  })
  it('nach Note: beste zuerst', () => {
    expect(sortParticipants(rows, 'grade').map((r) => r.name).slice(0, 3)).toEqual(['Ben Ärger', 'Eva Mittel', 'Zora Zander'])
  })
  it('nach Punkten: meiste zuerst', () => {
    expect(sortParticipants(rows, 'points').map((r) => r.name).slice(0, 3)).toEqual(['Ben Ärger', 'Eva Mittel', 'Zora Zander'])
  })
})

describe('CSV', () => {
  it('beginnt mit BOM, nutzt Semikolon und Windows-Zeilenumbruch', () => {
    const csv = buildNotenlisteCsv([row({})], all)
    expect(csv.startsWith('﻿Name;Punkte;Maximum;Prozent;Note;Abgabezeit;Bearbeitungsdauer (Min.)\r\n')).toBe(true)
    expect(csv.split('\r\n')).toHaveLength(2)
  })
  it('nur gewählte Spalten, feste Reihenfolge', () => {
    const csv = buildNotenlisteCsv([row({})], { ...all, columns: ['grade', 'name'] })
    expect(csv.split('\r\n')[0]).toBe('﻿Name;Note')
    expect(csv.split('\r\n')[1]).toBe('Anna Beispiel;4')
  })
  it('Vermerke für ausgeschlossen und nicht abgegeben', () => {
    const csv = buildNotenlisteCsv(
      [
        row({ name: 'A Eins', excluded: true }),
        row({ name: 'B Zwei', status: 'in_progress', points: null, grade: null, submittedAt: null }),
      ],
      { ...all, columns: ['name', 'grade'] },
    )
    expect(csv).toContain(`B Zwei;${NOTE_MISSING_TEXT}`)
    expect(csv).toContain(`A Eins;${NOTE_EXCLUDED_TEXT}`)
  })
  it('Namensteilung wirkt in der Datei', () => {
    const csv = buildNotenlisteCsv([row({ name: 'Anna Beispiel' })], { ...all, columns: ['name'], splitName: true })
    expect(csv).toContain('Beispiel, Anna')
  })
  it('maskiert Formel-Anfänge (CSV-Injection)', () => {
    for (const evil of ['=SUMME(A1)', '+1', '-2', '@x']) {
      const csv = buildNotenlisteCsv([row({ name: evil })], { ...all, columns: ['name'] })
      expect(csv.split('\r\n')[1]).toBe(`'${evil}`)
    }
  })
  it('kürzt lange Namen nicht', () => {
    const long = 'Vorname ' + 'N'.repeat(300)
    expect(buildNotenlisteCsv([row({ name: long })], { ...all, columns: ['name'] })).toContain('N'.repeat(300))
  })
  it('ersetzt Semikolon im Namen durch Anführungszeichen', () => {
    const csv = buildNotenlisteCsv([row({ name: 'A; B' })], { ...all, columns: ['name'] })
    expect(csv.split('\r\n')[1]).toBe('"A; B"')
  })
})

describe('hasExportableRows', () => {
  it('false ohne Abgabe', () => {
    expect(hasExportableRows([row({ status: 'in_progress' })])).toBe(false)
    expect(hasExportableRows([])).toBe(false)
  })
  it('true mit einer Abgabe', () => expect(hasExportableRows([row({})])).toBe(true))
})

describe('Dateiname', () => {
  const d = new Date('2026-11-07T10:00:00Z')
  it('Muster mit Datum', () => {
    expect(notenlisteFilename('Klassenarbeit 1', d)).toBe('Notenliste_Klassenarbeit_1_2026-11-07.csv')
  })
  it('entfernt Sonderzeichen, behält Umlaute', () => {
    expect(notenlisteFilename('Prüfung: A/B*?"<>|', d)).toBe('Notenliste_Prüfung_AB_2026-11-07.csv')
  })
  it('leerer Titel bekommt Ersatz', () => {
    expect(notenlisteFilename('///', d)).toBe('Notenliste_Nachweis_2026-11-07.csv')
  })
  it('Header hat ASCII-Rückfall und UTF-8-Name', () => {
    const h = contentDisposition('Notenliste_Prüfung_2026-11-07.csv')
    expect(h).toContain('filename="Notenliste_Pruefung_2026-11-07.csv"')
    expect(h).toContain("filename*=UTF-8''Notenliste_Pr%C3%BCfung_2026-11-07.csv")
  })
})
