import { TILE_H, TILE_W } from './hof-welt/iso'

/**
 * Aufbau der Welt von „Mein Betrieb" (PROJ-34) — reine Rechnung, ohne React.
 *
 * Zwei Koordinatensysteme:
 *  - **Betriebsgrund** (x, y ab 0): die Kacheln, auf die der Azubi Items setzt.
 *    (0,0) liegt hinten und bleibt beim Wachsen des Landes unverändert.
 *  - **Gitter** (gx, gy): der Betriebsgrund plus ein Rand von einer Kachel
 *    ringsum. Hinten (gx = 0 / gy = 0) liegt Wiese hinter dem Zaun, vorne
 *    (gx = seite + 1 / gy = seite + 1) die Straße.
 *
 * Bildschirmposition: `kachelMitte` hängt nur von (gx, gy) ab, nicht von der
 * Landgröße. Ein Item bleibt daher beim Wachsen des Landes exakt an derselben
 * Stelle im Bild; nur der Ausschnitt (`weltGrenzen`) wird größer.
 */

export type BodenArt = 'wiese' | 'weg'

export interface Gitterkachel {
  gx: number
  gy: number
  art: BodenArt
  /** Variante der Bodengrafik (deterministisch, damit nichts flackert). */
  variante: number
}

export interface Zaunstueck {
  gx: number
  gy: number
  /** 'x' = Zaun an der hinteren x-Kante, 'y' = an der hinteren y-Kante. */
  seite: 'x' | 'y'
}

export const RAND = 1
export const WIESEN_VARIANTEN = 6
export const WEG_VARIANTEN = 4

export function gitterGroesse(seite: number): number {
  return seite + 2 * RAND
}

export function grundZuGitter(x: number, y: number): { gx: number; gy: number } {
  return { gx: x + RAND, gy: y + RAND }
}

/** Mitte der Bodenraute einer Gitterkachel in Weltkoordinaten. */
export function kachelMitte(gx: number, gy: number): { x: number; y: number } {
  return { x: ((gx - gy) * TILE_W) / 2, y: ((gx + gy) * TILE_H) / 2 }
}

/** Mitte einer Kachel des Betriebsgrunds in Weltkoordinaten. */
export function grundMitte(x: number, y: number): { x: number; y: number } {
  const { gx, gy } = grundZuGitter(x, y)
  return kachelMitte(gx, gy)
}

/** Zeichenreihenfolge: weiter hinten (kleineres gx + gy) wird zuerst gezeichnet. */
export function tiefe(gx: number, gy: number): number {
  return gx + gy
}

/** Alle Kacheln des Gitters. Der Rand vorne ist Straße, der Rest Wiese. */
export function baueKacheln(seite: number): Gitterkachel[] {
  const g = gitterGroesse(seite)
  const out: Gitterkachel[] = []
  for (let gy = 0; gy < g; gy++) {
    for (let gx = 0; gx < g; gx++) {
      const vorne = gx === g - 1 || gy === g - 1
      out.push({
        gx,
        gy,
        art: vorne ? 'weg' : 'wiese',
        variante: vorne ? (gx * 7 + gy) % WEG_VARIANTEN : (gx * 5 + gy * 3) % WIESEN_VARIANTEN,
      })
    }
  }
  return out
}

/** Weißer Lattenzaun an den beiden hinteren Kanten des Betriebsgrunds. */
export function baueZaun(seite: number): Zaunstueck[] {
  const out: Zaunstueck[] = []
  for (let i = 0; i < seite; i++) {
    out.push({ ...grundZuGitter(i, 0), seite: 'y' })
    out.push({ ...grundZuGitter(0, i), seite: 'x' })
  }
  return out
}

export interface Grenzen {
  minX: number
  minY: number
  breite: number
  hoehe: number
}

/** Sichtbarer Ausschnitt der Welt; oben bleibt Platz für hohe Gebäude und Bäume. */
export function weltGrenzen(seite: number, platzOben = 96): Grenzen {
  const g = gitterGroesse(seite)
  const links = kachelMitte(0, g - 1).x - TILE_W / 2
  const rechts = kachelMitte(g - 1, 0).x + TILE_W / 2
  const oben = kachelMitte(0, 0).y - TILE_H / 2 - platzOben
  const unten = kachelMitte(g - 1, g - 1).y + TILE_H / 2 + 6
  return { minX: links, minY: oben, breite: rechts - links, hoehe: unten - oben }
}
