import { describe, expect, it } from 'vitest'
import {
  matchesSubstitute,
  addDays,
  addMonths,
  applyFilters,
  DEFAULT_FILTERS,
  emptyForm,
  findOverlaps,
  formatRange,
  groupByStartDay,
  matchesDepartment,
  monthGrid,
  todayIso,
  validateAbsenceForm,
  visibleRange,
  weekStart,
  type Absence,
} from './absence'

function absence(over: Partial<Absence> = {}): Absence {
  return {
    id: 'a1',
    personId: 'p1',
    personName: 'Anna Beispiel',
    createdById: 'p1',
    createdByName: 'Anna Beispiel',
    typeId: 't1',
    typeName: 'Fortbildung',
    typeColor: 'blue',
    typeIcon: 'GraduationCap',
    dateFrom: '2026-11-24',
    dateTo: '2026-11-25',
    allDay: true,
    timeFrom: null,
    timeTo: null,
    allDepartments: false,
    departments: ['spedition'],
    freeText: null,
    note: null,
    substituteStatus: 'open',
    statusSetByName: null,
    statusSetAt: null,
    changedAfterSubstitute: false,
    cancelledAt: null,
    cancelledByName: null,
    version: 1,
    updatedAt: '2026-11-19T08:00:00Z',
    updatedByName: null,
    canEdit: true,
    ...over,
  }
}

describe('Datumsrechnung', () => {
  it('rechnet über Monats- und Jahreswechsel', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addMonths('2026-11-19', 2)).toBe('2027-01-01')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01')
  })

  it('verschiebt am Tag der Zeitumstellung nichts', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })

  it('beginnt die Woche am Montag', () => {
    expect(weekStart('2026-11-19')).toBe('2026-11-16') // Donnerstag -> Montag
    expect(weekStart('2026-11-22')).toBe('2026-11-16') // Sonntag -> Montag davor
    expect(weekStart('2026-11-16')).toBe('2026-11-16')
  })

  it('baut ein Monatsraster aus 42 Tagen mit Montag zuerst', () => {
    const grid = monthGrid('2026-11-19')
    expect(grid).toHaveLength(42)
    expect(grid[0]).toBe('2026-10-26')
    expect(grid).toContain('2026-11-30')
  })

  it('liefert den sichtbaren Zeitraum je Ansicht', () => {
    expect(visibleRange('week', '2026-11-19')).toEqual({ from: '2026-11-16', to: '2026-11-22' })
    expect(visibleRange('list', '2026-11-19')).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(visibleRange('month', '2026-11-19').from).toBe('2026-10-26')
  })

  it('bestimmt „heute“ in deutscher Ortszeit', () => {
    // 23:30 UTC am 18.11. ist in Berlin schon der 19.11.
    expect(todayIso(new Date('2026-11-18T23:30:00Z'))).toBe('2026-11-19')
  })
})

describe('formatRange', () => {
  it('zeigt Tage und Uhrzeiten deutsch', () => {
    expect(formatRange(absence({ dateFrom: '2026-11-24', dateTo: '2026-11-24' }))).toBe('24.11.2026')
    expect(formatRange(absence())).toBe('24.11. – 25.11.2026')
    expect(
      formatRange(absence({ dateTo: '2026-11-24', allDay: false, timeFrom: '08:00', timeTo: '12:00' })),
    ).toBe('24.11.2026, 08:00–12:00 Uhr')
  })
})

describe('Filter', () => {
  it('zeigt bei Abteilungsfilter auch Einträge für „alle Abteilungen“', () => {
    const alle = absence({ id: 'x', allDepartments: true, departments: [] })
    const touristik = absence({ id: 'y', departments: ['touristik'] })
    expect(matchesDepartment(alle, 'spedition')).toBe(true)
    expect(matchesDepartment(touristik, 'spedition')).toBe(false)
    expect(matchesDepartment(touristik, 'alle')).toBe(true)
  })

  it('filtert nach Vertretung, Art und Name', () => {
    const items = [
      absence({ id: '1' }),
      absence({ id: '2', substituteStatus: 'entered', personName: 'Bernd Muster', typeId: 't2' }),
    ]
    expect(applyFilters(items, { ...DEFAULT_FILTERS, substitute: 'open' }).map((a) => a.id)).toEqual(['1'])
    expect(applyFilters(items, { ...DEFAULT_FILTERS, substitute: 'entered' }).map((a) => a.id)).toEqual(['2'])
    expect(applyFilters(items, { ...DEFAULT_FILTERS, typeId: 't2' }).map((a) => a.id)).toEqual(['2'])
    expect(applyFilters(items, { ...DEFAULT_FILTERS, search: 'MUSTER' }).map((a) => a.id)).toEqual(['2'])
  })

  it('gruppiert die Liste nach Starttag', () => {
    const groups = groupByStartDay([
      absence({ id: '1', dateFrom: '2026-11-25', dateTo: '2026-11-25' }),
      absence({ id: '2', dateFrom: '2026-11-24' }),
      absence({ id: '3', dateFrom: '2026-11-25', dateTo: '2026-11-26', personName: 'Aaron' }),
    ])
    expect(groups.map((g) => g.day)).toEqual(['2026-11-24', '2026-11-25'])
    expect(groups[1].items.map((a) => a.id)).toEqual(['3', '1'])
  })
})

describe('Formularprüfung', () => {
  const ok = { ...emptyForm('p1', '2026-11-24', 't1'), departments: ['spedition' as const] }

  it('akzeptiert einen gültigen Eintrag', () => {
    expect(validateAbsenceForm(ok)).toEqual({})
  })

  it('verlangt Von ≤ Bis und höchstens 365 Tage', () => {
    expect(validateAbsenceForm({ ...ok, dateTo: '2026-11-23' }).dateTo).toMatch(/nicht vor dem Beginn/)
    expect(validateAbsenceForm({ ...ok, dateTo: '2027-11-24' }).dateTo).toMatch(/365/)
    expect(validateAbsenceForm({ ...ok, dateTo: '2027-11-23' }).dateTo).toBeUndefined()
  })

  it('prüft Uhrzeiten nur bei nicht ganztägigen Einträgen', () => {
    expect(validateAbsenceForm({ ...ok, allDay: false, timeFrom: '12:00', timeTo: '08:00' }).timeTo).toBeDefined()
    expect(validateAbsenceForm({ ...ok, allDay: true, timeFrom: '12:00', timeTo: '08:00' })).toEqual({})
    // mehrtägig: Endzeit darf früher sein als Startzeit
    expect(
      validateAbsenceForm({ ...ok, dateTo: '2026-11-25', allDay: false, timeFrom: '12:00', timeTo: '08:00' }),
    ).toEqual({})
  })

  it('verlangt eine Abteilung oder „Alle“', () => {
    expect(validateAbsenceForm({ ...ok, departments: [] }).departments).toBeDefined()
    expect(validateAbsenceForm({ ...ok, departments: [], allDepartments: true })).toEqual({})
  })

  it('begrenzt Freitext und Notiz auf 300 Zeichen', () => {
    expect(validateAbsenceForm({ ...ok, note: 'x'.repeat(301) }).note).toBeDefined()
    expect(validateAbsenceForm({ ...ok, freeText: 'x'.repeat(300) }).freeText).toBeUndefined()
  })
})

describe('Überschneidung', () => {
  it('findet nur Einträge derselben Person im Zeitraum', () => {
    const items = [
      absence({ id: '1' }),
      absence({ id: '2', personId: 'p2' }),
      absence({ id: '3', dateFrom: '2026-12-01', dateTo: '2026-12-02' }),
    ]
    const hits = findOverlaps(items, { personId: 'p1', dateFrom: '2026-11-25', dateTo: '2026-11-26' })
    expect(hits.map((a) => a.id)).toEqual(['1'])
    expect(findOverlaps(items, { personId: 'p1', dateFrom: '2026-11-25', dateTo: '2026-11-26' }, '1')).toEqual([])
  })
})

describe('matchesSubstitute mit Stornierung (gelöscht nach Vertretung)', () => {
  const cancelled = { substituteStatus: 'entered' as const, cancelledAt: '2026-11-20T09:00:00Z' }
  it('zählt stornierte Einträge als „offen“, nicht als „eingetragen“', () => {
    expect(matchesSubstitute(cancelled, 'open')).toBe(true)
    expect(matchesSubstitute(cancelled, 'entered')).toBe(false)
    expect(matchesSubstitute(cancelled, 'alle')).toBe(true)
  })
})
