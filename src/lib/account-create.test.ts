import { describe, it, expect } from 'vitest'
import {
  BULK_CHUNK_SIZE,
  BULK_MAX_ROWS,
  buildAccessCsv,
  buildRetryCsv,
  buildTemplateCsv,
  chunkRows,
  columnsComplete,
  decodeCsvBuffer,
  detectColumns,
  mapRecords,
  parseBulkRole,
  parseCsvText,
  readAccountCsv,
  summarizePreview,
  type CsvTable,
  type PreviewRow,
} from './account-create'

function table(text: string): CsvTable {
  const result = parseCsvText(text)
  if ('error' in result) throw new Error(result.error)
  return result
}

function bytes(text: string, encoding: 'utf-8' | 'windows-1252'): ArrayBuffer {
  if (encoding === 'utf-8') return new TextEncoder().encode(text).buffer as ArrayBuffer
  // Windows-1252: ä = 0xE4, ö = 0xF6, ü = 0xFC, ß = 0xDF
  const map: Record<string, number> = { ä: 0xe4, ö: 0xf6, ü: 0xfc, ß: 0xdf, Ä: 0xc4, Ö: 0xd6, Ü: 0xdc }
  const out = new Uint8Array([...text].map((c) => map[c] ?? c.charCodeAt(0)))
  return out.buffer as ArrayBuffer
}

describe('parseBulkRole', () => {
  it('leer heißt Azubi', () => {
    expect(parseBulkRole('')).toBe('student')
    expect(parseBulkRole('   ')).toBe('student')
  })
  it('erkennt Azubi und Lehrkraft in üblichen Schreibweisen', () => {
    expect(parseBulkRole('Azubi')).toBe('student')
    expect(parseBulkRole('SCHÜLER')).toBe('student')
    expect(parseBulkRole('Lehrkraft')).toBe('teacher')
    expect(parseBulkRole('lehrerin')).toBe('teacher')
  })
  it('lässt Admin-Rollen und Unbekanntes nicht durch', () => {
    expect(parseBulkRole('Super-Admin')).toBeNull()
    expect(parseBulkRole('admin')).toBeNull()
    expect(parseBulkRole('Hausmeister')).toBeNull()
  })
})

describe('parseCsvText', () => {
  it('liest Semikolon und Komma', () => {
    const a = table('Name;E-Mail\nAnna Azubi;anna@example.de')
    const b = table('Name,E-Mail\nAnna Azubi,anna@example.de')
    expect(a.records).toEqual([['Anna Azubi', 'anna@example.de']])
    expect(b.records).toEqual([['Anna Azubi', 'anna@example.de']])
  })

  it('ignoriert leere Zeilen und Leerzeichen am Rand', () => {
    const t = table('Name;E-Mail\n\n  Anna   Azubi ; anna@example.de \n\n;\n')
    expect(t.records).toEqual([['Anna Azubi', 'anna@example.de']])
  })

  it('erkennt eine Datei ohne Kopfzeile', () => {
    const t = table('Anna Azubi;anna@example.de\nBen Berger;ben@example.de')
    expect(t.hasHeader).toBe(false)
    expect(t.records).toHaveLength(2)
    expect(t.headers).toEqual(['Spalte 1', 'Spalte 2'])
  })

  it('meldet leere Dateien und Dateien nur mit Kopfzeile', () => {
    expect(parseCsvText('')).toEqual({ error: 'Die Datei enthält keine Zeilen.' })
    expect(parseCsvText('Name;E-Mail\n')).toEqual({ error: 'Die Datei enthält nur eine Kopfzeile, aber keine Personen.' })
  })
})

describe('detectColumns', () => {
  it('erkennt Spalten in beliebiger Reihenfolge und Schreibweise', () => {
    const t = table('Rolle;e-mail;Bereich;Anzeigename\nAzubi;a@example.de;Spedition;Anna')
    expect(detectColumns(t)).toEqual({ name: 3, email: 1, department: 2, role: 0 })
  })

  it('akzeptiert „Mail“ und „E-Mail-Adresse“', () => {
    expect(detectColumns(table('Name;Mail\nA;a@example.de')).email).toBe(1)
    expect(detectColumns(table('Name;E-Mail-Adresse\nA;a@example.de')).email).toBe(1)
  })

  it('lässt unklare Spalten offen, damit der Super-Admin zuordnet', () => {
    const t = table('Wer;Adresse\nAnna;a@example.de')
    const map = detectColumns(t)
    expect(map.name).toBeNull()
    expect(map.email).toBeNull()
    expect(columnsComplete(map)).toBe(false)
  })

  it('lässt doppelt vorkommende Spalten offen', () => {
    const t = table('Name;Mail;E-Mail\nAnna;a@example.de;a@example.de')
    expect(detectColumns(t).email).toBeNull()
  })

  it('findet ohne Kopfzeile die E-Mail-Spalte und nimmt die andere als Namen', () => {
    const t = table('anna@example.de;Anna Azubi\nben@example.de;Ben Berger')
    expect(detectColumns(t)).toMatchObject({ email: 0, name: 1 })
  })
})

describe('mapRecords', () => {
  it('zählt die Zeilen so, wie sie in der Datei stehen', () => {
    const t = table('Name;E-Mail\nAnna;a@example.de\nBen;b@example.de')
    const rows = mapRecords(t, detectColumns(t))
    expect(rows.map((r) => r.line)).toEqual([2, 3])
  })

  it('zählt ohne Kopfzeile ab 1', () => {
    const t = table('Anna;a@example.de')
    expect(mapRecords(t, detectColumns(t))[0].line).toBe(1)
  })

  it('schreibt E-Mails klein und lässt fehlende Spalten leer', () => {
    const t = table('Name;E-Mail\n Anna  Azubi ; Anna@Example.DE ')
    expect(mapRecords(t, detectColumns(t))[0]).toEqual({
      line: 2,
      name: 'Anna Azubi',
      email: 'anna@example.de',
      department: '',
      role: '',
    })
  })
})

describe('readAccountCsv', () => {
  it('liest Windows-1252 (Excel ohne UTF-8) mit Umlauten', () => {
    const result = readAccountCsv(bytes('Name;E-Mail\nJürgen Müller;j@example.de', 'windows-1252'))
    if ('error' in result) throw new Error(result.error)
    expect(result.table.records[0][0]).toBe('Jürgen Müller')
  })

  it('liest UTF-8 mit und ohne BOM', () => {
    const plain = decodeCsvBuffer(bytes('Name;E-Mail\nÄnne;a@example.de', 'utf-8'))
    const withBom = decodeCsvBuffer(bytes('﻿Name;E-Mail\nÄnne;a@example.de', 'utf-8'))
    expect(plain).toBe(withBom)
    expect(withBom.startsWith('Name')).toBe(true)
  })

  it(`lehnt mehr als ${BULK_MAX_ROWS} Zeilen ab`, () => {
    const lines = Array.from({ length: BULK_MAX_ROWS + 1 }, (_, i) => `Person ${i};p${i}@example.de`)
    const result = readAccountCsv(bytes(['Name;E-Mail', ...lines].join('\n'), 'utf-8'))
    expect(result).toMatchObject({ error: expect.stringContaining('in mehrere Dateien') })
  })

  it(`nimmt genau ${BULK_MAX_ROWS} Zeilen an`, () => {
    const lines = Array.from({ length: BULK_MAX_ROWS }, (_, i) => `Person ${i};p${i}@example.de`)
    const result = readAccountCsv(bytes(['Name;E-Mail', ...lines].join('\n'), 'utf-8'))
    expect('error' in result).toBe(false)
  })
})

describe('chunkRows und summarizePreview', () => {
  it('teilt in Päckchen', () => {
    const chunks = chunkRows(Array.from({ length: 60 }, (_, i) => i))
    expect(chunks.map((c) => c.length)).toEqual([BULK_CHUNK_SIZE, BULK_CHUNK_SIZE, 10])
  })

  it('zählt die Stati', () => {
    const base = { line: 1, name: 'A', email: 'a@x.de', departmentId: null, departmentName: null, role: null, reason: null }
    const rows: PreviewRow[] = [
      { ...base, status: 'ok' },
      { ...base, status: 'ok' },
      { ...base, status: 'warning' },
      { ...base, status: 'error' },
    ]
    expect(summarizePreview(rows)).toEqual({ ok: 2, warning: 1, error: 1 })
  })
})

describe('CSV schreiben', () => {
  it('Zugangsliste: Kopfzeile, Semikolon, BOM, Windows-Zeilenumbruch', () => {
    const csv = buildAccessCsv([{ name: 'Anna Azubi', email: 'a@example.de', password: 'Hafen-Kran-Birke-47' }])
    expect(csv.startsWith('﻿Name;E-Mail;Start-Passwort\r\n')).toBe(true)
    expect(csv).toContain('Anna Azubi;a@example.de;Hafen-Kran-Birke-47\r\n')
  })

  it('entschärft Namen, die wie Excel-Formeln beginnen, und lässt das Passwort unverändert', () => {
    const csv = buildAccessCsv([{ name: '=SUMME(A1)', email: 'a@example.de', password: 'Hafen-Kran-Birke-47' }])
    expect(csv).toContain("'=SUMME(A1);a@example.de;Hafen-Kran-Birke-47")
  })

  it('setzt Namen mit Semikolon in Anführungszeichen', () => {
    const csv = buildAccessCsv([{ name: 'Müller; Anna', email: 'a@example.de', password: 'Hafen-Kran-Birke-47' }])
    expect(csv).toContain('"Müller; Anna";a@example.de')
  })

  it('Vorlage hat Kopfzeile und Beispielzeile mit allen vier Spalten', () => {
    const lines = buildTemplateCsv().replace('﻿', '').trim().split('\r\n')
    expect(lines[0]).toBe('Name;E-Mail;Bereich;Rolle')
    expect(lines[1].split(';')).toHaveLength(4)
  })

  it('Wiederholungsliste hat das Format der Vorlage und entschärft Formeln', () => {
    const csv = buildRetryCsv([
      { name: 'Anna Azubi', email: 'a@example.de', department: 'Spedition', role: '' },
      { name: '+evil', email: 'b@example.de', department: '', role: 'Lehrkraft' },
    ])
    const lines = csv.replace('\uFEFF', '').trim().split('\r\n')
    expect(lines[0]).toBe('Name;E-Mail;Bereich;Rolle')
    expect(lines[1]).toBe('Anna Azubi;a@example.de;Spedition;')
    expect(lines[2]).toBe("'+evil;b@example.de;;Lehrkraft")
  })
})
