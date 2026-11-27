import { describe, it, expect } from 'vitest'
import {
  classNameForApi,
  hitToCandidate,
  HANDOFF_KEY,
  readHandoff,
  reviewState,
  suggestTitle,
  validateWhen,
  writeHandoff,
  type WhenValues,
} from './assessment-draft'
import { fromSchoolInputValue } from './assessment-deadline'

const now = new Date('2026-11-27T10:00:00Z')
const ok: WhenValues = {
  title: 'BGP · 27.11.2026',
  classChoice: { kind: 'name', name: 'SP10C' },
  opensAt: '',
  closesAt: '2026-11-27T23:59',
  durationMinutes: '45',
}
const check = (over: Partial<WhenValues> = {}) => validateWhen({ ...ok, ...over }, now, fromSchoolInputValue)

function memory() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    has: (k: string) => m.has(k),
  }
}

describe('validateWhen (PROJ-133, Schritt 3)', () => {
  it('lässt gültige Angaben durch', () => {
    expect(check()).toEqual({})
    expect(check({ classChoice: { kind: 'none' } })).toEqual({})
  })
  it('Klasse ist Pflicht: nichts gewählt oder leere Eingabe wird abgelehnt', () => {
    expect(check({ classChoice: { kind: 'unset' } }).className).toMatch(/Klasse/)
    expect(check({ classChoice: { kind: 'name', name: '  ' } }).className).toBeTruthy()
    expect(check({ classChoice: { kind: 'name', name: 'x'.repeat(31) } }).className).toMatch(/30/)
  })
  it('Beitritt bis in der Vergangenheit oder fehlend wird am Feld abgelehnt', () => {
    expect(check({ closesAt: '2026-11-27T10:00' }).closesAt).toMatch(/Vergangenheit/)
    expect(check({ closesAt: '' }).closesAt).toBeTruthy()
    expect(check({ closesAt: 'kaputt' }).closesAt).toBeTruthy()
  })
  it('Beitritt bis muss nach Beitritt ab liegen', () => {
    expect(check({ opensAt: '2026-11-28T08:00', closesAt: '2026-11-27T23:59' }).closesAt).toMatch(/nach/)
    expect(check({ opensAt: '2026-11-27T12:00', closesAt: '2026-11-27T23:59' })).toEqual({})
  })
  it('Titel und Dauer werden geprüft', () => {
    expect(check({ title: ' ' }).title).toBeTruthy()
    expect(check({ durationMinutes: '4' }).durationMinutes).toBeTruthy()
    expect(check({ durationMinutes: '601' }).durationMinutes).toBeTruthy()
    expect(check({ durationMinutes: 'abc' }).durationMinutes).toBeTruthy()
  })
})

describe('classNameForApi', () => {
  it('Name bereinigt, „Keine / gemischt“ als null', () => {
    expect(classNameForApi({ kind: 'name', name: '  SP10   C ' })).toBe('SP10 C')
    expect(classNameForApi({ kind: 'none' })).toBeNull()
  })
})

describe('reviewState (Schritt 2)', () => {
  it('ab einer Frage weiter, unter 5 mit Hinweis', () => {
    expect(reviewState(0)).toEqual({ canContinue: false, hint: expect.any(String) })
    expect(reviewState(1)).toEqual({ canContinue: true, hint: expect.stringContaining('5') })
    expect(reviewState(5)).toEqual({ canContinue: true, hint: null })
  })
})

describe('suggestTitle', () => {
  it('nennt Fach, Thema und Datum', () => {
    expect(suggestTitle(['BGP'], ['Luftfracht'], now)).toBe('BGP · Luftfracht · 27.11.2026')
    expect(suggestTitle([], ['A', 'B'], now)).toBe('2 Themen · 27.11.2026')
    expect(suggestTitle([], [], now)).toBe('27.11.2026')
  })
})

describe('hitToCandidate', () => {
  it('übernimmt Schwierigkeit und rechnet die Richtig-Zahl zurück', () => {
    const c = hitToCandidate({
      id: 'a', question_text: 'F', topic: 'T', class_level: 11, subject_codes: ['BGP'],
      level: 'schwer', rate: 25, rated: true, attempts: 40, isPrivate: false, blocked: false, openReports: 0,
    })
    expect(c.correct).toBe(10)
    expect(c.level).toBe('schwer')
  })
})

describe('Übergabe aus „Schwierig“', () => {
  it('wird genau einmal gelesen und danach gelöscht', () => {
    const s = memory()
    expect(writeHandoff(s, { questionIds: ['a', 'b', 'a'], departmentId: 'd' })).toBe(true)
    expect(readHandoff(s)).toEqual({ questionIds: ['a', 'b'], departmentId: 'd' })
    expect(s.has(HANDOFF_KEY)).toBe(false)
    expect(readHandoff(s)).toBeNull()
  })
  it('kaputte oder leere Daten ergeben null', () => {
    const s = memory()
    s.setItem(HANDOFF_KEY, '{kaputt')
    expect(readHandoff(s)).toBeNull()
    s.setItem(HANDOFF_KEY, JSON.stringify({ questionIds: [] }))
    expect(readHandoff(s)).toBeNull()
    s.setItem(HANDOFF_KEY, JSON.stringify({ questionIds: [1] }))
    expect(readHandoff(s)).toBeNull()
  })
  it('ein Speicher, der nicht schreiben darf, ergibt false', () => {
    expect(writeHandoff({ setItem: () => { throw new Error('voll') } }, { questionIds: ['a'], departmentId: null })).toBe(false)
  })
})

describe('validateWhat (Schritt 1)', () => {
  it('verlangt ein Fach, eine Anzahl von 5 bis 60 und 100 % Verteilung', async () => {
    const { initialWhat, validateWhat } = await import('./assessment-draft')
    const base = initialWhat()
    expect(validateWhat({ ...base, subjects: ['BGP'] })).toEqual({})
    expect(validateWhat(base).subjects).toMatch(/Fach/)
    expect(validateWhat({ ...base, subjects: ['BGP'], countText: '4' }).count).toBeTruthy()
    expect(validateWhat({ ...base, subjects: ['BGP'], countText: '61' }).count).toBeTruthy()
    expect(validateWhat({ ...base, subjects: ['BGP'], countText: 'x' }).count).toBeTruthy()
    expect(
      validateWhat({ ...base, subjects: ['BGP'], preset: 'eigen', custom: { leicht: 10, mittel: 10, schwer: 10 } }).mix,
    ).toBeTruthy()
  })
})

describe('groupByDepartment (E4)', () => {
  it('gruppiert nach Bereich, ohne Doppelte, Unbekannte unter dem leeren Schlüssel', async () => {
    const { groupByDepartment } = await import('./assessment-draft')
    const g = groupByDepartment([
      { question_id: 'a', department_id: 'd1' },
      { question_id: 'b', department_id: 'd2' },
      { question_id: 'a', department_id: 'd1' },
      { question_id: 'c', department_id: null },
    ])
    expect([...g.entries()]).toEqual([
      ['d1', ['a']],
      ['d2', ['b']],
      ['', ['c']],
    ])
  })
})
