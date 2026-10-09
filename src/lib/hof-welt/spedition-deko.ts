import { iso, ton, quader, schatten, satteldach } from './iso'
import type { Teil } from './bauteile'
import { BLUR, KONTUR, box, kreis, oval, pu, r1, rad } from './spedition-weich'

/**
 * Spedition-Deko im weichen Stil (PROJ-36): Fahrzeuge, Hofdeko und Ausstattung.
 * Gleiche Bausteine, Palette und Licht wie spedition-weich.ts.
 */

const LAUB1 = '#46b84a'
const LAUB2 = '#5cc450'

// ── Fahrzeuge ────────────────────────────────────────────────────────────────

export function tankwagen(): Teil {
  const s: string[] = [oval(32)]
  s.push(box(-0.04, 0, 4, 0.74, 0.28, 3, '#6b7280'))
  // Tank als langer, gerundeter Körper
  s.push(box(-0.06, 0, 7, 0.52, 0.26, 17, '#e8ecf2', '#ffffff'))
  s.push(`<polyline points="${pu(-0.06, 0.131, 12)} ${pu(0.2, 0.131, 12)}" stroke="#e2543a" stroke-width="3.2"/>`)
  s.push(`<polyline points="${pu(-0.2, 0.131, 7)} ${pu(-0.2, 0.131, 24)} M ${pu(0.0, 0.131, 7)} ${pu(0.0, 0.131, 24)}" stroke="#aab0ba" stroke-width="1.2" fill="none"/>`)
  s.push(box(-0.06, 0, 24, 0.1, 0.1, 3, '#aab0ba'))
  s.push(box(0.3, 0, 4, 0.2, 0.28, 17, '#e2543a', '#f27a5c'))
  s.push(`<polygon points="${pu(0.402, -0.11, 12)} ${pu(0.402, 0.11, 12)} ${pu(0.402, 0.11, 19)} ${pu(0.402, -0.11, 19)}" fill="#9bdcf5" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(rad(-0.26, 0.15, 5, 4.4), rad(-0.04, 0.15, 5, 4.4), rad(0.3, 0.15, 5, 4.4))
  return { svg: s.join(''), hoehe: 34 }
}

export function kipper(): Teil {
  const s: string[] = [oval(30)]
  s.push(box(0.3, 0, 4, 0.2, 0.28, 16, '#ffb21c', '#ffd070'))
  s.push(`<polygon points="${pu(0.402, -0.11, 11)} ${pu(0.402, 0.11, 11)} ${pu(0.402, 0.11, 17)} ${pu(0.402, -0.11, 17)}" fill="#9bdcf5" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(box(-0.1, 0, 4, 0.6, 0.28, 3, '#6b7280'))
  // Mulde, hinten angehoben
  s.push(`<polygon points="${pu(-0.4, -0.14, 9)} ${pu(0.18, -0.14, 7)} ${pu(0.18, 0.14, 7)} ${pu(-0.4, 0.14, 9)} ${pu(-0.4, 0.14, 24)} ${pu(-0.4, -0.14, 24)}" fill="#ff8a1c" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`)
  s.push(`<polygon points="${pu(-0.4, 0.14, 9)} ${pu(0.18, 0.14, 7)} ${pu(0.18, 0.14, 18)} ${pu(-0.4, 0.14, 24)}" fill="#f07410" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`)
  for (const [u, v, z] of [[-0.3, 0, 24.5], [-0.15, 0.05, 22.5], [-0.05, -0.04, 20]] as const) s.push(kreis(iso(u, v, z)[0], iso(u, v, z)[1], 3.6, '#b9a48a', '#7a6a52', 0.6))
  s.push(rad(-0.22, 0.16, 5, 4.6), rad(0.0, 0.16, 5, 4.6), rad(0.3, 0.16, 5, 4.6))
  return { svg: s.join(''), hoehe: 36 }
}

export function abschleppwagen(): Teil {
  const s: string[] = [oval(30)]
  s.push(box(0.28, 0, 4, 0.24, 0.28, 16, '#e2543a', '#f27a5c'))
  s.push(`<polygon points="${pu(0.402, -0.11, 11)} ${pu(0.402, 0.11, 11)} ${pu(0.402, 0.11, 17)} ${pu(0.402, -0.11, 17)}" fill="#9bdcf5" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(box(0.28, 0, 20, 0.08, 0.1, 3.4, '#ffd23f'))
  s.push(box(-0.14, 0, 4, 0.6, 0.28, 3, '#4b5563', '#6b7280'))
  // aufgeladenes Auto
  s.push(box(-0.16, 0, 7, 0.34, 0.2, 7, '#2f8cf0', '#5aa8f8'))
  s.push(box(-0.18, 0, 14, 0.18, 0.18, 6, '#2f8cf0', '#5aa8f8'))
  s.push(box(-0.22, -0.05, 7, 0.02, 0.02, 0, '#14161c'))
  s.push(`<polyline points="${pu(0.06, 0, 22)} ${pu(0.22, 0, 12)}" stroke="#4b5563" stroke-width="2" fill="none"/>`)
  s.push(rad(-0.3, 0.15, 5, 4.4), rad(-0.04, 0.15, 5, 4.4), rad(0.3, 0.15, 5, 4.4))
  return { svg: s.join(''), hoehe: 34 }
}

// ── Gebäude & Deko ───────────────────────────────────────────────────────────

export function hecke(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(28)
  s += box(0, 0, 0, 0.7, 0.2, 14, '#2f9a3a', '#46b84a')
  for (let i = 0; i < 7; i++) s += kreis(x - 30 + i * 10, y - 18 + (i % 2 ? -1 : 1), 8.5, i % 2 ? LAUB2 : LAUB1, '#1f6a2a', 0.8)
  s += `<ellipse cx="${r1(x - 6)}" cy="${r1(y - 22)}" rx="9" ry="3" fill="#a6e66c" opacity="0.7"/>`
  void y
  return { svg: s, hoehe: 40 }
}

export function blumenkuebel(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(20)
  s += `<path d="M${r1(x - 17)} ${r1(y - 14)} L${r1(x - 13)} ${r1(y)} Q${r1(x)} ${r1(y + 5)} ${r1(x + 13)} ${r1(y)} L${r1(x + 17)} ${r1(y - 14)} Z" fill="#b87a3a" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x - 15)} ${r1(y - 8)} Q${r1(x)} ${r1(y - 3)} ${r1(x + 15)} ${r1(y - 8)}" fill="none" stroke="#8a5a2a" stroke-width="1.6"/>`
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 14)}" rx="17" ry="5" fill="#6b4220"/>`
  for (const [dx, dy, f] of [[-11, -22, '#ec4636'], [-3, -27, '#ffd23f'], [6, -24, '#ff8fb1'], [12, -20, '#ffffff'], [-6, -19, '#ffffff'], [2, -19, '#ec4636']] as const) {
    s += `<line x1="${r1(x + dx)}" y1="${r1(y + dy)}" x2="${r1(x + dx)}" y2="${r1(y - 14)}" stroke="#2f8f3a" stroke-width="1.2"/>${kreis(x + dx, y + dy, 3.8, f, KONTUR, 0.7)}${kreis(x + dx, y + dy, 1.2, '#ffb21c', '#ffb21c', 0)}`
  }
  return { svg: s, hoehe: 38 }
}

export function parkbank(): Teil {
  const s: string[] = [oval(26)]
  for (const u of [-0.24, 0.24]) {
    s.push(box(u, 0, 0, 0.04, 0.22, 9, '#4b5563', '#6b7280'))
    s.push(box(u, 0.11, 9, 0.04, 0.03, 12, '#4b5563'))
  }
  s.push(box(0, 0, 9, 0.6, 0.22, 2.4, '#c98a45', '#e0aa6a'))
  s.push(box(0, 0.1, 15, 0.6, 0.04, 3, '#c98a45', '#e0aa6a'))
  s.push(box(0, 0.1, 20, 0.6, 0.04, 3, '#c98a45', '#e0aa6a'))
  return { svg: s.join(''), hoehe: 30 }
}

export function werbeschild(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(24)
  s += `<rect x="${r1(x - 20)}" y="${r1(y - 22)}" width="3.4" height="22" fill="#8a919c" stroke="${KONTUR}" stroke-width="0.6"/><rect x="${r1(x + 16.6)}" y="${r1(y - 22)}" width="3.4" height="22" fill="#8a919c" stroke="${KONTUR}" stroke-width="0.6"/>`
  s += `<rect x="${r1(x - 28)}" y="${r1(y - 54)}" width="56" height="34" rx="3" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="1"/>`
  s += `<rect x="${r1(x - 25)}" y="${r1(y - 51)}" width="50" height="28" rx="2" fill="#fff6e0"/>`
  s += `<text x="${r1(x)}" y="${r1(y - 42)}" font-family="sans-serif" font-size="7.4" font-weight="800" text-anchor="middle" fill="#2f8cf0">SPEDITION</text>`
  s += `<rect x="${r1(x - 14)}" y="${r1(y - 38)}" width="22" height="10" rx="2" fill="#e2543a"/><rect x="${r1(x + 8)}" y="${r1(y - 35)}" width="8" height="7" rx="1.5" fill="#e2543a"/>${kreis(x - 8, y - 27, 2.6, '#2b2f3a', '#14161c', 0.5)}${kreis(x + 11, y - 27, 2.6, '#2b2f3a', '#14161c', 0.5)}`
  s += `<rect x="${r1(x - 10)}" y="${r1(y - 50)}" width="2" height="0" fill="none"/>`
  return { svg: s, hoehe: 64 }
}

export function verkehrsschild(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(14)
  s += `<rect x="${r1(x - 1.3)}" y="${r1(y - 44)}" width="2.6" height="44" fill="#8a919c" stroke="${KONTUR}" stroke-width="0.6"/>`
  s += kreis(x, y - 50, 11, '#ffffff', '#c4281c', 3.2)
  s += `<text x="${r1(x)}" y="${r1(y - 47)}" font-family="sans-serif" font-size="9.4" font-weight="800" text-anchor="middle" fill="#14161c">30</text>`
  s += `<rect x="${r1(x - 8)}" y="${r1(y - 34)}" width="16" height="9" rx="1.6" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="0.7"/><text x="${r1(x)}" y="${r1(y - 27.4)}" font-family="sans-serif" font-size="6" font-weight="700" text-anchor="middle" fill="#fff">HOF</text>`
  return { svg: s, hoehe: 66 }
}

export function schranke(): Teil {
  const s: string[] = [oval(28)]
  s.push(box(-0.3, 0, 0, 0.16, 0.16, 18, '#fbfbf7', '#ffffff'))
  s.push(box(-0.3, 0, 18, 0.2, 0.2, 3, '#e2543a', '#f27a5c'))
  for (let i = 0; i < 5; i++) {
    const a = -0.2 + i * 0.14
    s.push(box(a + 0.2, 0, 20, 0.14, 0.05, 4, i % 2 ? '#fbfbf7' : '#e2543a'))
  }
  s.push(box(0.4, 0, 0, 0.05, 0.05, 20, '#8a919c', '#aab0ba'))
  s.push(`<polygon points="${pu(-0.3, 0.09, 6)} ${pu(-0.3, 0.09, 12)} ${pu(-0.22, 0.09, 12)} ${pu(-0.22, 0.09, 6)}" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.6"/>`)
  return { svg: s.join(''), hoehe: 30 }
}

export function schuppen(): Teil {
  const s: string[] = [schatten(-0.36, -0.3, 0.4, 0.34, 0.26)]
  s.push(quader({ u0: -0.36, v0: -0.3, u1: 0.36, v1: 0.3, h: 2.5, farbe: '#b9b2a4' }))
  s.push(quader({ u0: -0.34, v0: -0.28, u1: 0.34, v1: 0.28, z: 2.5, h: 18, farbe: '#c98a45' }))
  for (let i = 1; i < 8; i++) s.push(`<polyline points="${pu(0.34, -0.28 + (0.56 * i) / 8, 2.5)} ${pu(0.34, -0.28 + (0.56 * i) / 8, 20.5)}" stroke="#7a4a1c" stroke-width="0.7" opacity="0.5"/>`)
  s.push(`<polygon points="${pu(0.34, -0.2, 2.5)} ${pu(0.34, 0.2, 2.5)} ${pu(0.34, 0.2, 17)} ${pu(0.34, -0.2, 17)}" fill="#7a4a2a" stroke="#fff6e0" stroke-width="1"/>`)
  s.push(`<polyline points="${pu(0.34, -0.2, 2.5)} ${pu(0.34, 0.2, 17)}" stroke="#fff6e0" stroke-width="1"/><polyline points="${pu(0.34, 0.2, 2.5)} ${pu(0.34, -0.2, 17)}" stroke="#fff6e0" stroke-width="1"/>`)
  s.push(satteldach({ u0: -0.4, v0: -0.34, u1: 0.4, v1: 0.34, z: 20.5, hoehe: 11, farbe: '#8a919c' }))
  return { svg: s.join(''), hoehe: 38 }
}

export function wasserturm(): Teil {
  const s: string[] = [oval(26)]
  for (const [u, v] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]] as const) s.push(box(u, v, 0, 0.05, 0.05, 40, '#8a919c', '#aab0ba'))
  s.push(`<polyline points="${pu(0.14, -0.14, 10)} ${pu(0.14, 0.14, 26)}" stroke="#8a919c" stroke-width="1.4"/><polyline points="${pu(0.14, 0.14, 10)} ${pu(0.14, -0.14, 26)}" stroke="#8a919c" stroke-width="1.4"/>`)
  const [x, y] = iso(0, 0, 40)
  s.push(`<path d="M${r1(x - 20)} ${r1(y - 2)} h40 v-26 q-20 -9 -40 0 z" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="1" stroke-linejoin="round"/>`)
  s.push(`<ellipse cx="${r1(x)}" cy="${r1(y - 2)}" rx="20" ry="6" fill="#1f6ac0"/>`)
  s.push(`<path d="M${r1(x - 20)} ${r1(y - 28)} q20 -9 40 0 l-4 -8 q-16 -7 -32 0 z" fill="#e2543a" stroke="${KONTUR}" stroke-width="1" stroke-linejoin="round"/>`)
  s.push(`<path d="M${r1(x - 14)} ${r1(y - 22)} q-1 6 1 12" stroke="#8fd0ff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.9"/>`)
  s.push(`<rect x="${r1(x - 5)}" y="${r1(y - 18)}" width="10" height="7" rx="1.5" fill="#fff6e0"/><text x="${r1(x)}" y="${r1(y - 12.4)}" font-family="sans-serif" font-size="5.4" font-weight="700" text-anchor="middle" fill="#2f8cf0">H₂O</text>`)
  return { svg: s.join(''), hoehe: 90 }
}

export function imbisswagen(): Teil {
  const s: string[] = [oval(30)]
  s.push(box(0, 0, 4, 0.6, 0.32, 24, '#ffd23f', '#ffe27a'))
  s.push(`<polygon points="${pu(-0.28, 0.162, 12)} ${pu(0.18, 0.162, 12)} ${pu(0.18, 0.162, 22)} ${pu(-0.28, 0.162, 22)}" fill="#fff6e0" stroke="${KONTUR}" stroke-width="0.7"/>`)
  for (let i = 0; i < 6; i++) {
    const a = -0.3 + i * 0.08
    s.push(`<polygon points="${pu(a, 0.162, 24)} ${pu(a + 0.08, 0.162, 24)} ${pu(a + 0.08, 0.26, 19)} ${pu(a, 0.26, 19)}" fill="${i % 2 ? '#fff6e0' : '#e2543a'}" stroke="#7d2a1a" stroke-width="0.5"/>`)
  }
  s.push(box(-0.1, 0.22, 4, 0.5, 0.06, 10, '#c98a45', '#e0aa6a'))
  s.push(`<polygon points="${pu(0.302, -0.1, 12)} ${pu(0.302, 0.1, 12)} ${pu(0.302, 0.1, 20)} ${pu(0.302, -0.1, 20)}" fill="#7a4a2a" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(rad(-0.22, 0.17, 5, 4.6), rad(0.2, 0.17, 5, 4.6))
  const [x, y] = iso(-0.32, 0.3, 14)
  s.push(`<rect x="${r1(x - 9)}" y="${r1(y - 18)}" width="18" height="16" rx="2" fill="#2b2f3a" stroke="${KONTUR}" stroke-width="0.7"/><text x="${r1(x)}" y="${r1(y - 10)}" font-family="sans-serif" font-size="5" font-weight="700" text-anchor="middle" fill="#ffd23f">IMBISS</text><rect x="${r1(x - 6)}" y="${r1(y - 7)}" width="12" height="1.6" rx="0.8" fill="#fff6e0"/>`)
  return { svg: s.join(''), hoehe: 40 }
}

export function brueckenwaage(): Teil {
  const s: string[] = [oval(32)]
  s.push(quader({ u0: -0.44, v0: -0.28, u1: 0.44, v1: 0.28, h: 3.4, farbe: '#8a919c', dachFarbe: '#aab0ba' }))
  s.push(`<polyline points="${pu(-0.44, 0, 3.8)} ${pu(0.44, 0, 3.8)}" stroke="#e8ecf2" stroke-width="1.4" stroke-dasharray="6 5"/>`)
  s.push(quader({ u0: 0.2, v0: 0.3, u1: 0.46, v1: 0.5, h: 20, farbe: '#fff1d4', dachFarbe: '#ffffff' }))
  s.push(satteldach({ u0: 0.18, v0: 0.28, u1: 0.48, v1: 0.52, z: 20, hoehe: 6, farbe: '#e2543a' }))
  const [x, y] = iso(0.34, 0.4, 10)
  s.push(`<rect x="${r1(x - 5)}" y="${r1(y - 4)}" width="10" height="7" rx="1" fill="#2b2f3a"/><text x="${r1(x)}" y="${r1(y + 1.4)}" font-family="sans-serif" font-size="4.6" font-weight="800" text-anchor="middle" fill="#7be08a">12,4t</text>`)
  return { svg: s.join(''), hoehe: 34 }
}

export function wetterfahne(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(14)
  s += `<rect x="${r1(x - 1.3)}" y="${r1(y - 46)}" width="2.6" height="46" fill="#8a919c" stroke="${KONTUR}" stroke-width="0.6"/>`
  s += `<path d="M${r1(x - 10)} ${r1(y - 38)} h20 M${r1(x)} ${r1(y - 48)} v10" stroke="#8a919c" stroke-width="1.6" stroke-linecap="round"/>`
  s += `<text x="${r1(x - 13)}" y="${r1(y - 36)}" font-family="sans-serif" font-size="5" font-weight="700" fill="#4b5563">W</text><text x="${r1(x + 10)}" y="${r1(y - 36)}" font-family="sans-serif" font-size="5" font-weight="700" fill="#4b5563">O</text>`
  s += `<g class="bt-fahne" style="transform-origin:${r1(x)}px ${r1(y - 56)}px"><path d="M${r1(x - 16)} ${r1(y - 56)} h26 l5 -3 l-2 6 l2 6 l-5 -3 h-26 z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/><circle cx="${r1(x - 16)}" cy="${r1(y - 56)}" r="2.4" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.5"/></g>`
  s += kreis(x, y - 56, 2.2, '#ffd23f', KONTUR, 0.6)
  return { svg: s, hoehe: 68 }
}

// ── Ladung & Ausstattung ─────────────────────────────────────────────────────

const reifen = (cx: number, cy: number, r = 9): string =>
  `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r}" ry="${r1(r * 0.5)}" fill="#2b2f3a" stroke="#14161c" stroke-width="0.8"/><ellipse cx="${r1(cx)}" cy="${r1(cy - 0.4)}" rx="${r1(r * 0.56)}" ry="${r1(r * 0.26)}" fill="#7b818c"/><ellipse cx="${r1(cx)}" cy="${r1(cy - 0.8)}" rx="${r1(r * 0.28)}" ry="${r1(r * 0.12)}" fill="#14161c"/>`

export function reifenstapel(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(22)
  for (let i = 0; i < 4; i++) s += reifen(x - 8, y - 3 - i * 6.6) + reifen(x + 9, y - 3 - i * 6.6, 8.4)
  s += reifen(x, y - 31)
  return { svg: s, hoehe: 46 }
}

export function oelfaesser(): Teil {
  const s: string[] = [BLUR ? `<defs>${BLUR}</defs>` : '', oval(26)]
  const fass = (dx: number, dy: number, f: string, d: string): string => {
    const [x, y] = iso(0, 0, 0)
    const cx = x + dx
    const cy = y + dy
    return (
      `<path d="M${r1(cx - 9)} ${r1(cy - 24)} q-2 12 0 24 q9 4 18 0 q2 -12 0 -24 z" fill="${f}" stroke="${d}" stroke-width="0.9" stroke-linejoin="round"/>` +
      `<path d="M${r1(cx - 9.4)} ${r1(cy - 17)} q9.4 4 18.8 0 M${r1(cx - 9.4)} ${r1(cy - 7)} q9.4 4 18.8 0" fill="none" stroke="${d}" stroke-width="1.4"/>` +
      `<ellipse cx="${r1(cx)}" cy="${r1(cy - 24)}" rx="9" ry="3.4" fill="${ton(f, 1.2)}" stroke="${d}" stroke-width="0.9"/>` +
      `<path d="M${r1(cx - 6)} ${r1(cy - 20)} q-1 6 0 12" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/>`
    )
  }
  s.push(fass(-12, -2, '#2f8cf0', '#12427c'), fass(8, -4, '#e2543a', '#8a2a1c'), fass(-2, 6, '#ffd23f', '#9a7410'))
  return { svg: s.join(''), hoehe: 36 }
}

export function hubwagen(): Teil {
  const s: string[] = [oval(24)]
  s.push(box(0, 0, 1, 0.5, 0.34, 2.4, '#b9854c', '#d0a068'))
  s.push(box(-0.04, 0, 3.4, 0.4, 0.28, 11, '#d8a866', '#ecc888'))
  s.push(box(0.4, 0, 1.4, 0.3, 0.05, 1.4, '#ff8a1c'))
  s.push(box(0.4, 0.12, 1.4, 0.3, 0.05, 1.4, '#ff8a1c'))
  const [x, y] = iso(0.54, 0.0, 3)
  s.push(`<path d="M${r1(x)} ${r1(y)} L${r1(x + 7)} ${r1(y - 22)} h6" stroke="#ff8a1c" stroke-width="2.4" fill="none" stroke-linecap="round"/><rect x="${r1(x + 6)}" y="${r1(y - 25)}" width="9" height="3.6" rx="1.4" fill="#2b2f3a"/>`)
  s.push(kreis(iso(0.5, -0.06, 1.4)[0], iso(0.5, -0.06, 1.4)[1], 2.2, '#2b2f3a', '#14161c', 0.4))
  return { svg: s.join(''), hoehe: 36 }
}

export function containerturm(): Teil {
  const box_ = (u: number, v: number, z: number, farbe: string): string => {
    let s = quader({ u0: u - 0.21, v0: v - 0.1, u1: u + 0.21, v1: v + 0.1, z, h: 12, farbe })
    for (let i = 1; i < 8; i++) {
      const uu = u - 0.21 + (0.42 * i) / 8
      s += `<polyline points="${pu(uu, v + 0.1, z + 1)} ${pu(uu, v + 0.1, z + 11)}" stroke="${ton(farbe, 0.7)}" stroke-width="0.8" opacity="0.7" fill="none"/>`
    }
    return s
  }
  return {
    svg: schatten(-0.34, -0.22, 0.34, 0.26, 0.28) + box_(-0.08, -0.08, 0, '#2f8cf0') + box_(0.1, 0.1, 0, '#e2543a') + box_(-0.08, -0.08, 12, '#ffb21c') + box_(0.1, 0.1, 12, '#46b84a') + box_(0.0, 0.0, 24, '#e2543a'),
    hoehe: 40,
  }
}

export function muelleimer(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(18)
  const tonne = (dx: number, f: string, d: string): string =>
    `<path d="M${r1(x + dx - 8)} ${r1(y - 22)} L${r1(x + dx - 6.5)} ${r1(y)} Q${r1(x + dx)} ${r1(y + 3)} ${r1(x + dx + 6.5)} ${r1(y)} L${r1(x + dx + 8)} ${r1(y - 22)} Z" fill="${f}" stroke="${d}" stroke-width="0.9" stroke-linejoin="round"/>` +
    `<ellipse cx="${r1(x + dx)}" cy="${r1(y - 22)}" rx="8.6" ry="3" fill="${ton(f, 1.15)}" stroke="${d}" stroke-width="0.9"/>` +
    `<path d="M${r1(x + dx - 3)} ${r1(y - 12)} l3 3 l3 -3 M${r1(x + dx)} ${r1(y - 14)} v5" stroke="#fff" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.8"/>`
  s += tonne(-9, '#46b84a', '#1f6a2a') + tonne(9, '#6b7280', '#2b2f3a')
  return { svg: s, hoehe: 34 }
}

export function rasttisch(): Teil {
  const s: string[] = [oval(30)]
  s.push(box(0, 0, 9, 0.5, 0.26, 2.4, '#c98a45', '#e0aa6a'))
  for (const [u, v] of [[-0.2, -0.1], [0.2, -0.1], [-0.2, 0.1], [0.2, 0.1]] as const) s.push(box(u, v, 0, 0.04, 0.04, 9, '#8a5a2a'))
  for (const v of [-0.22, 0.22]) {
    s.push(box(0, v, 5.5, 0.5, 0.1, 2, '#c98a45', '#e0aa6a'))
    s.push(box(-0.2, v, 0, 0.04, 0.04, 5.5, '#8a5a2a'), box(0.2, v, 0, 0.04, 0.04, 5.5, '#8a5a2a'))
  }
  const [x, y] = iso(0, 0, 11.4)
  s.push(`<rect x="${r1(x - 1)}" y="${r1(y - 34)}" width="2" height="34" fill="#e8e2d4" stroke="${KONTUR}" stroke-width="0.5"/>`)
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + (Math.PI * i) / 6
    const a1 = Math.PI + (Math.PI * (i + 1)) / 6
    const p = (a: number) => `${r1(x + Math.cos(a) * 24)},${r1(y - 28 + Math.sin(a) * 9)}`
    s.push(`<polygon points="${r1(x)},${r1(y - 40)} ${p(a0)} ${p(a1)}" fill="${i % 2 ? '#fff6e0' : '#2f8cf0'}" stroke="#12427c" stroke-width="0.5" stroke-linejoin="round"/>`)
  }
  return { svg: s.join(''), hoehe: 56 }
}

export const SPEDITION_DEKO: { key: string; label: string; category: 'fahrzeuge' | 'gebaeude_deko' | 'ladung_ausstattung' | 'abzeichen_trophaeen'; bild: () => Teil }[] = [
  { key: 'tankwagen', label: 'Tankwagen', category: 'fahrzeuge', bild: tankwagen },
  { key: 'kipper', label: 'Kipper', category: 'fahrzeuge', bild: kipper },
  { key: 'abschleppwagen', label: 'Abschleppwagen', category: 'fahrzeuge', bild: abschleppwagen },
  { key: 'hecke', label: 'Hecke', category: 'gebaeude_deko', bild: hecke },
  { key: 'blumenkuebel', label: 'Blumenkübel', category: 'gebaeude_deko', bild: blumenkuebel },
  { key: 'parkbank', label: 'Parkbank', category: 'gebaeude_deko', bild: parkbank },
  { key: 'werbeschild', label: 'Werbeschild', category: 'gebaeude_deko', bild: werbeschild },
  { key: 'verkehrsschild', label: 'Verkehrsschild', category: 'gebaeude_deko', bild: verkehrsschild },
  { key: 'schranke', label: 'Schranke', category: 'gebaeude_deko', bild: schranke },
  { key: 'schuppen', label: 'Schuppen', category: 'gebaeude_deko', bild: schuppen },
  { key: 'wasserturm', label: 'Wasserturm', category: 'gebaeude_deko', bild: wasserturm },
  { key: 'imbisswagen', label: 'Imbisswagen', category: 'gebaeude_deko', bild: imbisswagen },
  { key: 'brueckenwaage', label: 'Brückenwaage', category: 'gebaeude_deko', bild: brueckenwaage },
  { key: 'wetterfahne', label: 'Wetterfahne', category: 'gebaeude_deko', bild: wetterfahne },
  { key: 'reifenstapel', label: 'Reifenstapel', category: 'ladung_ausstattung', bild: reifenstapel },
  { key: 'oelfaesser', label: 'Ölfässer', category: 'ladung_ausstattung', bild: oelfaesser },
  { key: 'hubwagen', label: 'Hubwagen', category: 'ladung_ausstattung', bild: hubwagen },
  { key: 'containerturm', label: 'Containerturm', category: 'ladung_ausstattung', bild: containerturm },
  { key: 'muelleimer', label: 'Mülleimer', category: 'ladung_ausstattung', bild: muelleimer },
  { key: 'rasttisch', label: 'Rasttisch', category: 'ladung_ausstattung', bild: rasttisch },
]
