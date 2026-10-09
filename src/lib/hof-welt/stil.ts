/**
 * Stilschicht „Hay-Day-inspiriert" (PROJ-34) — wird als letzter Schritt auf ein
 * fertiges Sprite-SVG gelegt: Farben satter und eine Spur wärmer, Konturen
 * kräftiger. Die Zeichenfunktionen des Tycoons bleiben dadurch unverändert, und
 * der Stil lässt sich an einer Stelle justieren.
 */

export interface Stil {
  /** Faktor für die Sättigung (1 = unverändert). */
  saettigung: number
  /** Aufhellung in Prozentpunkten der Helligkeit. */
  hell: number
  /** Faktor für alle Konturbreiten. */
  kontur: number
  /** Kühle Grautöne (Blech, Beton, Dachgrau) in warme Töne umfärben. */
  waermeGrau?: boolean
  /** Einheitliche, warme Konturfarbe statt der je Fläche abgedunkelten. */
  konturFarbe?: string
}

export const STIL_TYCOON: Stil = { saettigung: 1, hell: 0, kontur: 1 }
export const STIL_HAYDAY: Stil = { saettigung: 1.28, hell: 0.025, kontur: 1.75 }
/** Weicher Stil (Stilprobe 5): Farben unverändert, Konturen deutlich dünner. */
export const STIL_WEICH: Stil = { saettigung: 1.08, hell: 0.015, kontur: 0.55 }
/** Kräftigere Variante: warme Grautöne, einheitlich braune Konturen. */
export const STIL_HAYDAY_STARK: Stil = {
  saettigung: 1.45,
  hell: 0.04,
  kontur: 2.1,
  waermeGrau: true,
  konturFarbe: '#5a3a24',
}

function hexZuHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h / 6, s, l]
}

function hslZuHex(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t: number) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return `#${c(f(h + 1 / 3))}${c(f(h))}${c(f(h - 1 / 3))}`
}

/** Wendet den Stil auf ein SVG-Textstück an (Hex-Farben und Konturbreiten). */
export function stilAnwenden(svg: string, stil: Stil): string {
  if (stil === STIL_TYCOON) return svg
  const umfaerben = (m: string, alsKontur: boolean): string => {
    const [h, s, l] = hexZuHsl(m)
    if (alsKontur && stil.konturFarbe && l < 0.4) return stil.konturFarbe
    // Sehr dunkle und sehr helle Töne (Schatten, Glanz) kaum anfassen.
    const mitte = l > 0.12 && l < 0.92
    let hue = h
    let sat = s
    if (stil.waermeGrau && mitte && s < 0.3 && h > 0.45 && h < 0.75) {
      // kühles Blaugrau -> warmes Sand/Terrakotta
      hue = 0.085
      sat = 0.22 + s * 0.8
    }
    return hslZuHex(hue, Math.min(1, sat * (mitte ? stil.saettigung : 1)), Math.min(1, l + (mitte ? stil.hell : 0)))
  }
  return svg
    .replace(/stroke="(#[0-9a-fA-F]{6})"/g, (_m, c) => `stroke="${umfaerben(c, true)}"`)
    .replace(/(fill|stop-color)="(#[0-9a-fA-F]{6})"/g, (_m, a, c) => `${a}="${umfaerben(c, false)}"`)
    .replace(/stroke-width="([\d.]+)"/g, (_m, w) => `stroke-width="${(parseFloat(w) * stil.kontur).toFixed(2)}"`)
}
