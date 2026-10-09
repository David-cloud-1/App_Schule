import { iso, ton, quader, schatten } from './iso'
import type { Teil } from './bauteile'

/**
 * Spedition-Sprites im weichen Stil (PROJ-34, Schritt 6): Fahrzeuge, Hofdeko,
 * Ladung und Abzeichen. Alles aus denselben Bausteinen wie natur.ts (Quader mit
 * Verläufen, dünne Konturen, weiche Schatten). Fahrzeuge schauen nach Südost.
 */

const r1 = (n: number) => Math.round(n * 10) / 10
const pu = (u: number, v: number, w: number) => iso(u, v, w).map(r1).join(',')
const BLUR = '<filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>'
const KONTUR = '#5a3a24'

const oval = (rx: number): string => {
  const [x, y] = iso(0, 0, 0)
  return `<defs>${BLUR}</defs><ellipse cx="${r1(x)}" cy="${r1(y + 1)}" rx="${rx}" ry="${r1(rx * 0.42)}" fill="#1e4d12" opacity="0.3" filter="url(#b)"/>`
}

/** Quader aus Mittelpunkt und Maßen. */
const box = (u: number, v: number, z: number, lu: number, lv: number, h: number, farbe: string, dach?: string): string =>
  quader({ u0: u - lu / 2, v0: v - lv / 2, u1: u + lu / 2, v1: v + lv / 2, z, h, farbe, dachFarbe: dach })

/** Rad an der Südwest-Seite (v konstant). */
const rad = (u: number, v: number, z: number, r = 5): string => {
  const [x, y] = iso(u, v, z)
  return (
    `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="#2b2f3a" stroke="#14161c" stroke-width="0.7"/>` +
    `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 0.42)}" fill="#c9ced6"/>`
  )
}

const kreis = (x: number, y: number, r: number, f: string, st = KONTUR, sw = 0.8): string =>
  `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${f}" stroke="${st}" stroke-width="${sw}"/>`

// ── Fahrzeuge ────────────────────────────────────────────────────────────────

export function gabelstapler(): Teil {
  const s: string[] = [oval(26)]
  s.push(box(-0.06, 0, 4, 0.44, 0.26, 9, '#f08a1c', '#ffa93a'))
  s.push(box(-0.26, 0, 13, 0.1, 0.26, 7, '#8a919c'))
  for (const v of [-0.1, 0.1]) s.push(box(-0.1, v, 13, 0.025, 0.025, 15, '#4b5563'))
  s.push(box(-0.1, 0, 28, 0.3, 0.28, 2.5, '#4b5563', '#6b7280'))
  s.push(box(-0.14, 0, 13, 0.13, 0.12, 3.5, '#6b7280'))
  for (const v of [-0.1, 0.1]) s.push(box(0.2, v, 4, 0.03, 0.03, 36, '#8a919c'))
  for (const v of [-0.07, 0.07]) s.push(box(0.34, v, 4.5, 0.28, 0.035, 2.2, '#aab0ba'))
  s.push(box(0.35, 0, 7, 0.2, 0.2, 9, '#e0b070', '#f0c888'))
  s.push(rad(-0.2, 0.13, 5, 5.5), rad(0.1, 0.13, 4.5, 4.4))
  return { svg: s.join(''), hoehe: 36 }
}

export function anhaenger(): Teil {
  const s: string[] = [oval(30)]
  s.push(box(0, 0, 6, 0.74, 0.34, 4, '#8b6a45', '#b08a5a'))
  s.push(box(-0.2, -0.04, 10, 0.2, 0.2, 14, '#e2543a', '#f27a5c'))
  s.push(box(0.08, 0.02, 10, 0.2, 0.2, 10, '#2f8cf0', '#5aa8f8'))
  s.push(box(0.28, -0.03, 10, 0.12, 0.14, 7, '#f4c95a', '#ffe08a'))
  s.push(box(0.5, 0, 6, 0.2, 0.04, 2, '#6b7280'))
  s.push(rad(-0.16, 0.18, 5, 5), rad(0.04, 0.18, 5, 5))
  return { svg: s.join(''), hoehe: 26 }
}

export function lieferwagenGelb(): Teil {
  const s: string[] = [oval(28)]
  s.push(box(-0.1, 0, 4, 0.5, 0.3, 20, '#ffd23f', '#ffe27a'))
  s.push(box(0.26, 0, 4, 0.24, 0.3, 12, '#ffd23f', '#ffe27a'))
  const glas = `<polygon points="${pu(0.382, -0.12, 11)} ${pu(0.382, 0.12, 11)} ${pu(0.382, 0.12, 15)} ${pu(0.382, -0.12, 15)}" fill="#9bdcf5" stroke="${KONTUR}" stroke-width="0.6"/>`
  s.push(glas)
  s.push(`<polygon points="${pu(0.14, 0.152, 14)} ${pu(0.14, 0.152, 21)} ${pu(0.36, 0.152, 14)}" fill="#9bdcf5" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(`<polygon points="${pu(-0.34, 0.152, 12)} ${pu(0.1, 0.152, 12)} ${pu(0.1, 0.152, 15)} ${pu(-0.34, 0.152, 15)}" fill="#e2543a"/>`)
  s.push(rad(-0.2, 0.15, 5, 5), rad(0.28, 0.15, 5, 5))
  return { svg: s.join(''), hoehe: 28 }
}

export function tieflader(): Teil {
  const s: string[] = [oval(32)]
  s.push(box(0.12, 0, 4, 0.78, 0.3, 3.5, '#6b7280', '#8a919c'))
  s.push(box(-0.24, 0, 7.5, 0.3, 0.26, 8, '#ff8a1c', '#ffa94d'))
  s.push(box(-0.3, 0, 7.5, 0.18, 0.24, 15, '#ffb21c', '#ffd070'))
  s.push(box(0.04, 0, 7.5, 0.28, 0.22, 8, '#58b8f0', '#8ad0ff'))
  s.push(box(0.2, 0, 15, 0.26, 0.06, 3, '#58b8f0'))
  s.push(box(0.4, 0, 7.5, 0.16, 0.26, 12, '#4b9be0'))
  s.push(box(-0.44, 0, 4, 0.22, 0.28, 13, '#e2543a', '#f27a5c'))
  for (const u of [-0.4, -0.16, 0.2, 0.4]) s.push(rad(u, 0.15, 3.5, 3.6))
  return { svg: s.join(''), hoehe: 34 }
}

// ── Gebäude & Deko ───────────────────────────────────────────────────────────

export function hoftor(): Teil {
  const s: string[] = [oval(30)]
  s.push(box(0, -0.4, 0, 0.12, 0.12, 40, '#b9b2a4', '#d6cfbf'))
  s.push(box(0, 0.4, 0, 0.12, 0.12, 40, '#b9b2a4', '#d6cfbf'))
  // Torflügel mit Querstreben
  const flaeche = (v0: number, v1: number) =>
    `<polygon points="${pu(0, v0, 6)} ${pu(0, v1, 6)} ${pu(0, v1, 30)} ${pu(0, v0, 30)}" fill="#3fa05a" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`
  s.push(flaeche(-0.34, -0.02), flaeche(0.02, 0.34))
  for (const w of [12, 18, 24]) {
    s.push(`<polyline points="${pu(0, -0.34, w)} ${pu(0, 0.34, w)}" stroke="#fff6e0" stroke-width="1.4" opacity="0.8"/>`)
  }
  s.push(`<polyline points="${pu(0, -0.34, 6)} ${pu(0, -0.02, 30)}" stroke="#fff6e0" stroke-width="1.2" opacity="0.8"/>`)
  s.push(`<polyline points="${pu(0, 0.34, 6)} ${pu(0, 0.02, 30)}" stroke="#fff6e0" stroke-width="1.2" opacity="0.8"/>`)
  s.push(box(0, -0.4, 40, 0.15, 0.15, 4, '#e2543a', '#f27a5c'))
  s.push(box(0, 0.4, 40, 0.15, 0.15, 4, '#e2543a', '#f27a5c'))
  return { svg: s.join(''), hoehe: 46 }
}

export function fahnenmast(): Teil {
  const s: string[] = [oval(16)]
  s.push(box(0, 0, 0, 0.16, 0.16, 5, '#b9b2a4', '#d6cfbf'))
  const [x, y] = iso(0, 0, 5)
  s.push(`<rect x="${r1(x - 1.3)}" y="${r1(y - 56)}" width="2.6" height="56" rx="1.2" fill="#e8e2d4" stroke="${KONTUR}" stroke-width="0.7"/>`)
  s.push(kreis(x, y - 57, 2.4, '#ffd23f'))
  const ox = r1(x + 1)
  const oy = r1(y - 54)
  s.push(`<path class="bt-fahne" style="transform-origin:${ox}px ${oy}px" d="M ${ox} ${oy} Q ${r1(x + 12)} ${r1(y - 56)} ${r1(x + 24)} ${r1(y - 50)} Q ${r1(x + 12)} ${r1(y - 46)} ${ox} ${r1(y - 40)} Z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`)
  s.push(`<path class="bt-fahne" style="transform-origin:${ox}px ${oy}px" d="M ${ox} ${r1(y - 50)} Q ${r1(x + 12)} ${r1(y - 53)} ${r1(x + 21)} ${r1(y - 49)}" fill="none" stroke="#fff6e0" stroke-width="2"/>`)
  return { svg: s.join(''), hoehe: 66 }
}

export function strassenlaterne(): Teil {
  const s: string[] = [oval(16)]
  s.push(box(0, 0, 0, 0.14, 0.14, 4, '#4b5563', '#6b7280'))
  const [x, y] = iso(0, 0, 4)
  s.push(`<rect x="${r1(x - 1.5)}" y="${r1(y - 46)}" width="3" height="46" rx="1.3" fill="#4b5563" stroke="#2b2f3a" stroke-width="0.7"/>`)
  s.push(`<path d="M${r1(x)} ${r1(y - 46)} q8 -2 11 5" fill="none" stroke="#4b5563" stroke-width="2.6" stroke-linecap="round"/>`)
  s.push(`<ellipse cx="${r1(x + 11)}" cy="${r1(y - 39)}" rx="9" ry="9" fill="#fff2b0" opacity="0.28"/>`)
  s.push(`<rect x="${r1(x + 7)}" y="${r1(y - 41)}" width="8" height="6" rx="2" fill="#ffe27a" stroke="#2b2f3a" stroke-width="0.8"/>`)
  return { svg: s.join(''), hoehe: 56 }
}

export function ampel(): Teil {
  const s: string[] = [oval(14)]
  const [x, y] = iso(0, 0, 0)
  s.push(`<rect x="${r1(x - 1.4)}" y="${r1(y - 34)}" width="2.8" height="34" fill="#4b5563" stroke="#2b2f3a" stroke-width="0.6"/>`)
  s.push(`<rect x="${r1(x - 7)}" y="${r1(y - 58)}" width="14" height="27" rx="4" fill="#2f343f" stroke="#14161c" stroke-width="0.9"/>`)
  s.push(kreis(x, y - 52, 3.8, '#ff5a4a', '#8a1c14', 0.6), kreis(x, y - 44.5, 3.8, '#ffd23f', '#9a7410', 0.6), kreis(x, y - 37, 3.8, '#44d06a', '#176a30', 0.6))
  s.push(`<ellipse cx="${r1(x - 1.4)}" cy="${r1(y - 53.4)}" rx="1.3" ry="0.9" fill="#ffd0c8" opacity="0.9"/>`)
  return { svg: s.join(''), hoehe: 66 }
}

export function wachhund(): Teil {
  const s: string[] = [oval(26)]
  s.push(box(-0.12, -0.08, 0, 0.36, 0.34, 20, '#c98a45', '#d9a060'))
  s.push(`<polygon points="${pu(-0.32, -0.28, 20)} ${pu(0.08, -0.28, 20)} ${pu(0.08, 0.12, 20)} ${pu(-0.32, 0.12, 20)} ${pu(-0.12, -0.08, 34)}" fill="#d9402c" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`)
  s.push(`<polygon points="${pu(0.08, 0.12, 20)} ${pu(0.08, -0.28, 20)} ${pu(-0.12, -0.08, 34)}" fill="#b83020" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`)
  s.push(`<polygon points="${pu(0.062, -0.14, 2)} ${pu(0.062, -0.02, 2)} ${pu(0.062, -0.02, 13)} ${pu(0.062, -0.14, 13)}" fill="#3a2418"/>`)
  const [x, y] = iso(0.3, 0.2, 0)
  // Bello sitzt vor der Hütte
  s.push(`<ellipse cx="${r1(x)}" cy="${r1(y - 7)}" rx="8.5" ry="9.5" fill="#d9a060" stroke="${KONTUR}" stroke-width="0.8"/>`)
  s.push(`<ellipse cx="${r1(x + 1)}" cy="${r1(y - 2)}" rx="4.5" ry="5" fill="#f3d9a8"/>`)
  s.push(kreis(x + 1, y - 18, 6.5, '#d9a060'))
  s.push(`<ellipse cx="${r1(x - 5)}" cy="${r1(y - 20)}" rx="2.6" ry="5" fill="#8a5a2a" stroke="${KONTUR}" stroke-width="0.6" transform="rotate(14 ${r1(x - 5)} ${r1(y - 20)})"/>`)
  s.push(`<ellipse cx="${r1(x + 7)}" cy="${r1(y - 20)}" rx="2.6" ry="5" fill="#8a5a2a" stroke="${KONTUR}" stroke-width="0.6" transform="rotate(-14 ${r1(x + 7)} ${r1(y - 20)})"/>`)
  s.push(`<ellipse cx="${r1(x + 2.5)}" cy="${r1(y - 15.5)}" rx="3.4" ry="2.6" fill="#f3d9a8"/>`)
  s.push(kreis(x + 3.4, y - 16.2, 1.2, '#2b1a10', '#2b1a10', 0))
  s.push(kreis(x - 0.6, y - 19.4, 1, '#2b1a10', '#2b1a10', 0), kreis(x + 3.4, y - 19.4, 1, '#2b1a10', '#2b1a10', 0))
  s.push(`<path d="M${r1(x - 8)} ${r1(y - 3)} q-6 -2 -5 -8" fill="none" stroke="#d9a060" stroke-width="2.6" stroke-linecap="round"/>`)
  s.push(`<rect x="${r1(x - 3)}" y="${r1(y - 12.6)}" width="8" height="2.2" rx="1" fill="#e2543a"/>`)
  return { svg: s.join(''), hoehe: 44 }
}

export function tankstelle(): Teil {
  const s: string[] = [schatten(-0.4, -0.3, 0.42, 0.34, 0.26)]
  for (const [u, v] of [[-0.3, -0.24], [0.3, -0.24], [-0.3, 0.24], [0.3, 0.24]] as const) s.push(box(u, v, 0, 0.05, 0.05, 36, '#d6cfbf', '#eee8da'))
  for (const u of [-0.14, 0.14]) {
    s.push(box(u, 0, 0, 0.12, 0.1, 22, '#e2543a', '#f27a5c'))
    s.push(box(u, 0, 14, 0.125, 0.105, 6, '#4a6a8a'))
    s.push(box(u, 0, 3, 0.14, 0.12, 2, '#b9b2a4'))
  }
  s.push(box(0, 0, 36, 0.78, 0.6, 5, '#fff6e0', '#ffffff'))
  s.push(box(0, 0, 41, 0.78, 0.6, 3, '#e2543a', '#f27a5c'))
  return { svg: s.join(''), hoehe: 48 }
}

// ── Ladung & Ausstattung ─────────────────────────────────────────────────────

const karton = (u: number, v: number, z: number, l = 0.2) => box(u, v, z, l, l, 8, '#d8a866', '#ecc888')

export function europalette(): Teil {
  const s: string[] = [oval(24)]
  s.push(box(0, 0, 0, 0.5, 0.36, 2.5, '#b9854c', '#d0a068'))
  for (const v of [-0.15, 0, 0.15]) s.push(box(0, v, 2.5, 0.5, 0.06, 3, '#9c6e3a'))
  s.push(box(0, 0, 5.5, 0.5, 0.36, 2.5, '#c89860', '#dcb078'))
  for (const [u, v] of [[-0.12, -0.08], [0.12, -0.08], [-0.12, 0.1], [0.12, 0.1]] as const) s.push(karton(u, v, 8))
  s.push(box(-0.05, 0, 16, 0.28, 0.26, 8, '#e0b878', '#f4d498'))
  return { svg: s.join(''), hoehe: 30 }
}

export function kiste(): Teil {
  const s: string[] = [oval(22)]
  s.push(box(0, 0, 0, 0.36, 0.36, 20, '#c98a45', '#e0aa6a'))
  const [x, y] = [0, 0]
  void x
  void y
  for (const w of [4, 10, 16]) {
    s.push(`<polyline points="${pu(0.18, -0.18, w)} ${pu(0.18, 0.18, w)}" stroke="#7a4a1c" stroke-width="0.8" opacity="0.5"/>`)
  }
  s.push(`<polyline points="${pu(0.18, -0.17, 2)} ${pu(0.18, 0.17, 18)}" stroke="#7a4a1c" stroke-width="1.6" opacity="0.7"/>`)
  s.push(`<polyline points="${pu(0.18, 0.17, 2)} ${pu(0.18, -0.17, 18)}" stroke="#7a4a1c" stroke-width="1.6" opacity="0.7"/>`)
  return { svg: s.join(''), hoehe: 26 }
}

export function schutzhelm(): Teil {
  const s: string[] = [oval(20)]
  const [x, y] = iso(0, 0, 0)
  s.push(`<ellipse cx="${r1(x)}" cy="${r1(y - 5)}" rx="17" ry="6.5" fill="#e0a010" stroke="${KONTUR}" stroke-width="0.9"/>`)
  s.push(`<path d="M${r1(x - 14)} ${r1(y - 8)} a14 17 0 0 1 28 0 z" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`)
  s.push(`<rect x="${r1(x - 3)}" y="${r1(y - 26)}" width="6" height="19" rx="2" fill="#f4b81a"/>`)
  s.push(`<path d="M${r1(x - 10)} ${r1(y - 16)} q1 -7 7 -10" fill="none" stroke="#fff3b8" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>`)
  return { svg: s.join(''), hoehe: 36 }
}

export function sackkarre(): Teil {
  const s: string[] = [oval(20)]
  const [x, y] = iso(0, 0, 0)
  s.push(`<path d="M${r1(x - 8)} ${r1(y - 42)} L${r1(x - 6)} ${r1(y - 6)} M${r1(x + 6)} ${r1(y - 42)} L${r1(x + 7)} ${r1(y - 6)}" stroke="#3a7ad0" stroke-width="3" stroke-linecap="round" fill="none"/>`)
  s.push(`<path d="M${r1(x - 8)} ${r1(y - 42)} Q${r1(x)} ${r1(y - 48)} ${r1(x + 6)} ${r1(y - 42)}" stroke="#3a7ad0" stroke-width="3" fill="none" stroke-linecap="round"/>`)
  s.push(`<rect x="${r1(x - 9)}" y="${r1(y - 22)}" width="17" height="2.4" fill="#5a9af0"/><rect x="${r1(x - 9)}" y="${r1(y - 32)}" width="17" height="2.4" fill="#5a9af0"/>`)
  s.push(`<path d="M${r1(x - 7)} ${r1(y - 6)} h-5 l-3 2 h14 z" fill="#9aa0aa" stroke="${KONTUR}" stroke-width="0.7"/>`)
  s.push(kreis(x + 7, y - 6, 6, '#2b2f3a', '#14161c', 0.7), kreis(x + 7, y - 6, 2.4, '#c9ced6', '#c9ced6', 0))
  s.push(`<rect x="${r1(x - 5)}" y="${r1(y - 19)}" width="13" height="11" rx="1.5" fill="#d8a866" stroke="${KONTUR}" stroke-width="0.7" transform="skewX(0)"/>`)
  return { svg: s.join(''), hoehe: 52 }
}

export function fass(): Teil {
  const s: string[] = [oval(18)]
  const [x, y] = iso(0, 0, 0)
  s.push(`<defs><linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="#5aa8f8"/><stop offset="0.55" stop-color="#2f8cf0"/><stop offset="1" stop-color="#1f6ac0"/></linearGradient></defs>`)
  s.push(`<path d="M${r1(x - 12)} ${r1(y - 30)} q-3 15 0 28 q12 6 24 0 q3 -13 0 -28 z" fill="url(#f)" stroke="#12427c" stroke-width="0.9" stroke-linejoin="round"/>`)
  for (const dy of [-8, -20]) s.push(`<path d="M${r1(x - 12.4)} ${r1(y + dy)} q12.4 5 24.8 0" fill="none" stroke="#0e3566" stroke-width="2"/>`)
  s.push(`<ellipse cx="${r1(x)}" cy="${r1(y - 30)}" rx="12" ry="4.6" fill="#6ab4ff" stroke="#12427c" stroke-width="0.9"/>`)
  s.push(`<ellipse cx="${r1(x)}" cy="${r1(y - 30)}" rx="6" ry="2.2" fill="#2f8cf0"/>`)
  s.push(`<path d="M${r1(x - 8)} ${r1(y - 25)} q-1 8 1 15" fill="none" stroke="#bfe0ff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`)
  return { svg: s.join(''), hoehe: 40 }
}

export function gitterbox(): Teil {
  const s: string[] = [oval(24)]
  s.push(box(0, 0, 0, 0.42, 0.42, 3, '#6b7280', '#8a919c'))
  s.push(box(-0.06, -0.06, 3, 0.2, 0.2, 10, '#d8a866', '#ecc888'))
  s.push(box(0.08, 0.08, 3, 0.18, 0.18, 12, '#e2543a', '#f27a5c'))
  s.push(box(-0.08, 0.1, 3, 0.16, 0.16, 7, '#f4c95a', '#ffe08a'))
  const [a, b] = [-0.2, 0.2]
  // Gitterflächen an den beiden sichtbaren Seiten
  for (let i = 0; i <= 6; i++) {
    const t = a + ((b - a) * i) / 6
    s.push(`<polyline points="${pu(0.2, t, 3)} ${pu(0.2, t, 30)}" stroke="#aab0ba" stroke-width="0.8"/>`)
    s.push(`<polyline points="${pu(t, 0.2, 3)} ${pu(t, 0.2, 30)}" stroke="#aab0ba" stroke-width="0.8"/>`)
  }
  for (const w of [3, 10, 17, 24, 30]) {
    s.push(`<polyline points="${pu(0.2, -0.2, w)} ${pu(0.2, 0.2, w)} ${pu(-0.2, 0.2, w)}" stroke="#9aa0aa" stroke-width="1.1" fill="none"/>`)
  }
  for (const [u, v] of [[0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]] as const) s.push(`<polyline points="${pu(u, v, 3)} ${pu(u, v, 30)}" stroke="#7b818c" stroke-width="1.6"/>`)
  return { svg: s.join(''), hoehe: 38 }
}

export function warnweste(): Teil {
  const s: string[] = [oval(18)]
  const [x, y] = iso(0, 0, 0)
  s.push(box(0, 0, 0, 0.18, 0.18, 4, '#b9b2a4', '#d6cfbf'))
  s.push(`<rect x="${r1(x - 1.2)}" y="${r1(y - 34)}" width="2.4" height="32" fill="#8a7a6a" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(`<path d="M${r1(x - 15)} ${r1(y - 30)} L${r1(x - 6)} ${r1(y - 35)} L${r1(x)} ${r1(y - 25)} L${r1(x + 6)} ${r1(y - 35)} L${r1(x + 15)} ${r1(y - 30)} L${r1(x + 17)} ${r1(y - 8)} Q${r1(x)} ${r1(y - 4)} ${r1(x - 17)} ${r1(y - 8)} Z" fill="#ff8a1c" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`)
  s.push(`<path d="M${r1(x - 6)} ${r1(y - 35)} L${r1(x)} ${r1(y - 25)} L${r1(x + 6)} ${r1(y - 35)} Q${r1(x)} ${r1(y - 31)} ${r1(x - 6)} ${r1(y - 35)} Z" fill="#c9600a"/>`)
  s.push(`<path d="M${r1(x - 16.3)} ${r1(y - 18)} L${r1(x + 16.3)} ${r1(y - 18)} L${r1(x + 16.6)} ${r1(y - 14.4)} L${r1(x - 16.6)} ${r1(y - 14.4)} Z" fill="#f4f6d8"/>`)
  s.push(`<path d="M${r1(x - 16.7)} ${r1(y - 11.4)} L${r1(x + 16.7)} ${r1(y - 11.4)} L${r1(x + 17)} ${r1(y - 8)} Q${r1(x)} ${r1(y - 4.2)} ${r1(x - 17)} ${r1(y - 8)} Z" fill="#f4f6d8"/>`)
  s.push(`<line x1="${r1(x)}" y1="${r1(y - 25)}" x2="${r1(x)}" y2="${r1(y - 5)}" stroke="#c9600a" stroke-width="1.2"/>`)
  return { svg: s.join(''), hoehe: 44 }
}

// ── Abzeichen & Trophäen ─────────────────────────────────────────────────────

const SOCKEL = (): string =>
  quader({ u0: -0.27, v0: -0.27, u1: 0.27, v1: 0.27, h: 9, farbe: '#e8e0d0', dachFarbe: '#f5efe3' }) +
  quader({ u0: -0.17, v0: -0.17, u1: 0.17, v1: 0.17, z: 9, h: 4, farbe: '#b87a3a', dachFarbe: '#d99a54' })

const GOLD = `<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="0.5" stop-color="#f6b81a"/><stop offset="1" stop-color="#c98a0a"/></linearGradient></defs>`
const GOLDK = '#a8700a'

const stern = (cx: number, cy: number, r: number, f: string, st: string): string => {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * 0.45
    pts.push(`${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`)
  }
  return `<polygon points="${pts.join(' ')}" fill="${f}" stroke="${st}" stroke-width="0.9" stroke-linejoin="round"/>`
}

export function medaille(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += `<polygon points="${r1(x - 9)},${r1(y - 40)} ${r1(x - 2)},${r1(y - 40)} ${r1(x + 2)},${r1(y - 22)} ${r1(x - 5)},${r1(y - 22)}" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.7"/>`
  s += `<polygon points="${r1(x + 9)},${r1(y - 40)} ${r1(x + 2)},${r1(y - 40)} ${r1(x - 2)},${r1(y - 22)} ${r1(x + 5)},${r1(y - 22)}" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="0.7"/>`
  s += kreis(x, y - 14, 12.5, 'url(#g)', GOLDK, 0.9) + kreis(x, y - 14, 8.6, '#e0a010', GOLDK, 0.6) + stern(x, y - 14, 6, '#fff3b8', GOLDK)
  return { svg: s, hoehe: 56 }
}

export function schildAbzeichen(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += `<path d="M${r1(x - 13)} ${r1(y - 34)} h26 v14 q0 12 -13 17 q-13 -5 -13 -17 z" fill="url(#g)" stroke="${GOLDK}" stroke-width="1" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x - 9)} ${r1(y - 30)} h18 v10 q0 8 -9 12 q-9 -4 -9 -12 z" fill="#2f8cf0" stroke="${GOLDK}" stroke-width="0.7"/>`
  s += stern(x, y - 22, 5.6, '#fff3b8', GOLDK)
  s += `<path d="M${r1(x - 10)} ${r1(y - 32)} q-1 8 2 14" fill="none" stroke="#fff3b8" stroke-width="2" stroke-linecap="round" opacity="0.85"/>`
  return { svg: s, hoehe: 52 }
}

export function sternAbzeichen(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += kreis(x, y - 22, 19, '#2f8cf0', '#12427c', 1) + kreis(x, y - 22, 15.5, '#58b0ff', '#12427c', 0.6)
  s += stern(x, y - 22, 14, 'url(#g)', GOLDK)
  s += `<ellipse cx="${r1(x - 3)}" cy="${r1(y - 27)}" rx="3" ry="1.6" fill="#fffbe0" opacity="0.8"/>`
  return { svg: s, hoehe: 56 }
}

export function krone(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 1)}" rx="15" ry="5" fill="#a02a40" stroke="${KONTUR}" stroke-width="0.8"/>`
  s += `<path d="M${r1(x - 15)} ${r1(y - 4)} l-3 -18 l9 8 l5 -14 l4 14 l5 -14 l5 14 l9 -8 l-3 18 q-15 5 -30 0 z" fill="url(#g)" stroke="${GOLDK}" stroke-width="1" stroke-linejoin="round"/>`
  for (const [dx, dy, c] of [[-10, -12, '#e2543a'], [0, -8, '#2f8cf0'], [10, -12, '#44d06a']] as const) s += kreis(x + dx, y + dy, 2.6, c, GOLDK, 0.6)
  for (const dx of [-18, -9, 0, 9, 18]) s += kreis(x + dx * 0.95, y - (dx === 0 ? 31 : 22 + Math.abs(dx) * 0.1), 2, '#fff3b8', GOLDK, 0.6)
  return { svg: s, hoehe: 52 }
}

export function lorbeerkranz(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL()
  const blatt = (cx: number, cy: number, ang: number) =>
    `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="3.2" ry="6" fill="#46b84a" stroke="#1f6a2a" stroke-width="0.7" transform="rotate(${ang} ${r1(cx)} ${r1(cy)})"/>`
  const cy0 = y - 20
  for (let i = 0; i < 9; i++) {
    const t = (Math.PI * (0.25 + (i / 8) * 1.1))
    const rx = 15
    const ry = 17
    s += blatt(x - Math.cos(t) * rx, cy0 + Math.sin(t) * ry, 90 - (i / 8) * 150 - 20)
    s += blatt(x + Math.cos(t) * rx, cy0 + Math.sin(t) * ry, -90 + (i / 8) * 150 + 20)
  }
  s += `<path d="M${r1(x - 5)} ${r1(y - 2)} h10 l-2 5 h-6 z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.6"/>`
  s += GOLD + stern(x, y - 20, 7.5, 'url(#g)', GOLDK)
  return { svg: s, hoehe: 56 }
}

export function urkundeSped(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL()
  s += `<path d="M${r1(x - 10)} ${r1(y - 2)} L${r1(x - 14)} ${r1(y + 4)} M${r1(x + 10)} ${r1(y - 2)} L${r1(x + 14)} ${r1(y + 4)}" stroke="#8a5a2a" stroke-width="2.4" stroke-linecap="round"/>`
  s += `<rect x="${r1(x - 20)}" y="${r1(y - 34)}" width="40" height="30" rx="2.5" fill="#b87a3a" stroke="${KONTUR}" stroke-width="0.9"/>`
  s += `<rect x="${r1(x - 17)}" y="${r1(y - 31)}" width="34" height="24" rx="1.5" fill="#fff6e0" stroke="#d9a060" stroke-width="0.8"/>`
  s += `<rect x="${r1(x - 12)}" y="${r1(y - 26)}" width="24" height="3.2" rx="1" fill="#3d424d"/>`
  s += `<rect x="${r1(x - 9)}" y="${r1(y - 20)}" width="18" height="2" rx="1" fill="#9aa0aa"/><rect x="${r1(x - 9)}" y="${r1(y - 16)}" width="14" height="2" rx="1" fill="#9aa0aa"/>`
  s += GOLD + kreis(x + 9, y - 11, 5, 'url(#g)', GOLDK, 0.7) + `<polygon points="${r1(x + 6)},${r1(y - 8)} ${r1(x + 5)},${r1(y - 1)} ${r1(x + 9)},${r1(y - 3)} ${r1(x + 13)},${r1(y - 1)} ${r1(x + 12)},${r1(y - 8)}" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.6"/>`
  return { svg: s, hoehe: 52 }
}

export function blitzAbzeichen(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += kreis(x, y - 22, 19, '#44c060', '#1f6a2a', 1) + kreis(x, y - 22, 15, '#6ee080', '#1f6a2a', 0.6)
  s += `<polygon points="${r1(x + 3)},${r1(y - 38)} ${r1(x - 9)},${r1(y - 20)} ${r1(x - 1)},${r1(y - 20)} ${r1(x - 4)},${r1(y - 6)} ${r1(x + 10)},${r1(y - 25)} ${r1(x + 1)},${r1(y - 25)}" fill="url(#g)" stroke="${GOLDK}" stroke-width="1" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x - 3)} ${r1(y - 28)} l5 -7" stroke="#fffbe0" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>`
  return { svg: s, hoehe: 56 }
}

/** Alle Sprites dieser Datei nach Icon-Schlüssel (Spedition). */
export const SPEDITION_WEICH: Record<string, () => Teil> = {
  gabelstapler,
  anhaenger,
  'lieferwagen-gelb': lieferwagenGelb,
  tieflader,
  hoftor,
  fahnenmast,
  strassenlaterne,
  ampel,
  wachhund,
  tankstelle,
  europalette,
  kiste,
  schutzhelm,
  sackkarre,
  fass,
  gitterbox,
  warnweste,
  medaille,
  'schild-abzeichen': schildAbzeichen,
  'stern-abzeichen': sternAbzeichen,
  krone,
  lorbeerkranz,
  'urkunde-sped': urkundeSped,
  'blitz-abzeichen': blitzAbzeichen,
}

export { ton }
