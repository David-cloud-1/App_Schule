import { describe, it, expect } from 'vitest'
import {
  GESCHWINDIGKEIT,
  laeuft,
  naechsteFreieKachel,
  schluessel,
  schritt,
  waehleStart,
  zufall,
  type Wanderer,
} from './betrieb-wandern'

const leer = new Set<string>()
const lauf = (w: Wanderer, ms: number, seite: number, blockiert: ReadonlySet<string> = leer, takt = 100) => {
  const verlauf: { x: number; y: number }[] = []
  for (let t = 0; t < ms; t += takt) {
    schritt(w, takt, seite, blockiert)
    verlauf.push({ x: w.x, y: w.y })
  }
  return verlauf
}

describe('Wandern (PROJ-37)', () => {
  it('the random source is deterministic and uniform enough', () => {
    let z = 1
    const werte: number[] = []
    for (let i = 0; i < 200; i++) {
      const r = zufall(z)
      z = r.zustand
      werte.push(r.wert)
    }
    expect(werte.every((v) => v >= 0 && v < 1)).toBe(true)
    expect(Math.min(...werte)).toBeLessThan(0.15)
    expect(Math.max(...werte)).toBeGreaterThan(0.85)
    let z2 = 1
    expect(zufall(z2).wert).toBe(werte[0])
    z2 = zufall(z2).zustand
    expect(zufall(z2).wert).toBe(werte[1])
  })

  it('starts on a free tile and never on a blocked one', () => {
    const blockiert = new Set([schluessel(0, 0), schluessel(1, 0), schluessel(2, 2)])
    for (let seed = 1; seed < 60; seed++) {
      const w = waehleStart('a', seed, 4, blockiert)!
      expect(blockiert.has(schluessel(w.x, w.y))).toBe(false)
      expect(w.x).toBeGreaterThanOrEqual(0)
      expect(w.x).toBeLessThan(4)
    }
  })

  it('has no start when every tile is taken', () => {
    const alle = new Set<string>()
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) alle.add(schluessel(x, y))
    expect(waehleStart('a', 1, 4, alle)).toBeNull()
  })

  it('is deterministic: same seed and same inputs give the same walk', () => {
    const a = waehleStart('a', 42, 6, leer)!
    const b = waehleStart('a', 42, 6, leer)!
    expect(lauf(a, 30000, 6)).toEqual(lauf(b, 30000, 6))
  })

  it('different seeds walk differently', () => {
    const a = lauf(waehleStart('a', 1, 6, leer)!, 30000, 6)
    const b = lauf(waehleStart('b', 2, 6, leer)!, 30000, 6)
    expect(a).not.toEqual(b)
  })

  it('stays inside the land and only ever moves along tile edges between free tiles', () => {
    const blockiert = new Set([schluessel(1, 1), schluessel(2, 1), schluessel(1, 2), schluessel(3, 3)])
    for (let seed = 1; seed <= 12; seed++) {
      const w = waehleStart('a', seed, 5, blockiert)!
      for (const p of lauf(w, 60000, 5, blockiert, 80)) {
        expect(p.x).toBeGreaterThanOrEqual(-1e-9)
        expect(p.y).toBeGreaterThanOrEqual(-1e-9)
        expect(p.x).toBeLessThanOrEqual(4 + 1e-9)
        expect(p.y).toBeLessThanOrEqual(4 + 1e-9)
        // nie auf einer belegten Kachel (auch nicht zwischen zwei Kacheln darüber)
        const nah = [Math.floor(p.x), Math.ceil(p.x)].flatMap((x) => [Math.floor(p.y), Math.ceil(p.y)].map((y) => schluessel(x, y)))
        const inBlock = nah.filter((k) => blockiert.has(k))
        if (inBlock.length > 0) {
          // eine Figur zwischen zwei freien Kacheln berührt nie eine belegte Kachel als Zielkachel
          const rx = Math.round(p.x)
          const ry = Math.round(p.y)
          expect(blockiert.has(schluessel(rx, ry))).toBe(false)
        }
        // immer auf einer Gitterlinie (eine Koordinate ganzzahlig)
        expect(Math.abs(p.x - Math.round(p.x)) < 1e-9 || Math.abs(p.y - Math.round(p.y)) < 1e-9).toBe(true)
      }
    }
  })

  it('walks slowly: about 0.4 tiles per second', () => {
    const w = waehleStart('a', 5, 6, leer)!
    w.pause = 0
    let weg = 0
    let letzte = { x: w.x, y: w.y }
    for (let t = 0; t < 5000; t += 50) {
      schritt(w, 50, 6, leer)
      weg += Math.hypot(w.x - letzte.x, w.y - letzte.y)
      letzte = { x: w.x, y: w.y }
    }
    expect(weg).toBeLessThanOrEqual(GESCHWINDIGKEIT * 5 + 0.05)
    expect(weg).toBeGreaterThan(0.2)
  })

  it('pauses between steps (stands still for a while)', () => {
    const w = waehleStart('a', 9, 6, leer)!
    const stand = lauf(w, 40000, 6).filter((_, i, a) => i > 0 && a[i]!.x === a[i - 1]!.x && a[i]!.y === a[i - 1]!.y)
    expect(stand.length).toBeGreaterThan(20)
  })

  it('stands still when there is no free neighbour', () => {
    const blockiert = new Set([schluessel(1, 0), schluessel(0, 1)])
    // Start erzwingen: nur (0,0) ist frei; danach wird (1,1) wieder frei, aber nicht erreichbar
    const w = waehleStart('a', 3, 2, new Set([schluessel(1, 0), schluessel(0, 1), schluessel(1, 1)]))!
    expect(schluessel(w.x, w.y)).toBe(schluessel(0, 0))
    lauf(w, 20000, 2, blockiert)
    expect([w.x, w.y]).toEqual([0, 0])
  })

  it('steps aside at once when its tile gets taken (player places an item under it)', () => {
    const w = waehleStart('a', 7, 5, leer)!
    w.pause = 1e9
    const hier = schluessel(w.x, w.y)
    schritt(w, 100, 5, new Set([hier]))
    lauf(w, 20000, 5, new Set([hier]))
    expect(schluessel(Math.round(w.x), Math.round(w.y))).not.toBe(hier)
  })

  it('drops a step that leads onto a tile that became blocked', () => {
    const w = waehleStart('a', 11, 6, leer)!
    w.pause = 0
    schritt(w, 100, 6, leer)
    expect(laeuft(w)).toBe(true)
    const ziel = schluessel(w.zielX, w.zielY)
    schritt(w, 100, 6, new Set([ziel]))
    expect(schluessel(w.zielX, w.zielY)).not.toBe(ziel)
  })

  it('ignores huge time steps (tab switch) instead of jumping across the map', () => {
    const w = waehleStart('a', 4, 8, leer)!
    w.pause = 0
    const vorher = { x: w.x, y: w.y }
    schritt(w, 60000, 8, leer)
    expect(Math.hypot(w.x - vorher.x, w.y - vorher.y)).toBeLessThanOrEqual(1.0001)
  })

  it('stays near its home when one is given (guests stay at their building)', () => {
    const heimat = { x: 3, y: 3, radius: 2 }
    for (let seed = 1; seed <= 8; seed++) {
      const w = waehleStart('g', seed, 9, leer, heimat)!
      for (const p of lauf(w, 80000, 9, leer, 100)) {
        expect(Math.abs(p.x - heimat.x) + Math.abs(p.y - heimat.y)).toBeLessThanOrEqual(heimat.radius + 1 + 1e-9)
      }
    }
  })

  it('faces the direction it walks', () => {
    const w = waehleStart('a', 2, 6, leer)!
    w.pause = 0
    schritt(w, 100, 6, leer)
    const erwartet = w.zielX > Math.round(w.x) ? 'se' : w.zielX < Math.round(w.x) ? 'nw' : w.zielY > Math.round(w.y) ? 'sw' : 'ne'
    expect(w.richtung).toBe(erwartet)
  })

  it('finds the nearest free tile around a blocked one', () => {
    const blockiert = new Set([schluessel(2, 2), schluessel(3, 2), schluessel(2, 3)])
    const ziel = naechsteFreieKachel(2, 2, 6, blockiert)!
    expect(blockiert.has(schluessel(ziel.x, ziel.y))).toBe(false)
    expect(Math.abs(ziel.x - 2) + Math.abs(ziel.y - 2)).toBeLessThanOrEqual(2)
    expect(naechsteFreieKachel(0, 0, 1, new Set([schluessel(0, 0)]))).toBeNull()
  })
})
