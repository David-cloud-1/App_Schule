import { iso, ton, quader, schatten, satteldach, fensterLinks } from './iso'
import type { Teil } from './bauteile'
import { BLUR, KONTUR, box, kreis, oval, pu, r1, rad } from './spedition-weich'

/**
 * Resort-Deko im weichen Stil (PROJ-36): Transfer, Freizeit, Natur und Zierrat.
 * Gleiche Bausteine und Palette wie resort-weich.ts.
 */

const WASSER = '#3ec1e8'
const WASSER_HELL = '#8fe4f7'

// ── Transfer ─────────────────────────────────────────────────────────────────

export function golfcart(): Teil {
  const s: string[] = [oval(24)]
  s.push(box(0, 0, 4, 0.5, 0.26, 8, '#fbfbf7', '#ffffff'))
  s.push(box(0.26, 0, 4, 0.16, 0.26, 5, '#17a5c0', '#58d0e8'))
  s.push(box(-0.14, 0, 12, 0.22, 0.24, 4, '#17a5c0', '#58d0e8'))
  for (const [u, v] of [[-0.24, -0.1], [0.12, -0.1], [-0.24, 0.1], [0.12, 0.1]] as const) s.push(box(u, v, 12, 0.025, 0.025, 18, '#8a919c'))
  s.push(box(-0.06, 0, 30, 0.5, 0.3, 2.4, '#fbfbf7', '#ffffff'))
  s.push(box(0.05, 0.1, 7.5, 0.2, 0.04, 0.8, '#17a5c0'))
  s.push(rad(-0.18, 0.14, 4, 4.2), rad(0.26, 0.14, 4, 4.2))
  return { svg: s.join(''), hoehe: 36 }
}

export function tuktuk(): Teil {
  const s: string[] = [oval(22)]
  s.push(box(-0.06, 0, 5, 0.44, 0.26, 12, '#ffd23f', '#ffe27a'))
  s.push(box(0.2, 0, 5, 0.14, 0.18, 9, '#2f9a3a', '#46b84a'))
  for (const [u, v] of [[-0.24, -0.1], [0.06, -0.1], [-0.24, 0.1], [0.06, 0.1]] as const) s.push(box(u, v, 17, 0.025, 0.025, 12, '#8a919c'))
  s.push(box(-0.09, 0, 29, 0.44, 0.3, 3, '#e2543a', '#f27a5c'))
  for (let i = 0; i < 6; i++) s.push(`<polygon points="${pu(-0.3 + i * 0.07, 0.15, 29)} ${pu(-0.23 + i * 0.07, 0.15, 29)} ${pu(-0.23 + i * 0.07, 0.15, 26)} ${pu(-0.3 + i * 0.07, 0.15, 26)}" fill="${i % 2 ? '#fff6e0' : '#e2543a'}"/>`)
  s.push(rad(-0.2, 0.14, 4, 4.2), rad(0.22, 0.06, 4, 4))
  return { svg: s.join(''), hoehe: 38 }
}

export function fahrradstaender(): Teil {
  const s: string[] = [oval(28)]
  s.push(box(0, 0, 0, 0.6, 0.18, 2, '#8a919c', '#aab0ba'))
  const rad2 = (cx: number, cy: number) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="6" fill="none" stroke="#2b2f3a" stroke-width="1.6"/><circle cx="${r1(cx)}" cy="${r1(cy)}" r="1.2" fill="#9aa0aa"/>`
  const bike = (u: number, farbe: string): string => {
    const [x, y] = iso(u, 0.02, 2)
    return `${rad2(x - 10, y - 6)}${rad2(x + 10, y - 6)}<path d="M${r1(x - 10)} ${r1(y - 6)} L${r1(x - 2)} ${r1(y - 18)} L${r1(x + 6)} ${r1(y - 6)} L${r1(x - 10)} ${r1(y - 6)} M${r1(x - 2)} ${r1(y - 18)} L${r1(x + 9)} ${r1(y - 20)} L${r1(x + 10)} ${r1(y - 6)}" fill="none" stroke="${farbe}" stroke-width="2"/><path d="M${r1(x - 4)} ${r1(y - 21)} h5" stroke="#2b2f3a" stroke-width="2.2" stroke-linecap="round"/><path d="M${r1(x + 7)} ${r1(y - 22)} h5" stroke="#2b2f3a" stroke-width="2" stroke-linecap="round"/>`
  }
  s.push(bike(-0.2, '#e2543a'), bike(0.0, '#2f8cf0'), bike(0.2, '#ffd23f'))
  return { svg: s.join(''), hoehe: 34 }
}

// ── Gebäude & Freizeit ───────────────────────────────────────────────────────

export function tennisplatz(): Teil {
  const s: string[] = [oval(36)]
  s.push(quader({ u0: -0.46, v0: -0.4, u1: 0.46, v1: 0.4, h: 3, farbe: '#c0503c', dachFarbe: '#e07a5c' }))
  const lin = (a: string) => `<polyline points="${a}" stroke="#fbfbf7" stroke-width="1.5" fill="none" stroke-linejoin="round"/>`
  s.push(lin(`${pu(-0.4, -0.34, 3.4)} ${pu(0.4, -0.34, 3.4)} ${pu(0.4, 0.34, 3.4)} ${pu(-0.4, 0.34, 3.4)} ${pu(-0.4, -0.34, 3.4)}`))
  s.push(lin(`${pu(-0.22, -0.34, 3.4)} ${pu(-0.22, 0.34, 3.4)} ${pu(0.22, -0.34, 3.4)} ${pu(0.22, 0.34, 3.4)}`))
  s.push(lin(`${pu(-0.22, 0, 3.4)} ${pu(0.22, 0, 3.4)}`))
  // Netz
  s.push(`<polygon points="${pu(0, -0.38, 3.4)} ${pu(0, 0.38, 3.4)} ${pu(0, 0.38, 11)} ${pu(0, -0.38, 11)}" fill="rgba(255,255,255,0.35)" stroke="#fbfbf7" stroke-width="1"/>`)
  for (let i = 1; i < 10; i++) s.push(`<polyline points="${pu(0, -0.38 + (0.76 * i) / 10, 3.4)} ${pu(0, -0.38 + (0.76 * i) / 10, 11)}" stroke="#fbfbf7" stroke-width="0.5" opacity="0.7"/>`)
  for (const v of [-0.38, 0.38]) s.push(box(0, v, 3.4, 0.03, 0.03, 8.5, '#8a919c'))
  const [x, y] = iso(0.28, 0.2, 3.4)
  s.push(kreis(x, y - 2, 2.4, '#e8f23a', '#9aa010', 0.6))
  return { svg: s.join(''), hoehe: 22 }
}

export function hochzeitsbogen(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(22)
  s += `<rect x="${r1(x - 20)}" y="${r1(y - 46)}" width="4" height="46" rx="1.4" fill="#fbfbf7" stroke="${KONTUR}" stroke-width="0.8"/><rect x="${r1(x + 16)}" y="${r1(y - 46)}" width="4" height="46" rx="1.4" fill="#fbfbf7" stroke="${KONTUR}" stroke-width="0.8"/>`
  s += `<path d="M${r1(x - 18)} ${r1(y - 44)} Q${r1(x)} ${r1(y - 66)} ${r1(x + 18)} ${r1(y - 44)}" fill="none" stroke="#fbfbf7" stroke-width="4" stroke-linecap="round"/><path d="M${r1(x - 18)} ${r1(y - 44)} Q${r1(x)} ${r1(y - 66)} ${r1(x + 18)} ${r1(y - 44)}" fill="none" stroke="${KONTUR}" stroke-width="0.6" opacity="0.5"/>`
  for (let i = 0; i < 9; i++) {
    const t = i / 8
    const px = x - 18 + 36 * t
    const py = y - 44 - Math.sin(Math.PI * t) * 16
    s += kreis(px, py, 3.2, ['#ff8fb1', '#fbfbf7', '#ffd23f'][i % 3]!, KONTUR, 0.5)
  }
  for (const side of [-18, 18]) for (let k = 0; k < 4; k++) s += kreis(x + side, y - 8 - k * 9, 2.6, ['#ff8fb1', '#fbfbf7'][k % 2]!, KONTUR, 0.5)
  s += `<path d="M${r1(x - 8)} ${r1(y - 2)} q8 -4 16 0" fill="none" stroke="#ff8fb1" stroke-width="2" opacity="0.7"/>`
  return { svg: s, hoehe: 76 }
}

export function pavillon(): Teil {
  const s: string[] = [schatten(-0.36, -0.36, 0.38, 0.38, 0.26)]
  s.push(quader({ u0: -0.36, v0: -0.36, u1: 0.36, v1: 0.36, h: 3, farbe: '#e8dcc0', dachFarbe: '#f3ead2' }))
  for (const [u, v] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]] as const) s.push(box(u, v, 3, 0.05, 0.05, 28, '#fbfbf7', '#ffffff'))
  s.push(box(-0.02, -0.02, 3, 0.24, 0.24, 7, '#c98a45', '#e0aa6a'))
  s.push(satteldach({ u0: -0.4, v0: -0.4, u1: 0.4, v1: 0.4, z: 31, hoehe: 16, farbe: '#17a5c0' }))
  const [x, y] = iso(0.0, 0.0, 48)
  s.push(kreis(x, y, 2.4, '#ffd23f', KONTUR, 0.6))
  for (let i = 0; i < 5; i++) s.push(kreis(iso(-0.3 + i * 0.15, 0.4, 31)[0], iso(-0.3 + i * 0.15, 0.4, 31)[1] + 3, 2, i % 2 ? '#ff8fb1' : '#ffd23f', KONTUR, 0.4))
  return { svg: s.join(''), hoehe: 56 }
}

export function saunahaus(): Teil {
  const s: string[] = [schatten(-0.34, -0.3, 0.38, 0.34, 0.26)]
  s.push(quader({ u0: -0.34, v0: -0.3, u1: 0.34, v1: 0.3, h: 2.5, farbe: '#b9b2a4' }))
  s.push(quader({ u0: -0.32, v0: -0.28, u1: 0.32, v1: 0.28, z: 2.5, h: 22, farbe: '#c9904a' }))
  for (let i = 1; i < 6; i++) s.push(`<polyline points="${pu(0.32, -0.28, 2.5 + i * 3.6)} ${pu(0.32, 0.28, 2.5 + i * 3.6)}" stroke="#7a4a1c" stroke-width="0.8" opacity="0.6"/>`)
  s.push(`<polygon points="${pu(0.32, -0.1, 2.5)} ${pu(0.32, 0.1, 2.5)} ${pu(0.32, 0.1, 18)} ${pu(0.32, -0.1, 18)}" fill="#7a4a2a" stroke="#fff6e0" stroke-width="1"/><polygon points="${pu(0.32, 0.12, 8)} ${pu(0.32, 0.18, 8)} ${pu(0.32, 0.18, 16)} ${pu(0.32, 0.12, 16)}" fill="#ffe9a8"/>`)
  s.push(satteldach({ u0: -0.38, v0: -0.34, u1: 0.38, v1: 0.34, z: 24.5, hoehe: 12, farbe: '#4a3a30' }))
  const [x, y] = iso(-0.2, -0.1, 37)
  s.push(`<rect x="${r1(x - 2.4)}" y="${r1(y - 8)}" width="4.8" height="10" fill="#8a5a3a" stroke="#5a3a24" stroke-width="0.6"/>`)
  for (const [dx, r, d] of [[0, 3.2, 0], [1.4, 2.6, 1.2], [-1, 2.9, 2.4]] as const) s.push(`<circle class="bt-rauch" style="animation-delay:${d}s" cx="${r1(x + dx)}" cy="${r1(y - 10)}" r="${r}" fill="#f1f3f5"/>`)
  s.push(`<rect x="${r1(iso(0.34, 0, 24)[0] - 8)}" y="${r1(iso(0.34, 0, 24)[1] - 8)}" width="16" height="7" rx="1.4" fill="#fff6e0" stroke="${KONTUR}" stroke-width="0.7"/><text x="${r1(iso(0.34, 0, 24)[0])}" y="${r1(iso(0.34, 0, 24)[1] - 2.8)}" font-family="sans-serif" font-size="4.6" font-weight="800" text-anchor="middle" fill="#8a4a2a">SAUNA</text>`)
  return { svg: s.join(''), hoehe: 56 }
}

export function eisdiele(): Teil {
  const s: string[] = [schatten(-0.34, -0.3, 0.38, 0.34, 0.26)]
  s.push(quader({ u0: -0.34, v0: -0.3, u1: 0.34, v1: 0.3, h: 2.5, farbe: '#d6cfbf' }))
  s.push(quader({ u0: -0.32, v0: -0.28, u1: 0.32, v1: 0.28, z: 2.5, h: 22, farbe: '#ffc2d6' }))
  s.push(fensterLinks({ u0: -0.32, u1: 0.32, v: 0.28 }, 11, 8, 2, '#fff6e0'))
  s.push(`<polygon points="${pu(0.32, -0.16, 8)} ${pu(0.32, 0.16, 8)} ${pu(0.32, 0.16, 18)} ${pu(0.32, -0.16, 18)}" fill="#fff6e0" stroke="${KONTUR}" stroke-width="0.7"/>`)
  for (let i = 0; i < 6; i++) s.push(`<polygon points="${pu(0.32, -0.2 + i * 0.07, 22)} ${pu(0.32, -0.13 + i * 0.07, 22)} ${pu(0.42, -0.13 + i * 0.07, 17)} ${pu(0.42, -0.2 + i * 0.07, 17)}" fill="${i % 2 ? '#fff6e0' : '#ff6f9a'}" stroke="#a02a5a" stroke-width="0.4"/>`)
  s.push(satteldach({ u0: -0.38, v0: -0.34, u1: 0.38, v1: 0.34, z: 24.5, hoehe: 9, farbe: '#17a5c0' }))
  const [x, y] = iso(0.0, 0.0, 41)
  s.push(`<path d="M${r1(x - 6)} ${r1(y - 12)} L${r1(x)} ${r1(y + 4)} L${r1(x + 6)} ${r1(y - 12)} Z" fill="#d9a05c" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>${kreis(x, y - 14, 7, '#ff8fb1', KONTUR, 0.8)}${kreis(x - 1, y - 21, 5.4, '#fff6e0', KONTUR, 0.8)}${kreis(x + 1, y - 26, 2.4, '#e2543a', KONTUR, 0.6)}`)
  return { svg: s.join(''), hoehe: 70 }
}

export function volleyballfeld(): Teil {
  const s: string[] = [oval(36)]
  s.push(quader({ u0: -0.46, v0: -0.36, u1: 0.46, v1: 0.36, h: 2.4, farbe: '#e8c870', dachFarbe: '#f1d9a0' }))
  s.push(`<polyline points="${pu(-0.4, -0.3, 2.8)} ${pu(0.4, -0.3, 2.8)} ${pu(0.4, 0.3, 2.8)} ${pu(-0.4, 0.3, 2.8)} ${pu(-0.4, -0.3, 2.8)}" stroke="#fbfbf7" stroke-width="1.3" fill="none"/>`)
  for (const v of [-0.36, 0.36]) s.push(box(0, v, 2.4, 0.04, 0.04, 30, '#c98a45'))
  s.push(`<polygon points="${pu(0, -0.36, 22)} ${pu(0, 0.36, 22)} ${pu(0, 0.36, 30)} ${pu(0, -0.36, 30)}" fill="rgba(255,255,255,0.3)" stroke="#fbfbf7" stroke-width="1"/>`)
  for (let i = 1; i < 12; i++) s.push(`<polyline points="${pu(0, -0.36 + (0.72 * i) / 12, 22)} ${pu(0, -0.36 + (0.72 * i) / 12, 30)}" stroke="#fbfbf7" stroke-width="0.5" opacity="0.7"/>`)
  s.push(`<polyline points="${pu(0, -0.36, 30)} ${pu(0, 0.36, 30)}" stroke="#e2543a" stroke-width="2"/>`)
  const [x, y] = iso(0.22, 0.12, 2.8)
  s.push(kreis(x, y - 4, 4.2, '#fbfbf7', '#8a919c', 0.7) + `<path d="M${r1(x - 4)} ${r1(y - 4)} q4 3 8 0 M${r1(x)} ${r1(y - 8)} q-3 4 0 8" stroke="#ffb21c" stroke-width="0.9" fill="none"/>`)
  return { svg: s.join(''), hoehe: 38 }
}

export function bungalow(): Teil {
  const s: string[] = [schatten(-0.34, -0.3, 0.38, 0.34, 0.26)]
  s.push(quader({ u0: -0.34, v0: -0.3, u1: 0.34, v1: 0.3, h: 2.5, farbe: '#c9904a' }))
  s.push(quader({ u0: -0.32, v0: -0.28, u1: 0.32, v1: 0.28, z: 2.5, h: 17, farbe: '#fff1d4' }))
  s.push(fensterLinks({ u0: -0.32, u1: 0.32, v: 0.28 }, 8, 8, 2, '#7ec6e6'))
  s.push(`<polygon points="${pu(0.32, -0.1, 2.5)} ${pu(0.32, 0.1, 2.5)} ${pu(0.32, 0.1, 15)} ${pu(0.32, -0.1, 15)}" fill="#17a5c0" stroke="#fff6e0" stroke-width="1"/>`)
  s.push(quader({ u0: 0.32, v0: -0.26, u1: 0.44, v1: 0.26, h: 2.5, farbe: '#c9904a', dachFarbe: '#e0aa6a' }))
  s.push(satteldach({ u0: -0.38, v0: -0.34, u1: 0.38, v1: 0.34, z: 19.5, hoehe: 15, farbe: '#e8c860' }))
  const [x, y] = iso(0.0, 0.0, 34)
  s.push(`<path d="M${r1(x - 14)} ${r1(y + 6)} q14 -14 28 0" fill="none" stroke="#9a7a1c" stroke-width="0.8" opacity="0.7"/>`)
  s.push(kreis(iso(0.34, 0.22, 4)[0], iso(0.34, 0.22, 4)[1] - 5, 3, '#ff8fb1', KONTUR, 0.5))
  return { svg: s.join(''), hoehe: 46 }
}

export function lotusteich(): Teil {
  const s: string[] = [oval(34)]
  s.push(quader({ u0: -0.44, v0: -0.38, u1: 0.44, v1: 0.38, h: 3.4, farbe: '#bdb5a5', dachFarbe: '#d6cfbf' }))
  s.push(`<polygon points="${pu(-0.36, -0.3, 3.8)} ${pu(0.36, -0.3, 3.8)} ${pu(0.36, 0.3, 3.8)} ${pu(-0.36, 0.3, 3.8)}" fill="#2aa9b8" stroke="#1f7a88" stroke-width="0.8" stroke-linejoin="round"/>`)
  for (const [u, v, f] of [[-0.14, -0.08, '#ff8fb1'], [0.14, 0.1, '#fbfbf7'], [0.04, -0.16, '#ff8fb1']] as const) {
    const [x, y] = iso(u, v, 3.8)
    s.push(`<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="9" ry="4" fill="#46b84a" stroke="#1f6a2a" stroke-width="0.7"/>`)
    for (const dx of [-3.4, 0, 3.4]) s.push(`<path d="M${r1(x + dx)} ${r1(y - 1)} q-2.4 -6 0 -9 q2.4 3 0 9 z" fill="${f}" stroke="#a02a5a" stroke-width="0.4"/>`)
  }
  s.push(`<polyline points="${pu(-0.28, 0.2, 4)} ${pu(-0.12, 0.2, 4)}" stroke="${WASSER_HELL}" stroke-width="1.4" stroke-linecap="round"/>`)
  return { svg: s.join(''), hoehe: 22 }
}

// ── Ausstattung & Deko ───────────────────────────────────────────────────────

export function strandkorb(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(20)
  s += `<path d="M${r1(x - 16)} ${r1(y - 2)} v-22 q0 -16 16 -16 q16 0 16 16 v22 z" fill="#ff9a5c" stroke="${KONTUR}" stroke-width="1" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x - 16)} ${r1(y - 16)} h32 M${r1(x - 16)} ${r1(y - 26)} h32" stroke="#fbfbf7" stroke-width="3.2" opacity="0.9"/>`
  s += `<path d="M${r1(x - 14)} ${r1(y - 2)} v-12 q14 -5 28 0 v12 z" fill="#fff6e0" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x - 16)} ${r1(y - 2)} l-3 4 h38 l-3 -4 z" fill="#c98a45" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x - 10)} ${r1(y - 34)} q-1 6 1 12" stroke="#ffd0a8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>`
  return { svg: s, hoehe: 46 }
}

export function lebhecke(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(28)
  s += box(0, 0, 0, 0.7, 0.2, 12, '#2f9a3a', '#46b84a')
  for (let i = 0; i < 7; i++) s += kreis(x - 30 + i * 10, y - 16 + (i % 2 ? -1 : 1), 8, i % 2 ? '#5cc450' : '#46b84a', '#1f6a2a', 0.8)
  for (const [dx, dy, f] of [[-24, -22, '#ff8fb1'], [-12, -26, '#ffd23f'], [0, -23, '#fbfbf7'], [12, -26, '#ff8fb1'], [23, -21, '#ffd23f'], [-4, -18, '#ff6f61']] as const) s += kreis(x + dx, y + dy, 2.8, f, KONTUR, 0.5)
  void y
  return { svg: s, hoehe: 40 }
}

export function haengematte(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(30)
  for (const sx of [-26, 26]) s += `<path d="M${r1(x + sx)} ${r1(y)} q${sx > 0 ? 2 : -2} -26 ${sx > 0 ? -2 : 2} -52" stroke="#b87a3a" stroke-width="4.4" fill="none" stroke-linecap="round"/>${kreis(x + sx, y - 52, 5, '#46b84a', '#1f6a2a', 0.8)}`
  s += `<path d="M${r1(x - 25)} ${r1(y - 42)} Q${r1(x)} ${r1(y - 18)} ${r1(x + 25)} ${r1(y - 42)} L${r1(x + 25)} ${r1(y - 38)} Q${r1(x)} ${r1(y - 12)} ${r1(x - 25)} ${r1(y - 38)} Z" fill="#ff6f61" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x - 18)} ${r1(y - 32)} Q${r1(x)} ${r1(y - 16)} ${r1(x + 18)} ${r1(y - 32)}" stroke="#fff6e0" stroke-width="2" fill="none" opacity="0.8"/>`
  return { svg: s, hoehe: 62 }
}

export function tikifackeln(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(18)
  for (const dx of [-12, 12]) {
    s += `<rect x="${r1(x + dx - 1.6)}" y="${r1(y - 40)}" width="3.2" height="40" rx="1.4" fill="#b87a3a" stroke="${KONTUR}" stroke-width="0.8"/><path d="M${r1(x + dx - 4)} ${r1(y - 40)} h8 l-1 -5 h-6 z" fill="#8a5a2a" stroke="${KONTUR}" stroke-width="0.7"/>`
    s += `<g class="bt-licht"><path d="M${r1(x + dx)} ${r1(y - 62)} q-7 8 -4 17 h8 q3 -9 -4 -17 z" fill="#ff8a1c" stroke="#c9600a" stroke-width="0.7" stroke-linejoin="round"/><path d="M${r1(x + dx)} ${r1(y - 55)} q-3 4 -1.6 9 h3.2 q1.4 -5 -1.6 -9 z" fill="#ffd23f"/></g>`
  }
  return { svg: s, hoehe: 72 }
}

export function surfbretter(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(20)
  s += `<rect x="${r1(x - 20)}" y="${r1(y - 4)}" width="40" height="3" fill="#b87a3a" stroke="${KONTUR}" stroke-width="0.7"/><rect x="${r1(x - 18)}" y="${r1(y - 22)}" width="3" height="20" fill="#b87a3a" stroke="${KONTUR}" stroke-width="0.7"/><rect x="${r1(x + 15)}" y="${r1(y - 22)}" width="3" height="20" fill="#b87a3a" stroke="${KONTUR}" stroke-width="0.7"/>`
  const brett = (dx: number, h: number, f: string, st: string): string =>
    `<path d="M${r1(x + dx)} ${r1(y - 5 - h)} q7 3 7 ${r1(h * 0.4)} v${r1(h * 0.6)} h-14 v${r1(-h * 0.6)} q0 -${r1(h * 0.4)} 7 -${r1(h * 0.4 + 3)} z" fill="${f}" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/><path d="M${r1(x + dx)} ${r1(y - 4 - h)} v${r1(h)}" stroke="${st}" stroke-width="1.6"/>`
  s += brett(-11, 40, '#ff6f61', '#fbfbf7') + brett(0, 44, '#17a5c0', '#ffd23f') + brett(11, 38, '#ffd23f', '#2f8cf0')
  return { svg: s, hoehe: 56 }
}

export function gartenlaterne(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(14)
  s += `<rect x="${r1(x - 1.4)}" y="${r1(y - 38)}" width="2.8" height="38" fill="#4b5563" stroke="#2b2f3a" stroke-width="0.6"/><rect x="${r1(x - 5)}" y="${r1(y - 4)}" width="10" height="4" rx="1.4" fill="#4b5563"/>`
  s += `<path d="M${r1(x - 7)} ${r1(y - 38)} h14 l-2 -5 h-10 z" fill="#4b5563" stroke="#2b2f3a" stroke-width="0.7" stroke-linejoin="round"/>`
  s += `<g class="bt-licht"><rect x="${r1(x - 6)}" y="${r1(y - 52)}" width="12" height="11" rx="3" fill="#ffe27a" stroke="#c9980a" stroke-width="0.8"/><ellipse cx="${r1(x)}" cy="${r1(y - 46)}" rx="14" ry="12" fill="#fff2b0" opacity="0.28"/></g>`
  s += `<path d="M${r1(x - 7)} ${r1(y - 54)} L${r1(x)} ${r1(y - 62)} L${r1(x + 7)} ${r1(y - 54)} Z" fill="#17a5c0" stroke="#0c5a6a" stroke-width="0.8" stroke-linejoin="round"/>`
  return { svg: s, hoehe: 70 }
}

export function resortBlumen(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(20)
  s += `<path d="M${r1(x - 16)} ${r1(y - 14)} L${r1(x - 12)} ${r1(y)} Q${r1(x)} ${r1(y + 5)} ${r1(x + 12)} ${r1(y)} L${r1(x + 16)} ${r1(y - 14)} Z" fill="#17a5c0" stroke="#0c5a6a" stroke-width="0.9" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x - 14)} ${r1(y - 7)} Q${r1(x)} ${r1(y - 2)} ${r1(x + 14)} ${r1(y - 7)}" fill="none" stroke="#fbfbf7" stroke-width="2"/>`
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 14)}" rx="16" ry="5" fill="#6b4220"/>`
  for (const [dx, dy, f] of [[-9, -26, '#ff6f9a'], [0, -32, '#ffd23f'], [9, -27, '#b07cf0'], [-4, -22, '#fbfbf7']] as const) {
    s += `<line x1="${r1(x + dx)}" y1="${r1(y + dy)}" x2="${r1(x + dx)}" y2="${r1(y - 14)}" stroke="#2f8f3a" stroke-width="1.2"/>`
    for (let k = 0; k < 5; k++) { const a = (Math.PI * 2 * k) / 5; s += `<ellipse cx="${r1(x + dx + Math.cos(a) * 3)}" cy="${r1(y + dy + Math.sin(a) * 3)}" rx="2.2" ry="2.2" fill="${f}" stroke="${KONTUR}" stroke-width="0.4"/>` }
    s += kreis(x + dx, y + dy, 1.4, '#ffb21c', '#ffb21c', 0)
  }
  return { svg: s, hoehe: 44 }
}

export function rettungsring(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(16)
  s += `<rect x="${r1(x - 1.4)}" y="${r1(y - 38)}" width="2.8" height="38" fill="#b87a3a" stroke="${KONTUR}" stroke-width="0.7"/><rect x="${r1(x - 9)}" y="${r1(y - 6)}" width="18" height="3.4" rx="1.4" fill="#8a5a2a"/>`
  s += `<circle cx="${r1(x)}" cy="${r1(y - 30)}" r="12" fill="#fbfbf7" stroke="${KONTUR}" stroke-width="1"/><circle cx="${r1(x)}" cy="${r1(y - 30)}" r="5" fill="#7fd24f" stroke="${KONTUR}" stroke-width="0.8"/>`
  for (const a of [0, 90, 180, 270]) { const r = (a * Math.PI) / 180; s += `<path d="M${r1(x + Math.cos(r) * 5)} ${r1(y - 30 + Math.sin(r) * 5)} L${r1(x + Math.cos(r) * 12)} ${r1(y - 30 + Math.sin(r) * 12)}" stroke="#e2543a" stroke-width="4.4" stroke-linecap="butt"/>` }
  s += `<circle cx="${r1(x)}" cy="${r1(y - 30)}" r="12" fill="none" stroke="${KONTUR}" stroke-width="0.9"/><circle cx="${r1(x)}" cy="${r1(y - 30)}" r="5" fill="none" stroke="${KONTUR}" stroke-width="0.8"/>`
  return { svg: s, hoehe: 48 }
}

export function sandburg(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(26)
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 1)}" rx="24" ry="9" fill="#f0d89a" opacity="0.95"/>`
  s += `<path d="M${r1(x - 20)} ${r1(y - 2)} v-14 h40 v14 q-20 6 -40 0 z" fill="#e8c870" stroke="#b8963c" stroke-width="0.9" stroke-linejoin="round"/>`
  for (const dx of [-16, -5, 6, 16]) s += `<rect x="${r1(x + dx - 3)}" y="${r1(y - 21)}" width="6" height="5" fill="#e8c870" stroke="#b8963c" stroke-width="0.8"/>`
  s += `<path d="M${r1(x - 9)} ${r1(y - 16)} v-14 h18 v14 z" fill="#f1d9a0" stroke="#b8963c" stroke-width="0.9" stroke-linejoin="round"/>`
  for (const dx of [-8, 0, 8]) s += `<rect x="${r1(x + dx - 2.4)}" y="${r1(y - 33)}" width="4.8" height="4" fill="#f1d9a0" stroke="#b8963c" stroke-width="0.7"/>`
  s += `<path d="M${r1(x - 3)} ${r1(y - 16)} v-6 q3 -4 6 0 v6 z" fill="#8a6a2a"/>`
  s += `<rect x="${r1(x - 0.6)}" y="${r1(y - 46)}" width="1.2" height="14" fill="#e8e2d4"/><path d="M${r1(x + 0.6)} ${r1(y - 46)} l9 3 l-9 3 z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.5"/>`
  s += kreis(x + 22, y - 3, 3, '#ffd0c0', '#d99a8a', 0.5)
  return { svg: s, hoehe: 58 }
}

export const RESORT_DEKO: { key: string; label: string; category: 'fahrzeuge' | 'gebaeude_deko' | 'ladung_ausstattung' | 'abzeichen_trophaeen'; bild: () => Teil }[] = [
  { key: 'golfcart', label: 'Golfcart', category: 'fahrzeuge', bild: golfcart },
  { key: 'tuktuk', label: 'Tuk-Tuk', category: 'fahrzeuge', bild: tuktuk },
  { key: 'fahrradstaender', label: 'Fahrradständer', category: 'fahrzeuge', bild: fahrradstaender },
  { key: 'tennisplatz', label: 'Tennisplatz', category: 'gebaeude_deko', bild: tennisplatz },
  { key: 'hochzeitsbogen', label: 'Hochzeitsbogen', category: 'gebaeude_deko', bild: hochzeitsbogen },
  { key: 'pavillon', label: 'Pavillon', category: 'gebaeude_deko', bild: pavillon },
  { key: 'saunahaus', label: 'Saunahaus', category: 'gebaeude_deko', bild: saunahaus },
  { key: 'eisdiele', label: 'Eisdiele', category: 'gebaeude_deko', bild: eisdiele },
  { key: 'volleyballfeld', label: 'Volleyballfeld', category: 'gebaeude_deko', bild: volleyballfeld },
  { key: 'bungalow', label: 'Bungalow', category: 'gebaeude_deko', bild: bungalow },
  { key: 'lotusteich', label: 'Lotusteich', category: 'gebaeude_deko', bild: lotusteich },
  { key: 'strandkorb', label: 'Strandkorb', category: 'ladung_ausstattung', bild: strandkorb },
  { key: 'lebhecke', label: 'Blütenhecke', category: 'ladung_ausstattung', bild: lebhecke },
  { key: 'haengematte', label: 'Hängematte', category: 'ladung_ausstattung', bild: haengematte },
  { key: 'tikifackeln', label: 'Tiki-Fackeln', category: 'ladung_ausstattung', bild: tikifackeln },
  { key: 'surfbretter', label: 'Surfbretter', category: 'ladung_ausstattung', bild: surfbretter },
  { key: 'gartenlaterne', label: 'Gartenlaterne', category: 'ladung_ausstattung', bild: gartenlaterne },
  { key: 'resort-blumen', label: 'Blumenkübel', category: 'ladung_ausstattung', bild: resortBlumen },
  { key: 'rettungsring', label: 'Rettungsring', category: 'ladung_ausstattung', bild: rettungsring },
  { key: 'sandburg', label: 'Sandburg', category: 'ladung_ausstattung', bild: sandburg },
]

export { BLUR, WASSER, WASSER_HELL, ton }
