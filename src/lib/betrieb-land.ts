/**
 * Landregel für „Mein Betrieb" (PROJ-34): Wie groß ist der Betriebsgrund?
 *
 * Das Land wird nie gespeichert, sondern aus der Zahl der gekauften Items
 * berechnet. Es wächst nach vorne/außen; die Kachel (0,0) hinten bleibt der
 * Anker. Dadurch ändert Wachstum nie die Position gesetzter Items, und das Land
 * kann nicht schrumpfen (Items werden nie entfernt, auch deaktivierte nicht).
 */

/** Kantenlänge in Kacheln bei null Käufen (Untergrenze). */
export const LAND_START = 4
/** Obergrenze der Kantenlänge. */
export const LAND_MAX = 10
/** So viele Kacheln soll das Land je gekauftem Item mindestens bieten (Luft zum Gestalten). */
export const KACHELN_JE_ITEM = 2
/** Grundfläche in Kacheln, die zusätzlich zur Item-Fläche dazukommt. */
export const KACHELN_PUFFER = 12

/**
 * Kantenlänge des Betriebsgrunds bei `anzahlItems` gekauften Items.
 *
 * Die Fläche wächst mit der Zahl der Käufe: Kantenlänge = Wurzel aus
 * (2 · Items + 12), aufgerundet, zwischen 4 und 10. Dadurch bleibt der Betrieb
 * immer luftig, wirkt aber nie leer (31 Items ≈ 9 × 9, nicht 10 × 10 mit
 * einem Drittel Belegung). Beispiele: 0 → 4 · 4 → 5 · 7 → 6 · 16 → 7 · 24 → 8 ·
 * 31 → 9 · ab 44 → 10.
 */
export function landSeite(anzahlItems: number): number {
  const n = Number.isFinite(anzahlItems) ? Math.max(0, Math.floor(anzahlItems)) : 0
  const roh = Math.ceil(Math.sqrt(KACHELN_JE_ITEM * n + KACHELN_PUFFER))
  return Math.min(LAND_MAX, Math.max(LAND_START, roh))
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
  const n = Number.isFinite(anzahlItems) ? Math.max(0, Math.floor(anzahlItems)) : 0
  const jetzt = landSeite(n)
  if (jetzt >= LAND_MAX) return null
  for (let m = n + 1; m <= n + 100; m++) if (landSeite(m) > jetzt) return m - n
  return null
}
