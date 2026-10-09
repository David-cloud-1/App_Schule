import { TILE_H, TILE_W } from './hof-welt/iso'
import { RAND, type Grenzen } from './betrieb-welt'

/**
 * Kamera und Bildschirm-Umrechnung für „Mein Betrieb" (PROJ-34) — reine
 * Rechnung ohne Browser, damit Zoomen, Verschieben und Antippen testbar sind.
 *
 * Die Kamera ist ein Mittelpunkt in Weltkoordinaten plus Zoomfaktor. Sichtbar
 * ist ein Ausschnitt (viewBox) mit dem Seitenverhältnis des Anzeigefensters.
 */

export interface Kamera {
  cx: number
  cy: number
  zoom: number
}

export interface Ausschnitt {
  x: number
  y: number
  w: number
  h: number
}

export const ZOOM_MIN = 0.7
export const ZOOM_MAX = 3.2
/** Bei Zoom 1 ist so viel von der Weltbreite zu sehen. */
export const ANTEIL_BREITE = 0.85

const klemme = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function sichtbareBreite(grenzen: Grenzen, zoom: number): number {
  return (grenzen.breite * ANTEIL_BREITE) / zoom
}

/** Sichtbarer Ausschnitt; `seitenverhaeltnis` = Breite / Höhe des Anzeigefensters. */
export function ausschnittVon(k: Kamera, grenzen: Grenzen, seitenverhaeltnis: number): Ausschnitt {
  const w = sichtbareBreite(grenzen, k.zoom)
  const h = w / Math.max(0.2, seitenverhaeltnis)
  return { x: k.cx - w / 2, y: k.cy - h / 2, w, h }
}

/** Mittelpunkt der Welt – die Startposition und das Ziel von „Zentrieren". */
export function startKamera(grenzen: Grenzen): Kamera {
  // Oben liegt viel Platz für hohe Gebäude; der Schwerpunkt der Kacheln sitzt tiefer.
  return { cx: grenzen.minX + grenzen.breite / 2, cy: grenzen.minY + grenzen.hoehe * 0.58, zoom: 1 }
}

/** Zoom und Mittelpunkt in zulässige Grenzen zwingen: die Welt kann nie aus dem Bild geschoben werden. */
export function klammern(k: Kamera, grenzen: Grenzen): Kamera {
  return {
    zoom: klemme(k.zoom, ZOOM_MIN, ZOOM_MAX),
    cx: klemme(k.cx, grenzen.minX, grenzen.minX + grenzen.breite),
    cy: klemme(k.cy, grenzen.minY, grenzen.minY + grenzen.hoehe),
  }
}

/** Zoomt um einen Weltpunkt: dieser Punkt bleibt unter den Fingern stehen. */
export function zoomUm(k: Kamera, faktor: number, ankerX: number, ankerY: number, grenzen: Grenzen): Kamera {
  const zoom = klemme(k.zoom * faktor, ZOOM_MIN, ZOOM_MAX)
  const verhaeltnis = k.zoom / zoom
  return klammern(
    { zoom, cx: ankerX + (k.cx - ankerX) * verhaeltnis, cy: ankerY + (k.cy - ankerY) * verhaeltnis },
    grenzen,
  )
}

/** Verschiebt die Kamera um einen Weltabstand. */
export function verschiebe(k: Kamera, dx: number, dy: number, grenzen: Grenzen): Kamera {
  return klammern({ ...k, cx: k.cx + dx, cy: k.cy + dy }, grenzen)
}

export interface Rechteck {
  left: number
  top: number
  width: number
  height: number
}

/** Bildschirmpunkt (clientX/Y) -> Weltpunkt. Der Ausschnitt hat das Seitenverhältnis des Fensters. */
export function bildschirmZuWelt(clientX: number, clientY: number, rect: Rechteck, a: Ausschnitt): { x: number; y: number } {
  return {
    x: a.x + ((clientX - rect.left) / rect.width) * a.w,
    y: a.y + ((clientY - rect.top) / rect.height) * a.h,
  }
}

/** Weltpunkt -> Kachel des Betriebsgrunds (x, y ab 0; kann außerhalb des Landes liegen). */
export function weltZuGrundKachel(wx: number, wy: number): { x: number; y: number } {
  const a = wx / (TILE_W / 2) // gx - gy
  const b = wy / (TILE_H / 2) // gx + gy
  return { x: Math.round((a + b) / 2) - RAND, y: Math.round((b - a) / 2) - RAND }
}
