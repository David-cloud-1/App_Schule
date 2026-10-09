import { describe, it, expect } from 'vitest'
import {
  RAND,
  baueKacheln,
  baueZaun,
  gitterGroesse,
  grundMitte,
  grundZuGitter,
  kachelMitte,
  tiefe,
  weltGrenzen,
} from './betrieb-welt'
import { LAND_START, landSeite } from './betrieb-land'

describe('Welt-Layout (PROJ-34)', () => {
  it('has a one-tile margin around the land', () => {
    expect(gitterGroesse(4)).toBe(4 + 2 * RAND)
    expect(baueKacheln(4)).toHaveLength(36)
    expect(baueKacheln(10)).toHaveLength(144)
  })

  it('maps land tiles into the grid with the margin offset', () => {
    expect(grundZuGitter(0, 0)).toEqual({ gx: RAND, gy: RAND })
    expect(grundZuGitter(3, 2)).toEqual({ gx: 3 + RAND, gy: 2 + RAND })
  })

  it('puts the road along the two front edges and meadow everywhere else', () => {
    const seite = 5
    const g = gitterGroesse(seite)
    const kacheln = baueKacheln(seite)
    for (const k of kacheln) {
      const vorne = k.gx === g - 1 || k.gy === g - 1
      expect(k.art).toBe(vorne ? 'weg' : 'wiese')
    }
    expect(kacheln.filter((k) => k.art === 'weg')).toHaveLength(2 * g - 1)
  })

  it('has unique grid tiles and deterministic variants (no flicker between renders)', () => {
    const a = baueKacheln(6)
    const b = baueKacheln(6)
    expect(a).toEqual(b)
    expect(new Set(a.map((k) => `${k.gx},${k.gy}`)).size).toBe(a.length)
  })

  it('fences exactly the two back edges of the land, once per tile edge', () => {
    const seite = 6
    const zaun = baueZaun(seite)
    expect(zaun).toHaveLength(2 * seite)
    expect(zaun.filter((z) => z.seite === 'y')).toHaveLength(seite)
    expect(zaun.filter((z) => z.seite === 'x')).toHaveLength(seite)
    for (const z of zaun.filter((z) => z.seite === 'y')) expect(z.gy).toBe(RAND)
    for (const z of zaun.filter((z) => z.seite === 'x')) expect(z.gx).toBe(RAND)
  })

  it('keeps the on-screen position of a land tile identical when the land grows', () => {
    for (const [x, y] of [[0, 0], [1, 2], [3, 3]] as const) {
      const vorher = grundMitte(x, y)
      // Position hängt nur von (x, y) ab – egal wie groß das Land ist
      expect(kachelMitte(x + RAND, y + RAND)).toEqual(vorher)
    }
  })

  it('draws further-back tiles first (painter order)', () => {
    expect(tiefe(1, 1)).toBeLessThan(tiefe(2, 1))
    expect(tiefe(2, 1)).toBe(tiefe(1, 2))
  })

  it('bounds contain every tile and grow with the land', () => {
    for (const seite of [4, 7, 10]) {
      const gr = weltGrenzen(seite)
      for (const k of baueKacheln(seite)) {
        const m = kachelMitte(k.gx, k.gy)
        expect(m.x).toBeGreaterThan(gr.minX)
        expect(m.x).toBeLessThan(gr.minX + gr.breite)
        expect(m.y).toBeGreaterThan(gr.minY)
        expect(m.y).toBeLessThan(gr.minY + gr.hoehe)
      }
    }
    expect(weltGrenzen(8).breite).toBeGreaterThan(weltGrenzen(4).breite)
    expect(weltGrenzen(8).hoehe).toBeGreaterThan(weltGrenzen(4).hoehe)
  })

  it('works for the start size from the land rule', () => {
    const seite = landSeite(0)
    expect(seite).toBe(LAND_START)
    expect(baueZaun(seite)).toHaveLength(2 * LAND_START)
  })
})
