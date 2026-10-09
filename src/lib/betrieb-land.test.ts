import { describe, it, expect } from 'vitest'
import {
  LAND_ITEMS_JE_STUFE,
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

  it('grows by one tile edge per documented number of items', () => {
    expect(landSeite(LAND_ITEMS_JE_STUFE - 1)).toBe(LAND_START)
    expect(landSeite(LAND_ITEMS_JE_STUFE)).toBe(LAND_START + 1)
    expect(landSeite(2 * LAND_ITEMS_JE_STUFE)).toBe(LAND_START + 2)
  })

  it('never shrinks when more items are owned (monotonic)', () => {
    let vorher = 0
    for (let n = 0; n <= 80; n++) {
      const s = landSeite(n)
      expect(s).toBeGreaterThanOrEqual(vorher)
      vorher = s
    }
  })

  it('stops at the upper limit', () => {
    expect(landSeite(1000)).toBe(LAND_MAX)
    expect(landSeite((LAND_MAX - LAND_START) * LAND_ITEMS_JE_STUFE)).toBe(LAND_MAX)
  })

  it('treats invalid counts defensively', () => {
    expect(landSeite(-5)).toBe(LAND_START)
    expect(landSeite(2.9)).toBe(LAND_START)
  })

  it('keeps every tile valid at the old size valid at any larger size (growth never moves items)', () => {
    for (let n = 0; n < 40; n++) {
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

  it('reports how many purchases remain until the next land step', () => {
    expect(itemsBisNaechstemLand(0)).toBe(LAND_ITEMS_JE_STUFE)
    expect(itemsBisNaechstemLand(1)).toBe(LAND_ITEMS_JE_STUFE - 1)
    expect(itemsBisNaechstemLand(LAND_ITEMS_JE_STUFE)).toBe(LAND_ITEMS_JE_STUFE)
    expect(itemsBisNaechstemLand(1000)).toBeNull()
  })
})
