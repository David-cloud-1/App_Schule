import { describe, it, expect } from 'vitest'
import {
  LAND_MAX,
  LAND_START,
  istImLand,
  itemsBisNaechstemLand,
  kachelAnzahl,
  landSeite,
} from './betrieb-land'

describe('Landregel (PROJ-34)', () => {
  it('starts at the documented size without purchases', () => {
    expect(landSeite(0)).toBe(LAND_START)
    expect(kachelAnzahl(landSeite(0))).toBe(16)
  })

  it('matches the documented examples', () => {
    const erwartet: [number, number][] = [[0, 4], [4, 5], [7, 6], [16, 7], [24, 8], [31, 9], [44, 10]]
    for (const [items, seite] of erwartet) expect(landSeite(items), `${items} Items`).toBe(seite)
  })

  it('never shrinks when more items are owned (monotonic)', () => {
    let vorher = 0
    for (let n = 0; n <= 200; n++) {
      const s = landSeite(n)
      expect(s).toBeGreaterThanOrEqual(vorher)
      vorher = s
    }
  })

  it('always leaves room: at least twice as many tiles as items, up to the limit', () => {
    for (let n = 0; n <= 44; n++) expect(kachelAnzahl(landSeite(n))).toBeGreaterThanOrEqual(2 * n)
  })

  it('does not look empty: tiles never exceed the items by a huge factor once the land is bigger than the start', () => {
    for (let n = 8; n <= 44; n++) expect(kachelAnzahl(landSeite(n)) / n).toBeLessThan(5)
  })

  it('stops at the upper limit', () => {
    expect(landSeite(1000)).toBe(LAND_MAX)
  })

  it('treats invalid counts defensively', () => {
    expect(landSeite(-5)).toBe(LAND_START)
    expect(landSeite(0.9)).toBe(LAND_START)
    expect(landSeite(Number.NaN)).toBe(LAND_START)
  })

  it('keeps every tile valid at the old size valid at any larger size (growth never moves items)', () => {
    for (let n = 0; n < 60; n++) {
      const alt = landSeite(n)
      const neu = landSeite(n + 1)
      for (let x = 0; x < alt; x++) for (let y = 0; y < alt; y++) expect(istImLand(x, y, neu)).toBe(true)
    }
  })

  it('istImLand accepts only whole tiles inside the land', () => {
    expect(istImLand(0, 0, 4)).toBe(true)
    expect(istImLand(3, 3, 4)).toBe(true)
    expect(istImLand(4, 0, 4)).toBe(false)
    expect(istImLand(0, 4, 4)).toBe(false)
    expect(istImLand(-1, 0, 4)).toBe(false)
    expect(istImLand(1.5, 0, 4)).toBe(false)
    expect(istImLand(Number.NaN, 0, 4)).toBe(false)
  })

  it('reports how many purchases remain until the next land step, consistent with landSeite', () => {
    for (let n = 0; n < 44 && landSeite(n) < LAND_MAX; n++) {
      const rest = itemsBisNaechstemLand(n)!
      expect(rest).toBeGreaterThanOrEqual(1)
      expect(landSeite(n + rest)).toBeGreaterThan(landSeite(n))
      expect(landSeite(n + rest - 1)).toBe(landSeite(n))
    }
    expect(itemsBisNaechstemLand(1000)).toBeNull()
  })
})
