import { describe, expect, it } from 'vitest'
import { baseTitle, copyWindow, escapeLike, nextCopyTitle, splitUnavailable } from './assessment-copy'

describe('nextCopyTitle', () => {
  it('hängt „(Kopie)“ an', () => {
    expect(nextCopyTitle('Klausur BGP', [])).toBe('Klausur BGP (Kopie)')
  })
  it('zählt bei Wiederholung hoch', () => {
    expect(nextCopyTitle('Klausur', ['Klausur (Kopie)'])).toBe('Klausur (Kopie 2)')
    expect(nextCopyTitle('Klausur', ['Klausur (Kopie)', 'Klausur (Kopie 2)'])).toBe('Klausur (Kopie 3)')
  })
  it('hängt bei einer Kopie nichts doppelt an', () => {
    expect(nextCopyTitle('Klausur (Kopie)', ['Klausur (Kopie)'])).toBe('Klausur (Kopie 2)')
    expect(nextCopyTitle('Klausur (Kopie 4)', [])).toBe('Klausur (Kopie)')
  })
  it('ignoriert Groß-/Kleinschreibung beim Vergleich', () => {
    expect(nextCopyTitle('Klausur', ['KLAUSUR (KOPIE)'])).toBe('Klausur (Kopie 2)')
  })
  it('kürzt zu lange Titel und bleibt bei 100 Zeichen', () => {
    const out = nextCopyTitle('x'.repeat(100), [])
    expect(out.length).toBeLessThanOrEqual(100)
    expect(out.endsWith('…  (Kopie)'.replace('  ', ' '))).toBe(true)
  })
})

describe('baseTitle', () => {
  it('entfernt nur den Zusatz am Ende', () => {
    expect(baseTitle('A (Kopie 2)')).toBe('A')
    expect(baseTitle('A (Kopie) neu')).toBe('A (Kopie) neu')
  })
})

describe('copyWindow', () => {
  it('liegt sieben Tage auseinander', () => {
    const w = copyWindow(new Date('2026-11-09T10:00:00.000Z'))
    expect(w.opensAt).toBe('2026-11-09T10:00:00.000Z')
    expect(w.closesAt).toBe('2026-11-16T10:00:00.000Z')
  })
})

describe('escapeLike', () => {
  it('maskiert Platzhalter', () => {
    expect(escapeLike('100%_ok')).toBe('100\\%\\_ok')
  })
})

describe('splitUnavailable', () => {
  it('trennt verfügbare von nicht verfügbaren und behält die Reihenfolge', () => {
    const r = splitUnavailable(['a', 'b', 'c'], [{ id: 'c' }, { id: 'a' }])
    expect(r.available).toEqual(['a', 'c'])
    expect(r.unavailable).toEqual(['b'])
  })
})
