/**
 * Landregel für „Mein Betrieb" (PROJ-34): Wie groß ist der Betriebsgrund?
 *
 * Das Land wird nie gespeichert, sondern aus der Zahl der gekauften Items
 * berechnet. Es wächst nach vorne/außen; die Kachel (0,0) hinten bleibt der
 * Anker. Dadurch ändert Wachstum nie die Position gesetzter Items, und das Land
 * kann nicht schrumpfen (Items werden nie entfernt, auch deaktivierte nicht).
 */

/** Kantenlänge in Kacheln bei null Käufen. */
export const LAND_START = 4
/** Je so viele gekaufte Items wächst die Kantenlänge um eine Kachel. */
export const LAND_ITEMS_JE_STUFE = 3
/** Obergrenze der Kantenlänge. */
export const LAND_MAX = 10

export function landSeite(anzahlItems: number): number {
  const n = Math.max(0, Math.floor(anzahlItems))
  return Math.min(LAND_MAX, LAND_START + Math.floor(n / LAND_ITEMS_JE_STUFE))
}

/** Liegt die Kachel (Spalte x, Reihe y; ab 0) im Land der Kantenlänge `seite`? */
export function istImLand(x: number, y: number, seite: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < seite && y < seite
}

export function kachelAnzahl(seite: number): number {
  return seite * seite
}

/** Wie viele weitere Käufe bis zur nächsten Landerweiterung? `null` = Obergrenze erreicht. */
export function itemsBisNaechstemLand(anzahlItems: number): number | null {
  if (landSeite(anzahlItems) >= LAND_MAX) return null
  const n = Math.max(0, Math.floor(anzahlItems))
  return LAND_ITEMS_JE_STUFE - (n % LAND_ITEMS_JE_STUFE)
}
