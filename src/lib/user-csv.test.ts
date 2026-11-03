import { describe, it, expect } from 'vitest'
import { buildUsersCsv, CSV_HEADER, formatCsvDate, neutralizeCsvText, userCsvRow, usersCsvFilename, type ExportUser } from './user-csv'

const BASE: ExportUser = {
  display_name: 'Anna Azubi',
  email: 'anna@example.de',
  role: 'student',
  department_name: 'Spedition',
  total_xp: 350,
  current_streak: 4,
  last_session_date: '2026-10-03',
  last_sign_in_at: '2026-10-03T08:00:00Z',
  created_at: '2026-09-01T10:00:00Z',
  banned: false,
}

describe('CSV-Export der Nutzerliste (PROJ-61)', () => {
  it('beginnt mit BOM und Kopfzeile, trennt mit Semikolon und endet mit Zeilenumbruch', () => {
    const csv = buildUsersCsv([BASE])
    expect(csv.startsWith('﻿' + CSV_HEADER.join(';'))).toBe(true)
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(CSV_HEADER).toHaveLength(11)
  })

  it('schreibt alle Spalten in der festen Reihenfolge inkl. Level aus den XP', () => {
    // 350 XP = Level 3 (300 XP für Level 3, 600 für Level 4)
    expect(userCsvRow(BASE)).toBe('Anna Azubi;anna@example.de;Azubi;Spedition;350;3;4;03.10.2026;03.10.2026;Aktiv;01.09.2026')
  })

  it('behält die übergebene Reihenfolge der Zeilen', () => {
    const lines = buildUsersCsv([{ ...BASE, display_name: 'Zora' }, { ...BASE, display_name: 'Adam' }]).split('\r\n')
    expect(lines[1]).toMatch(/^Zora;/)
    expect(lines[2]).toMatch(/^Adam;/)
  })

  it('zeigt Status „Gesperrt“, Rollenbezeichnungen und lässt fehlende Werte leer', () => {
    const row = userCsvRow({
      ...BASE,
      role: 'department_admin',
      banned: true,
      display_name: null,
      email: null,
      department_name: null,
      last_session_date: null,
      last_sign_in_at: null,
      created_at: undefined,
    })
    expect(row).toBe(';;Bereichs-Admin;;350;3;4;;;Gesperrt;')
  })

  it('behält Umlaute und setzt Zellen mit Semikolon, Anführungszeichen oder Zeilenumbruch in Anführungszeichen', () => {
    expect(userCsvRow({ ...BASE, display_name: 'Jörg; "Jo"\nMüller' }).split(';')[0]).toBe('"Jörg')
    expect(userCsvRow({ ...BASE, display_name: 'Jörg; "Jo"\nMüller' })).toContain('"Jörg; ""Jo""\nMüller"')
    expect(userCsvRow({ ...BASE, display_name: 'Ömer Çelik' })).toMatch(/^Ömer Çelik;/)
  })

  it.each(['=SUMME(A1)', '+49 170 1', '-2+3', '@cmd', '\tTab', '\rCR'])('entschärft Formel-Zellen: %j', (value) => {
    expect(neutralizeCsvText(value)).toBe(`'${value}`)
  })

  it('entschärft Namen und E-Mails in der Zeile, lässt normale Texte und Zahlen unberührt', () => {
    const row = userCsvRow({ ...BASE, display_name: '=HYPERLINK("x")', email: '-a@example.de' })
    expect(row.startsWith(`"'=HYPERLINK(""x"")";'-a@example.de;`)).toBe(true)
    expect(neutralizeCsvText('Anna')).toBe('Anna')
    expect(userCsvRow({ ...BASE, total_xp: 0 })).toContain(';0;1;')
  })

  it('formatiert Daten als TT.MM.JJJJ: Tageswerte unverändert, Zeitstempel nach Berliner Zeit', () => {
    expect(formatCsvDate('2026-10-03')).toBe('03.10.2026')
    // 22:30 UTC am 3.10. ist in Berlin (MESZ) schon der 4.10.
    expect(formatCsvDate('2026-10-03T22:30:00Z')).toBe('04.10.2026')
    expect(formatCsvDate(null)).toBe('')
    expect(formatCsvDate('kaputt')).toBe('')
  })
})

describe('Dateiname (PROJ-61)', () => {
  const now = new Date('2026-11-03T10:00:00Z')

  it('nutzer-{bereich}-{Datum}.csv', () => {
    expect(usersCsvFilename('Tourismus', now)).toBe('nutzer-tourismus-2026-11-03.csv')
  })

  it('macht aus Umlauten und Sonderzeichen einen sicheren Namen', () => {
    expect(usersCsvFilename('Kaufleute für Büro & Co.', now)).toBe('nutzer-kaufleute-fuer-buero-co-2026-11-03.csv')
  })

  it('nimmt „alle“, wenn kein Bereich gilt', () => {
    expect(usersCsvFilename(null, now)).toBe('nutzer-alle-2026-11-03.csv')
    expect(usersCsvFilename('###', now)).toBe('nutzer-alle-2026-11-03.csv')
  })

  it('zählt das Datum in Berliner Zeit', () => {
    expect(usersCsvFilename('alle', new Date('2026-11-03T23:30:00Z'))).toBe('nutzer-alle-2026-11-04.csv')
  })
})
