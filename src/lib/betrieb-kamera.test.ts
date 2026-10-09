import { describe, it, expect } from 'vitest'
import {
  ZOOM_MAX,
  ZOOM_MIN,
  ausschnittVon,
  bildschirmZuWelt,
  klammern,
  sichtbareBreite,
  startKamera,
  verschiebe,
  weltZuGrundKachel,
  zoomUm,
} from './betrieb-kamera'
import { grundMitte, weltGrenzen } from './betrieb-welt'

const g = weltGrenzen(6)

describe('Kamera (PROJ-34)', () => {
  it('starts centred on the world at zoom 1 and shows most of its width', () => {
    const k = startKamera(g)
    expect(k.zoom).toBe(1)
    expect(sichtbareBreite(g, 1)).toBeCloseTo(g.breite * 0.85, 5)
    const a = ausschnittVon(k, g, 1)
    expect(a.x + a.w / 2).toBeCloseTo(k.cx, 5)
    expect(a.y + a.h / 2).toBeCloseTo(k.cy, 5)
  })

  it('gives the view the aspect ratio of the window', () => {
    const a = ausschnittVon(startKamera(g), g, 2)
    expect(a.w / a.h).toBeCloseTo(2, 5)
  })

  it('shows less of the world when zoomed in', () => {
    expect(sichtbareBreite(g, 2)).toBeCloseTo(sichtbareBreite(g, 1) / 2, 5)
  })

  it('limits zoom to the allowed range', () => {
    const k = startKamera(g)
    expect(zoomUm(k, 100, k.cx, k.cy, g).zoom).toBe(ZOOM_MAX)
    expect(zoomUm(k, 0.001, k.cx, k.cy, g).zoom).toBe(ZOOM_MIN)
  })

  it('keeps the anchor point under the fingers when zooming', () => {
    const k = { cx: g.minX + g.breite / 2, cy: g.minY + g.hoehe / 2, zoom: 1 }
    const ankerX = k.cx + 60
    const ankerY = k.cy - 40
    const vorher = ausschnittVon(k, g, 1.2)
    const u = (ankerX - vorher.x) / vorher.w
    const v = (ankerY - vorher.y) / vorher.h
    const k2 = zoomUm(k, 1.6, ankerX, ankerY, g)
    const nachher = ausschnittVon(k2, g, 1.2)
    expect(nachher.x + u * nachher.w).toBeCloseTo(ankerX, 3)
    expect(nachher.y + v * nachher.h).toBeCloseTo(ankerY, 3)
  })

  it('can never push the world out of view (centre stays inside the world bounds)', () => {
    let k = startKamera(g)
    k = verschiebe(k, 1e6, -1e6, g)
    expect(k.cx).toBe(g.minX + g.breite)
    expect(k.cy).toBe(g.minY)
    k = verschiebe(k, -1e7, 1e7, g)
    expect(k.cx).toBe(g.minX)
    expect(k.cy).toBe(g.minY + g.hoehe)
  })

  it('klammern repairs invalid cameras', () => {
    const k = klammern({ cx: 1e9, cy: -1e9, zoom: 99 }, g)
    expect(k.zoom).toBe(ZOOM_MAX)
    expect(k.cx).toBeLessThanOrEqual(g.minX + g.breite)
    expect(k.cy).toBeGreaterThanOrEqual(g.minY)
  })

  it('translates a screen point into the world and back to the right tile', () => {
    const k = startKamera(g)
    const rect = { left: 10, top: 20, width: 400, height: 300 }
    const a = ausschnittVon(k, g, rect.width / rect.height)
    // Mitte des Fensters = Mitte der Kamera
    const mitte = bildschirmZuWelt(rect.left + rect.width / 2, rect.top + rect.height / 2, rect, a)
    expect(mitte.x).toBeCloseTo(k.cx, 5)
    expect(mitte.y).toBeCloseTo(k.cy, 5)
    // linke obere Ecke
    const ecke = bildschirmZuWelt(rect.left, rect.top, rect, a)
    expect(ecke.x).toBeCloseTo(a.x, 5)
    expect(ecke.y).toBeCloseTo(a.y, 5)
  })

  it('maps the centre of every land tile back to that tile (picking round trip)', () => {
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const m = grundMitte(x, y)
        expect(weltZuGrundKachel(m.x, m.y)).toEqual({ x, y })
      }
    }
  })

  it('still maps points near the corners of a tile diamond to that tile', () => {
    const m = grundMitte(3, 2)
    expect(weltZuGrundKachel(m.x + 30, m.y)).toEqual({ x: 3, y: 2 })
    expect(weltZuGrundKachel(m.x - 30, m.y)).toEqual({ x: 3, y: 2 })
    expect(weltZuGrundKachel(m.x, m.y + 15)).toEqual({ x: 3, y: 2 })
    expect(weltZuGrundKachel(m.x, m.y - 15)).toEqual({ x: 3, y: 2 })
  })

  it('reports tiles outside the land with coordinates outside 0..seite-1', () => {
    const m = grundMitte(-1, 0)
    expect(weltZuGrundKachel(m.x, m.y)).toEqual({ x: -1, y: 0 })
  })
})
