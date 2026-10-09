import { iso, ton, quader, schatten, fensterLinks, fensterRechts, satteldach } from './iso'
import type { Teil } from './bauteile'
import { BLUR, GOLD, GOLDK, KONTUR, SOCKEL, box, kreis, oval, pu, r1, rad, stern, urkundeSped as urkundeResort } from './spedition-weich'

/**
 * Tourismus-Sprites im weichen Stil (PROJ-35): Transfer, Hotel/Freizeit,
 * Natur & Deko, Abzeichen und neue Resort-Bauten. Gleiche Bausteine, Palette
 * und Licht wie spedition-weich.ts, damit beide Fachbereiche aus einem Guss
 * wirken. Fahrzeuge schauen nach Südost.
 */

const WASSER = '#3ec1e8'
const WASSER_HELL = '#8fe4f7'

/** Wasserfläche als Raute am Boden (Pool, Hafen, Segelboot). */
function wasser(u0: number, v0: number, u1: number, v1: number, z = 0): string {
  const p = [pu(u0, v0, z), pu(u1, v0, z), pu(u1, v1, z), pu(u0, v1, z)].join(' ')
  const l1 = `${pu(u0 + 0.1, v0 + 0.14, z)} ${pu(u0 + 0.28, v0 + 0.14, z)}`
  const l2 = `${pu(u1 - 0.3, v1 - 0.14, z)} ${pu(u1 - 0.12, v1 - 0.14, z)}`
  return (
    `<polygon points="${p}" fill="${WASSER}" stroke="#1f8fb8" stroke-width="0.8" stroke-linejoin="round"/>` +
    `<polyline points="${l1}" stroke="${WASSER_HELL}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<polyline points="${l2}" stroke="${WASSER_HELL}" stroke-width="1.4" stroke-linecap="round"/>`
  )
}

// ── Transfer (Fahrzeuge) ─────────────────────────────────────────────────────

export function flugzeug(): Teil {
  const s: string[] = [oval(32)]
  // Tragflächen (flach, hinter und vor dem Rumpf)
  s.push(`<polygon points="${pu(-0.02, -0.46, 13)} ${pu(0.14, -0.46, 13)} ${pu(0.04, 0, 13)} ${pu(-0.12, 0, 13)}" fill="#c9d6e4" stroke="${KONTUR}" stroke-width="0.7" stroke-linejoin="round"/>`)
  s.push(box(-0.04, 0, 7, 0.9, 0.16, 11, '#fbfbf7', '#ffffff'))
  s.push(box(0.46, 0, 8.5, 0.1, 0.13, 8, '#fbfbf7', '#ffffff'))
  s.push(box(-0.46, 0, 9, 0.08, 0.04, 17, '#2f8cf0', '#5aa8f8'))
  s.push(`<polygon points="${pu(-0.4, -0.15, 12)} ${pu(-0.3, -0.15, 12)} ${pu(-0.34, 0, 12)} ${pu(-0.44, 0, 12)}" fill="#c9d6e4"/>`)
  for (let i = 0; i < 7; i++) s.push(`<circle cx="${iso(-0.26 + i * 0.09, 0.082, 14)[0].toFixed(1)}" cy="${iso(-0.26 + i * 0.09, 0.082, 14)[1].toFixed(1)}" r="1.3" fill="#7ec6e6"/>`)
  s.push(`<polygon points="${pu(-0.02, 0.0, 13)} ${pu(0.14, 0.0, 13)} ${pu(0.04, 0.46, 13)} ${pu(-0.12, 0.46, 13)}" fill="#dde6f0" stroke="${KONTUR}" stroke-width="0.7" stroke-linejoin="round"/>`)
  s.push(box(-0.08, 0.2, 8, 0.2, 0.08, 4, '#2f343f'))
  s.push(rad(0.3, 0.1, 5, 3.4), rad(-0.12, 0.1, 5, 3.4))
  return { svg: s.join(''), hoehe: 34 }
}

export function reisebus(): Teil {
  const s: string[] = [oval(30)]
  s.push(box(0, 0, 4, 0.78, 0.3, 22, '#ff9a1c', '#ffb84d'))
  s.push(fensterLinks({ u0: -0.38, u1: 0.38, v: 0.15 }, 14, 8, 5, '#9bdcf5'))
  s.push(`<polygon points="${pu(0.39, -0.12, 14)} ${pu(0.39, 0.12, 14)} ${pu(0.39, 0.12, 23)} ${pu(0.39, -0.12, 23)}" fill="#9bdcf5" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(`<polygon points="${pu(-0.38, 0.152, 8)} ${pu(0.38, 0.152, 8)} ${pu(0.38, 0.152, 11)} ${pu(-0.38, 0.152, 11)}" fill="#fff6e0"/>`)
  s.push(rad(-0.24, 0.16, 5, 5.2), rad(0.24, 0.16, 5, 5.2))
  return { svg: s.join(''), hoehe: 30 }
}

export function zug(): Teil {
  const s: string[] = [oval(32)]
  for (const v of [-0.1, 0.1]) s.push(`<polyline points="${pu(-0.5, v, 1)} ${pu(0.5, v, 1)}" stroke="#7b818c" stroke-width="1.6"/>`)
  for (let i = 0; i < 9; i++) s.push(`<polyline points="${pu(-0.46 + i * 0.115, -0.15, 0.5)} ${pu(-0.46 + i * 0.115, 0.15, 0.5)}" stroke="#8a5a2a" stroke-width="1.4" opacity="0.8"/>`)
  s.push(box(0.26, 0, 3, 0.4, 0.26, 16, '#e2543a', '#f27a5c'))
  s.push(box(0.34, 0, 19, 0.2, 0.22, 4, '#2f343f'))
  s.push(`<polygon points="${pu(0.462, -0.1, 8)} ${pu(0.462, 0.1, 8)} ${pu(0.462, 0.1, 16)} ${pu(0.462, -0.1, 16)}" fill="#9bdcf5" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(box(-0.2, 0, 3, 0.5, 0.26, 18, '#ffd23f', '#ffe27a'))
  s.push(fensterLinks({ u0: -0.45, u1: 0.05, v: 0.13 }, 11, 7, 4, '#9bdcf5'))
  s.push(rad(0.14, 0.14, 4, 3.8), rad(0.38, 0.14, 4, 3.8), rad(-0.38, 0.14, 4, 3.8), rad(-0.08, 0.14, 4, 3.8))
  return { svg: s.join(''), hoehe: 28 }
}

export function kreuzfahrtschiff(): Teil {
  const s: string[] = [wasser(-0.5, -0.4, 0.5, 0.4, 0)]
  s.push(box(0, 0, 2, 0.8, 0.3, 9, '#fbfbf7', '#ffffff'))
  s.push(box(0.46, 0, 2, 0.14, 0.2, 6, '#fbfbf7', '#ffffff'))
  s.push(box(0, 0, 11, 0.7, 0.26, 3, '#2f8cf0'))
  s.push(box(-0.02, 0, 14, 0.6, 0.24, 8, '#fbfbf7', '#ffffff'))
  s.push(fensterLinks({ u0: -0.32, u1: 0.28, v: 0.12 }, 16, 3.4, 8, '#7ec6e6'))
  s.push(box(-0.04, 0, 22, 0.4, 0.2, 6, '#fbfbf7', '#ffffff'))
  s.push(box(-0.06, 0, 28, 0.12, 0.12, 9, '#e2543a', '#f27a5c'))
  s.push(box(-0.06, 0, 35, 0.13, 0.13, 2, '#2f343f'))
  return { svg: s.join(''), hoehe: 46 }
}

export function mietwagen(): Teil {
  const s: string[] = [oval(26)]
  s.push(box(0, 0, 4, 0.6, 0.3, 9, '#3fc060', '#6ee080'))
  s.push(box(-0.04, 0, 13, 0.32, 0.26, 8, '#3fc060', '#6ee080'))
  s.push(fensterLinks({ u0: -0.18, u1: 0.1, v: 0.13 }, 14, 5, 2, '#9bdcf5'))
  s.push(`<polygon points="${pu(0.121, -0.1, 13.5)} ${pu(0.121, 0.1, 13.5)} ${pu(0.121, 0.1, 19)} ${pu(0.121, -0.1, 19)}" fill="#9bdcf5" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(`<polygon points="${pu(0.302, -0.1, 7)} ${pu(0.302, -0.06, 7)} ${pu(0.302, -0.06, 9.5)} ${pu(0.302, -0.1, 9.5)}" fill="#fff2b0"/>`)
  s.push(rad(-0.18, 0.16, 5, 4.6), rad(0.2, 0.16, 5, 4.6))
  return { svg: s.join(''), hoehe: 24 }
}

export function heissluftballon(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(18)
  s += `<defs><linearGradient id="hb" x1="0" x2="1"><stop offset="0" stop-color="#ff7a6a"/><stop offset="1" stop-color="#d9402c"/></linearGradient></defs>`
  s += `<path d="M${r1(x)} ${r1(y - 80)} C${r1(x - 34)} ${r1(y - 80)} ${r1(x - 34)} ${r1(y - 42)} ${r1(x - 7)} ${r1(y - 26)} L${r1(x + 7)} ${r1(y - 26)} C${r1(x + 34)} ${r1(y - 42)} ${r1(x + 34)} ${r1(y - 80)} ${r1(x)} ${r1(y - 80)} Z" fill="url(#hb)" stroke="#8a2a1c" stroke-width="1" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x)} ${r1(y - 80)} C${r1(x - 13)} ${r1(y - 66)} ${r1(x - 12)} ${r1(y - 40)} ${r1(x - 3)} ${r1(y - 26)} L${r1(x + 3)} ${r1(y - 26)} C${r1(x + 12)} ${r1(y - 40)} ${r1(x + 13)} ${r1(y - 66)} ${r1(x)} ${r1(y - 80)} Z" fill="#ffd23f" opacity="0.95"/>`
  s += `<path d="M${r1(x - 22)} ${r1(y - 62)} q-3 8 -1 14" stroke="#fff3b8" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.8"/>`
  s += `<line x1="${r1(x - 6)}" y1="${r1(y - 26)}" x2="${r1(x - 5)}" y2="${r1(y - 11)}" stroke="#8a5a2a" stroke-width="1"/><line x1="${r1(x + 6)}" y1="${r1(y - 26)}" x2="${r1(x + 5)}" y2="${r1(y - 11)}" stroke="#8a5a2a" stroke-width="1"/>`
  s += `<rect x="${r1(x - 8)}" y="${r1(y - 11)}" width="16" height="11" rx="2" fill="#c98a45" stroke="${KONTUR}" stroke-width="0.9"/><path d="M${r1(x - 8)} ${r1(y - 6)} h16" stroke="#8a5a2a" stroke-width="0.8"/>`
  return { svg: s, hoehe: 90 }
}

export function segelboot(): Teil {
  const s: string[] = [wasser(-0.42, -0.34, 0.42, 0.34, 0)]
  const [x, y] = iso(0, 0, 4)
  s.push(`<path d="M${r1(x - 24)} ${r1(y - 4)} L${r1(x + 24)} ${r1(y - 4)} L${r1(x + 17)} ${r1(y + 6)} L${r1(x - 17)} ${r1(y + 6)} Z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`)
  s.push(`<rect x="${r1(x - 1.2)}" y="${r1(y - 52)}" width="2.4" height="48" fill="#e8e2d4" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(`<path d="M${r1(x + 2)} ${r1(y - 50)} Q${r1(x + 22)} ${r1(y - 28)} ${r1(x + 20)} ${r1(y - 8)} L${r1(x + 2)} ${r1(y - 8)} Z" fill="#fff6e0" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`)
  s.push(`<path d="M${r1(x - 3)} ${r1(y - 44)} Q${r1(x - 16)} ${r1(y - 24)} ${r1(x - 20)} ${r1(y - 8)} L${r1(x - 3)} ${r1(y - 8)} Z" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`)
  s.push(`<path d="M${r1(x + 1)} ${r1(y - 52)} l10 3 l-10 3 z" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.6"/>`)
  return { svg: s.join(''), hoehe: 64 }
}

export function seilbahn(): Teil {
  const s: string[] = [oval(24)]
  for (const u of [-0.32, 0.32]) {
    s.push(box(u, 0, 0, 0.1, 0.1, 62, '#8a919c', '#aab0ba'))
    s.push(box(u, 0, 58, 0.22, 0.06, 3, '#6b7280'))
  }
  const [x0, y0] = iso(-0.32, 0, 60)
  const [x1, y1] = iso(0.32, 0, 60)
  s.push(`<polyline points="${r1(x0)},${r1(y0)} ${r1((x0 + x1) / 2)},${r1((y0 + y1) / 2 + 3)} ${r1(x1)},${r1(y1)}" stroke="#4b5563" stroke-width="1.6" fill="none"/>`)
  const [cx, cy] = iso(0, 0, 0)
  s.push(`<line x1="${r1(cx)}" y1="${r1((y0 + y1) / 2 + 3)}" x2="${r1(cx)}" y2="${r1(cy - 34)}" stroke="#4b5563" stroke-width="1.6"/>`)
  s.push(`<rect x="${r1(cx - 13)}" y="${r1(cy - 34)}" width="26" height="22" rx="4" fill="#ff9a1c" stroke="${KONTUR}" stroke-width="0.9"/>`)
  s.push(`<rect x="${r1(cx - 10)}" y="${r1(cy - 31)}" width="8" height="10" rx="1.5" fill="#9bdcf5"/><rect x="${r1(cx + 2)}" y="${r1(cy - 31)}" width="8" height="10" rx="1.5" fill="#9bdcf5"/>`)
  s.push(`<rect x="${r1(cx - 13)}" y="${r1(cy - 20)}" width="26" height="3" fill="#fff6e0" opacity="0.9"/>`)
  return { svg: s.join(''), hoehe: 72 }
}

// ── Gebäude & Freizeit ───────────────────────────────────────────────────────

export function hotel(): Teil {
  const s: string[] = [schatten(-0.42, -0.42, 0.46, 0.46, 0.3)]
  s.push(quader({ u0: -0.42, v0: -0.4, u1: 0.42, v1: 0.4, h: 3, farbe: '#d6cfbf' }))
  s.push(quader({ u0: -0.4, v0: -0.38, u1: 0.4, v1: 0.38, z: 3, h: 52, farbe: '#fff1d4' }))
  for (const z of [8, 24, 40]) {
    s.push(fensterLinks({ u0: -0.4, u1: 0.4, v: 0.38 }, z, 8, 4, '#7ec6e6'))
    s.push(fensterRechts({ v0: -0.38, v1: 0.38, u: 0.4 }, z, 8, 4, '#6ab8dc'))
    s.push(quader({ u0: 0.4, v0: -0.34, u1: 0.46, v1: 0.34, z: z - 3, h: 2.4, farbe: '#ff8fb1', dachFarbe: '#ffb3c9' }))
  }
  s.push(quader({ u0: -0.44, v0: -0.42, u1: 0.44, v1: 0.42, z: 55, h: 4, farbe: '#e2543a', dachFarbe: '#f27a5c' }))
  s.push(quader({ u0: -0.14, v0: -0.14, u1: 0.1, v1: 0.1, z: 59, h: 9, farbe: '#fbfbf7', dachFarbe: '#ffffff' }))
  const [x, y] = iso(0.52, 0.0, 22)
  s.push(`<rect x="${r1(x - 12)}" y="${r1(y - 7)}" width="24" height="9" rx="2" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="0.8"/>`)
  s.push(`<text x="${r1(x)}" y="${r1(y)}" font-family="sans-serif" font-size="6.5" font-weight="700" text-anchor="middle" fill="#fff">HOTEL</text>`)
  return { svg: s.join(''), hoehe: 70 }
}

export function reisebuero(): Teil {
  const s: string[] = [schatten(-0.4, -0.38, 0.44, 0.42, 0.28)]
  s.push(quader({ u0: -0.4, v0: -0.36, u1: 0.4, v1: 0.36, h: 3, farbe: '#d6cfbf' }))
  s.push(quader({ u0: -0.38, v0: -0.34, u1: 0.38, v1: 0.34, z: 3, h: 28, farbe: '#7dd3c8' }))
  s.push(fensterLinks({ u0: -0.38, u1: 0.38, v: 0.34 }, 12, 10, 3, '#fff6e0'))
  s.push(`<polygon points="${pu(0.38, -0.26, 4)} ${pu(0.38, 0.26, 4)} ${pu(0.38, 0.26, 24)} ${pu(0.38, -0.26, 24)}" fill="#bfeff0" stroke="${KONTUR}" stroke-width="0.7"/>`)
  for (let i = 0; i < 8; i++) {
    const a = -0.3 + (0.6 * i) / 8
    const b = -0.3 + (0.6 * (i + 1)) / 8
    s.push(`<polygon points="${pu(0.38, a, 28)} ${pu(0.38, b, 28)} ${pu(0.5, b, 22)} ${pu(0.5, a, 22)}" fill="${i % 2 ? '#fff6e0' : '#ff6f61'}" stroke="#7d2a1a" stroke-width="0.5"/>`)
  }
  s.push(satteldach({ u0: -0.43, v0: -0.4, u1: 0.43, v1: 0.4, z: 31, hoehe: 12, farbe: '#ff8a5c' }))
  const [x, y] = iso(0.52, 0, 34)
  s.push(`<rect x="${r1(x - 13)}" y="${r1(y - 6)}" width="26" height="9" rx="2" fill="#fff6e0" stroke="${KONTUR}" stroke-width="0.8"/><text x="${r1(x)}" y="${r1(y + 0.8)}" font-family="sans-serif" font-size="6.2" font-weight="700" text-anchor="middle" fill="#e2543a">REISEN</text>`)
  return { svg: s.join(''), hoehe: 46 }
}

export function palme(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(20)
  s += `<path d="M${r1(x - 3)} ${r1(y)} q-3 -22 5 -44 q3 -8 4 -12 l5 1 q-1 6 -4 14 q-9 22 -4 41 z" fill="#b87a3a" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`
  for (const dy of [-12, -22, -32]) s += `<path d="M${r1(x - 4 + (dy / -22))} ${r1(y + dy)} h8" stroke="#8a5a2a" stroke-width="0.9" opacity="0.7"/>`
  const wedel = (ang: number, len: number, f: string) =>
    `<path d="M0 0 q${len * 0.5} ${-len * 0.34} ${len} ${len * 0.18} q${-len * 0.5} ${-len * 0.08} ${-len} ${-len * 0.18} z" fill="${f}" stroke="#1f6a2a" stroke-width="0.8" stroke-linejoin="round" transform="translate(${r1(x + 6)} ${r1(y - 56)}) rotate(${ang})"/>`
  for (const [a, l, f] of [[-160, 30, '#2f9a3a'], [-20, 30, '#2f9a3a'], [-130, 28, '#46b84a'], [-50, 28, '#46b84a'], [-95, 24, '#5cc450'], [-185, 22, '#46b84a'], [5, 22, '#46b84a']] as const) s += wedel(a, l, f)
  s += kreis(x + 5, y - 52, 3.4, '#8a5a2a', KONTUR, 0.6) + kreis(x + 9, y - 50, 3, '#8a5a2a', KONTUR, 0.6)
  return { svg: s, hoehe: 82 }
}

export function leuchtturm(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(20)
  s += box(0, 0, 0, 0.3, 0.3, 4, '#bdb5a5', '#d6cfbf')
  const streifen = [['#fbfbf7', 0], ['#e2543a', 14], ['#fbfbf7', 28], ['#e2543a', 42]] as const
  for (const [f, dz] of streifen) {
    const w0 = 13 - dz * 0.1
    const w1 = 13 - (dz + 14) * 0.1
    s += `<path d="M${r1(x - w0)} ${r1(y - 4 - dz)} L${r1(x + w0)} ${r1(y - 4 - dz)} L${r1(x + w1)} ${r1(y - 18 - dz)} L${r1(x - w1)} ${r1(y - 18 - dz)} Z" fill="${f}" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`
  }
  s += `<rect x="${r1(x - 10)}" y="${r1(y - 64)}" width="20" height="4" rx="1" fill="#4b5563"/>`
  s += `<rect x="${r1(x - 7)}" y="${r1(y - 74)}" width="14" height="10" rx="1.5" fill="#fff2b0" stroke="${KONTUR}" stroke-width="0.8"/>`
  s += `<path d="M${r1(x - 9)} ${r1(y - 74)} L${r1(x)} ${r1(y - 83)} L${r1(x + 9)} ${r1(y - 74)} Z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 69)}" rx="22" ry="10" fill="#fff2b0" opacity="0.22"/>`
  return { svg: s, hoehe: 90 }
}

export function flughafenTower(): Teil {
  const s: string[] = [oval(22)]
  s.push(box(0, 0, 0, 0.3, 0.3, 6, '#bdb5a5', '#d6cfbf'))
  s.push(box(0, 0, 6, 0.16, 0.16, 46, '#f1ede2', '#ffffff'))
  s.push(box(0, 0, 52, 0.4, 0.4, 14, '#7ec6e6', '#aee0f4'))
  s.push(box(0, 0, 66, 0.46, 0.46, 3, '#4b5563', '#6b7280'))
  const [x, y] = iso(0, 0, 69)
  s.push(`<rect x="${r1(x - 0.9)}" y="${r1(y - 18)}" width="1.8" height="18" fill="#8a919c"/>${kreis(x, y - 19, 2, '#e2543a', KONTUR, 0.5)}`)
  s.push(`<polygon points="${pu(0.2, -0.18, 54)} ${pu(0.2, 0.18, 54)} ${pu(0.2, 0.18, 64)} ${pu(0.2, -0.18, 64)}" fill="#bfeaf9" stroke="#fff" stroke-width="0.8"/>`)
  for (const z of [16, 28, 40]) s.push(`<polyline points="${pu(0.08, -0.08, z)} ${pu(0.08, 0.08, z)}" stroke="#e2543a" stroke-width="2"/>`)
  return { svg: s.join(''), hoehe: 96 }
}

export function sonnenschirm(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(22)
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 1)}" rx="20" ry="8" fill="#f0d89a" opacity="0.9"/>`
  s += `<rect x="${r1(x - 1.2)}" y="${r1(y - 46)}" width="2.4" height="46" fill="#e8e2d4" stroke="${KONTUR}" stroke-width="0.6"/>`
  const n = 8
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (Math.PI * i) / n
    const a1 = Math.PI + (Math.PI * (i + 1)) / n
    const rx = 28
    const p = (a: number, ry = 0) => `${r1(x + Math.cos(a) * rx)},${r1(y - 38 + Math.sin(a) * 0.6 * rx + ry)}`
    s += `<polygon points="${r1(x)},${r1(y - 56)} ${p(a0)} ${p(a1)}" fill="${i % 2 ? '#fff6e0' : '#ff6f61'}" stroke="#7d2a1a" stroke-width="0.6" stroke-linejoin="round"/>`
  }
  s += `<path d="M${r1(x - 28)} ${r1(y - 38)} Q${r1(x)} ${r1(y - 28)} ${r1(x + 28)} ${r1(y - 38)}" fill="none" stroke="#7d2a1a" stroke-width="0.9"/>`
  s += kreis(x, y - 57, 2, '#ffd23f', KONTUR, 0.5)
  return { svg: s, hoehe: 66 }
}

export function berghuette(): Teil {
  const s: string[] = [schatten(-0.38, -0.34, 0.42, 0.38, 0.28)]
  s.push(quader({ u0: -0.38, v0: -0.34, u1: 0.38, v1: 0.34, h: 3, farbe: '#b9b2a4' }))
  s.push(quader({ u0: -0.36, v0: -0.32, u1: 0.36, v1: 0.32, z: 3, h: 22, farbe: '#b87a3a' }))
  for (let i = 1; i < 5; i++) s.push(`<polyline points="${pu(0.36, -0.32, 3 + i * 4.4)} ${pu(0.36, 0.32, 3 + i * 4.4)}" stroke="#7a4a1c" stroke-width="0.9" opacity="0.6"/>`)
  s.push(`<polygon points="${pu(0.36, -0.1, 3)} ${pu(0.36, 0.1, 3)} ${pu(0.36, 0.1, 18)} ${pu(0.36, -0.1, 18)}" fill="#6b4220" stroke="#fff6e0" stroke-width="1"/>`)
  s.push(fensterLinks({ u0: -0.36, u1: 0.36, v: 0.32 }, 11, 8, 2, '#ffe9a8'))
  s.push(satteldach({ u0: -0.42, v0: -0.38, u1: 0.42, v1: 0.38, z: 25, hoehe: 17, farbe: '#5a3f33' }))
  const [x, y] = iso(-0.2, -0.1, 40)
  s.push(`<rect x="${r1(x - 3)}" y="${r1(y - 9)}" width="6" height="11" fill="#c98a6a" stroke="#8a4a2a" stroke-width="0.7"/>`)
  for (const [dx, r, d] of [[0, 3, 0], [1.1, 2.4, 1.2], [-0.9, 2.7, 2.4]] as const) s.push(`<circle class="bt-rauch" style="animation-delay:${d}s" cx="${r1(x + dx)}" cy="${r1(y - 11)}" r="${r}" fill="#f1f3f5"/>`)
  return { svg: s.join(''), hoehe: 66 }
}

export function zelt(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(26)
  s += `<polygon points="${r1(x - 30)},${r1(y + 2)} ${r1(x)},${r1(y - 44)} ${r1(x + 30)},${r1(y + 2)} ${r1(x)},${r1(y + 12)}" fill="#46b84a" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`
  s += `<polygon points="${r1(x)},${r1(y - 44)} ${r1(x + 30)},${r1(y + 2)} ${r1(x)},${r1(y + 12)}" fill="#2f9a3a" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`
  s += `<polygon points="${r1(x - 8)},${r1(y + 6)} ${r1(x)},${r1(y - 22)} ${r1(x + 8)},${r1(y + 8)} ${r1(x)},${r1(y + 11)}" fill="#1f5a2a" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`
  s += `<polygon points="${r1(x - 30)},${r1(y + 2)} ${r1(x - 24)},${r1(y - 10)} ${r1(x - 14)},${r1(y - 20)} ${r1(x - 7)},${r1(y - 2)}" fill="#ffd23f" opacity="0.9"/>`
  s += `<line x1="${r1(x)}" y1="${r1(y - 44)}" x2="${r1(x)}" y2="${r1(y - 52)}" stroke="#8a5a2a" stroke-width="1.4"/><path d="M${r1(x)} ${r1(y - 52)} l9 2.5 l-9 2.5 z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.6"/>`
  return { svg: s, hoehe: 62 }
}

// ── Natur & Deko (Reiseausstattung) ──────────────────────────────────────────

export function koffer(): Teil {
  const s: string[] = [oval(20)]
  s.push(box(0, 0, 3, 0.3, 0.14, 26, '#ff9a1c', '#ffb84d'))
  s.push(`<polyline points="${pu(0.15, -0.06, 3)} ${pu(0.15, -0.06, 29)}" stroke="#c97a10" stroke-width="1.6" opacity="0.8"/>`)
  s.push(`<polyline points="${pu(0.15, 0.06, 3)} ${pu(0.15, 0.06, 29)}" stroke="#c97a10" stroke-width="1.6" opacity="0.8"/>`)
  s.push(box(0.151, 0, 14, 0.001, 0.05, 4, '#ffd23f'))
  const [x, y] = iso(0, 0, 29)
  s.push(`<path d="M${r1(x - 6)} ${r1(y)} v-6 q0 -3 3 -3 h6 q3 0 3 3 v6" fill="none" stroke="#4b5563" stroke-width="2.4" stroke-linecap="round"/>`)
  for (const v of [-0.08, 0.08]) { const [wx, wy] = iso(-0.1, v, 1); s.push(kreis(wx, wy, 2.2, '#2b2f3a', '#14161c', 0.5)) }
  s.push(`<rect x="${r1(iso(0.15, 0.03, 20)[0] - 5)}" y="${r1(iso(0.15, 0.03, 20)[1] - 3)}" width="9" height="6" rx="1" fill="#2f8cf0" opacity="0.9"/>`)
  return { svg: s.join(''), hoehe: 42 }
}

export function globus(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(18)
  s += `<defs><radialGradient id="gl" cx="0.35" cy="0.3"><stop offset="0" stop-color="#8fe0ff"/><stop offset="1" stop-color="#2f8cf0"/></radialGradient></defs>`
  s += `<path d="M${r1(x - 12)} ${r1(y)} h24 l-4 -4 h-16 z" fill="#b87a3a" stroke="${KONTUR}" stroke-width="0.8"/>`
  s += `<rect x="${r1(x - 1.6)}" y="${r1(y - 18)}" width="3.2" height="15" fill="#c98a45" stroke="${KONTUR}" stroke-width="0.6"/>`
  s += `<path d="M${r1(x - 17)} ${r1(y - 36)} a17 17 0 0 1 3 -12 M${r1(x + 17)} ${r1(y - 36)} a17 17 0 0 0 -3 -12" fill="none" stroke="#c98a45" stroke-width="2.4" stroke-linecap="round"/>`
  s += kreis(x, y - 36, 16, 'url(#gl)', '#12427c', 1)
  s += `<path d="M${r1(x - 11)} ${r1(y - 42)} q4 -6 9 -2 q-1 6 -6 8 q-5 0 -3 -6 z" fill="#46b84a"/><path d="M${r1(x + 2)} ${r1(y - 34)} q7 -2 9 4 q-2 8 -8 8 q-3 -6 -1 -12 z" fill="#46b84a"/><path d="M${r1(x - 8)} ${r1(y - 26)} q5 -2 8 2 q-3 4 -8 2 z" fill="#46b84a"/>`
  s += `<path d="M${r1(x - 10)} ${r1(y - 44)} q-2 6 0 12" fill="none" stroke="#e8f8ff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`
  return { svg: s, hoehe: 62 }
}

export function reisefuehrer(): Teil {
  const s: string[] = [oval(20)]
  s.push(box(0, 0, 0, 0.3, 0.1, 30, '#2f8cf0', '#5aa8f8'))
  s.push(box(0.01, 0.002, 1.5, 0.28, 0.095, 27, '#fff6e0'))
  s.push(box(0, 0, 0, 0.3, 0.1, 30, '#2f8cf0', '#5aa8f8'))
  const [x, y] = iso(0.15, 0, 17)
  s.push(kreis(x, y, 6.2, '#fff6e0', '#12427c', 0.9) + `<path d="M${r1(x - 6)} ${r1(y)} h12 M${r1(x)} ${r1(y - 6)} v12 M${r1(x - 4)} ${r1(y - 4)} q4 4 8 0 M${r1(x - 4)} ${r1(y + 4)} q4 -4 8 0" stroke="#2f8cf0" stroke-width="0.8" fill="none"/>`)
  s.push(`<rect x="${r1(x - 7)}" y="${r1(y + 8)}" width="14" height="2.2" rx="1" fill="#fff6e0"/>`)
  return { svg: s.join(''), hoehe: 38 }
}

export function rucksack(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(18)
  s += `<path d="M${r1(x - 14)} ${r1(y - 4)} v-24 q0 -12 14 -12 q14 0 14 12 v24 q-14 5 -28 0 z" fill="#46b84a" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`
  s += `<path d="M${r1(x - 9)} ${r1(y - 34)} q9 -5 18 0" fill="none" stroke="#2f7a2a" stroke-width="2.4" stroke-linecap="round"/>`
  s += `<rect x="${r1(x - 10)}" y="${r1(y - 18)}" width="20" height="11" rx="3" fill="#2f9a3a" stroke="${KONTUR}" stroke-width="0.8"/>`
  s += `<rect x="${r1(x - 3)}" y="${r1(y - 16)}" width="6" height="3" rx="1" fill="#ffd23f"/>`
  s += `<path d="M${r1(x - 13)} ${r1(y - 26)} q-4 9 0 18 M${r1(x + 13)} ${r1(y - 26)} q4 9 0 18" fill="none" stroke="#2f7a2a" stroke-width="3" stroke-linecap="round"/>`
  s += `<path d="M${r1(x - 9)} ${r1(y - 30)} q-1 7 2 12" fill="none" stroke="#a6e66c" stroke-width="2" stroke-linecap="round" opacity="0.85"/>`
  return { svg: s, hoehe: 46 }
}

export function kompass(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(20)
  s += SOCKEL()
  const [px, py] = iso(0, 0, 13)
  s += kreis(px, py - 14, 17, '#c98a45', KONTUR, 1) + kreis(px, py - 14, 13.5, '#fff6e0', '#8a5a2a', 0.8)
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12
    s += `<line x1="${r1(px + Math.cos(a) * 11.5)}" y1="${r1(py - 14 + Math.sin(a) * 11.5)}" x2="${r1(px + Math.cos(a) * 13)}" y2="${r1(py - 14 + Math.sin(a) * 13)}" stroke="#5a3a24" stroke-width="0.8"/>`
  }
  s += `<polygon points="${r1(px)},${r1(py - 26)} ${r1(px + 3.4)},${r1(py - 14)} ${r1(px - 3.4)},${r1(py - 14)}" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.6"/>`
  s += `<polygon points="${r1(px)},${r1(py - 2)} ${r1(px + 3.4)},${r1(py - 14)} ${r1(px - 3.4)},${r1(py - 14)}" fill="#fbfbf7" stroke="${KONTUR}" stroke-width="0.6"/>`
  s += kreis(px, py - 14, 1.6, '#ffd23f', KONTUR, 0.5)
  void x
  void y
  return { svg: s, hoehe: 50 }
}

export function bordkarte(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(18)
  s += `<rect x="${r1(x - 1.6)}" y="${r1(y - 26)}" width="3.2" height="26" fill="#8a7a6a" stroke="${KONTUR}" stroke-width="0.6"/>`
  s += `<rect x="${r1(x - 24)}" y="${r1(y - 60)}" width="48" height="34" rx="3" fill="#fbfbf7" stroke="${KONTUR}" stroke-width="1"/>`
  s += `<rect x="${r1(x - 24)}" y="${r1(y - 60)}" width="48" height="9" rx="3" fill="#2f8cf0"/>`
  s += `<text x="${r1(x - 20)}" y="${r1(y - 53)}" font-family="sans-serif" font-size="6" font-weight="700" fill="#fff">BORDKARTE</text>`
  s += `<rect x="${r1(x - 20)}" y="${r1(y - 46)}" width="22" height="3" rx="1" fill="#3d424d"/><rect x="${r1(x - 20)}" y="${r1(y - 41)}" width="15" height="2.4" rx="1" fill="#9aa0aa"/>`
  s += `<path d="M${r1(x + 8)} ${r1(y - 38)} l3 -2 l-1 5 z" fill="#2f8cf0"/>`
  for (let i = 0; i < 10; i++) s += `<rect x="${r1(x - 20 + i * 2.6)}" y="${r1(y - 34)}" width="${i % 3 === 0 ? 1.8 : 1}" height="6" fill="#2b2f3a"/>`
  s += `<line x1="${r1(x + 11)}" y1="${r1(y - 51)}" x2="${r1(x + 11)}" y2="${r1(y - 28)}" stroke="#9aa0aa" stroke-width="0.8" stroke-dasharray="2 2"/>`
  return { svg: s, hoehe: 70 }
}

export function fotokamera(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(20)
  s += `<path d="M${r1(x)} ${r1(y - 22)} L${r1(x - 14)} ${r1(y)} M${r1(x)} ${r1(y - 22)} L${r1(x + 14)} ${r1(y)} M${r1(x)} ${r1(y - 22)} L${r1(x + 1)} ${r1(y + 2)}" stroke="#4b5563" stroke-width="2.2" stroke-linecap="round" fill="none"/>`
  s += `<rect x="${r1(x - 16)}" y="${r1(y - 42)}" width="32" height="20" rx="4" fill="#3d424d" stroke="#14161c" stroke-width="0.9"/>`
  s += `<rect x="${r1(x - 16)}" y="${r1(y - 42)}" width="32" height="7" rx="3.5" fill="#6b7280"/>`
  s += `<rect x="${r1(x - 10)}" y="${r1(y - 46)}" width="9" height="5" rx="1.5" fill="#4b5563" stroke="#14161c" stroke-width="0.7"/>`
  s += kreis(x, y - 31, 8.4, '#1f2430', '#0b0d12', 0.9) + kreis(x, y - 31, 5.6, '#2f8cf0', '#12427c', 0.7) + kreis(x - 1.8, y - 33, 1.8, '#bfe0ff', '#bfe0ff', 0)
  s += kreis(x + 11, y - 38, 1.5, '#ff5a4a', '#8a1c14', 0.4)
  return { svg: s, hoehe: 58 }
}

export function sonnenbrille(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(20)
  s += SOCKEL()
  const [px, py] = iso(0, 0, 13)
  s += `<ellipse cx="${r1(px - 10)}" cy="${r1(py - 10)}" rx="9.5" ry="7.5" fill="#1f2430" stroke="#0b0d12" stroke-width="1"/><ellipse cx="${r1(px + 10)}" cy="${r1(py - 10)}" rx="9.5" ry="7.5" fill="#1f2430" stroke="#0b0d12" stroke-width="1"/>`
  s += `<path d="M${r1(px - 1)} ${r1(py - 12)} q1 -3 2 0" fill="none" stroke="#0b0d12" stroke-width="2"/>`
  s += `<path d="M${r1(px - 16)} ${r1(py - 14)} q2 -4 6 -3 M${r1(px + 4)} ${r1(py - 14)} q2 -4 6 -3" fill="none" stroke="#6ab4ff" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>`
  s += `<path d="M${r1(px - 19.5)} ${r1(py - 12)} l-4 4 M${r1(px + 19.5)} ${r1(py - 12)} l4 4" stroke="#0b0d12" stroke-width="2" stroke-linecap="round"/>`
  void x
  void y
  return { svg: s, hoehe: 44 }
}

// ── Abzeichen & Trophäen (Reise) ─────────────────────────────────────────────

const SILBER = `<defs><linearGradient id="sv" x1="0" x2="1"><stop offset="0" stop-color="#f4f6fa"/><stop offset="0.5" stop-color="#c3c9d4"/><stop offset="1" stop-color="#8a919c"/></linearGradient></defs>`

export function weltreisePokal(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += `<path d="M${r1(x - 12)} ${r1(y - 24)} q-10 1 -9 10 q1 8 11 9" fill="none" stroke="url(#g)" stroke-width="3.2" stroke-linecap="round"/>`
  s += `<path d="M${r1(x + 12)} ${r1(y - 24)} q10 1 9 10 q-1 8 -11 9" fill="none" stroke="url(#g)" stroke-width="3.2" stroke-linecap="round"/>`
  s += `<rect x="${r1(x - 7)}" y="${r1(y - 2)}" width="14" height="4" rx="2" fill="url(#g)"/><rect x="${r1(x - 2.4)}" y="${r1(y - 11)}" width="4.8" height="10" fill="url(#g)"/>`
  s += `<path d="M${r1(x - 13)} ${r1(y - 28)} h26 q0 18 -13 20 q-13 -2 -13 -20 z" fill="url(#g)" stroke="${GOLDK}" stroke-width="0.8" stroke-linejoin="round"/>`
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 28)}" rx="13" ry="3.4" fill="#ffe99a" stroke="${GOLDK}" stroke-width="0.7"/>`
  s += kreis(x, y - 18, 6.4, '#58b8f0', '#12427c', 0.8) + `<path d="M${r1(x - 4)} ${r1(y - 21)} q3 -2 5 0 q0 3 -3 4 q-3 -1 -2 -4 z" fill="#46b84a"/>`
  return { svg: s, hoehe: 52 }
}

function medailleFarbe(grad: 'g' | 'sv', kontur: string, band1: string, band2: string): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD + SILBER
  s += `<polygon points="${r1(x - 9)},${r1(y - 40)} ${r1(x - 2)},${r1(y - 40)} ${r1(x + 2)},${r1(y - 22)} ${r1(x - 5)},${r1(y - 22)}" fill="${band1}" stroke="${KONTUR}" stroke-width="0.7"/>`
  s += `<polygon points="${r1(x + 9)},${r1(y - 40)} ${r1(x + 2)},${r1(y - 40)} ${r1(x - 2)},${r1(y - 22)} ${r1(x + 5)},${r1(y - 22)}" fill="${band2}" stroke="${KONTUR}" stroke-width="0.7"/>`
  s += kreis(x, y - 14, 12.5, `url(#${grad})`, kontur, 0.9) + kreis(x, y - 14, 8.6, grad === 'g' ? '#e0a010' : '#aab0ba', kontur, 0.6) + stern(x, y - 14, 6, grad === 'g' ? '#fff3b8' : '#ffffff', kontur)
  return { svg: s, hoehe: 56 }
}
export const goldMedaille = (): Teil => medailleFarbe('g', GOLDK, '#e2543a', '#2f8cf0')
export const silberMedaille = (): Teil => medailleFarbe('sv', '#5a6270', '#2f8cf0', '#fbfbf7')

export function reisepass(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += `<rect x="${r1(x - 15)}" y="${r1(y - 42)}" width="30" height="40" rx="3" fill="#1f5fc0" stroke="#0e2f66" stroke-width="1"/>`
  s += `<rect x="${r1(x - 15)}" y="${r1(y - 42)}" width="5" height="40" rx="2" fill="#17489a"/>`
  s += kreis(x + 2, y - 26, 8.4, 'none', GOLDK, 1.4) + `<circle cx="${r1(x + 2)}" cy="${r1(y - 26)}" r="8.4" fill="none" stroke="url(#g)" stroke-width="1.4"/>`
  s += `<path d="M${r1(x - 6)} ${r1(y - 26)} h16 M${r1(x + 2)} ${r1(y - 34)} v16 M${r1(x - 3)} ${r1(y - 31)} q5 5 10 0 M${r1(x - 3)} ${r1(y - 21)} q5 -5 10 0" stroke="#ffd23f" stroke-width="0.9" fill="none"/>`
  s += `<rect x="${r1(x - 6)}" y="${r1(y - 12)}" width="16" height="2.6" rx="1" fill="#ffd23f"/><rect x="${r1(x - 3)}" y="${r1(y - 7)}" width="10" height="2" rx="1" fill="#ffd23f" opacity="0.8"/>`
  return { svg: s, hoehe: 56 }
}

export function globetrotterStern(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += kreis(x, y - 22, 19, '#17a5c0', '#0c5a6a', 1) + kreis(x, y - 22, 15.5, '#58d0e8', '#0c5a6a', 0.6)
  s += stern(x, y - 22, 14, 'url(#g)', GOLDK)
  s += `<ellipse cx="${r1(x - 3)}" cy="${r1(y - 27)}" rx="3" ry="1.6" fill="#fffbe0" opacity="0.8"/>`
  return { svg: s, hoehe: 56 }
}

export function wimpel(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += `<rect x="${r1(x - 1.4)}" y="${r1(y - 52)}" width="2.8" height="50" rx="1.2" fill="#e8e2d4" stroke="${KONTUR}" stroke-width="0.7"/>`
  s += kreis(x, y - 53, 2.6, 'url(#g)', GOLDK, 0.6)
  const ox = r1(x + 1.4)
  const oy = r1(y - 49)
  s += `<path class="bt-fahne" style="transform-origin:${ox}px ${oy}px" d="M ${ox} ${oy} L ${r1(x + 30)} ${r1(y - 40)} L ${ox} ${r1(y - 30)} Z" fill="#46b84a" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`
  s += `<path class="bt-fahne" style="transform-origin:${ox}px ${oy}px" d="M ${r1(x + 6)} ${r1(y - 45)} L ${r1(x + 18)} ${r1(y - 40)} L ${r1(x + 6)} ${r1(y - 35)} Z" fill="#fff6e0" opacity="0.95"/>`
  return { svg: s, hoehe: 62 }
}

export function ehrenschleife(): Teil {
  const [x, y] = iso(0, 0, 13)
  let s = oval(22) + SOCKEL() + GOLD
  s += `<polygon points="${r1(x - 9)},${r1(y - 22)} ${r1(x - 16)},${r1(y - 2)} ${r1(x - 8)},${r1(y - 7)} ${r1(x - 3)},${r1(y - 1)} ${r1(x)},${r1(y - 20)}" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`
  s += `<polygon points="${r1(x + 9)},${r1(y - 22)} ${r1(x + 16)},${r1(y - 2)} ${r1(x + 8)},${r1(y - 7)} ${r1(x + 3)},${r1(y - 1)} ${r1(x)},${r1(y - 20)}" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 * i) / 14
    s += kreis(x + Math.cos(a) * 15, y - 30 + Math.sin(a) * 15, 4.2, i % 2 ? '#ffd23f' : '#ff9a1c', GOLDK, 0.6)
  }
  s += kreis(x, y - 30, 11, 'url(#g)', GOLDK, 0.9) + stern(x, y - 30, 7.5, '#fff3b8', GOLDK)
  return { svg: s, hoehe: 62 }
}

// ── Neue Resort-Bauten ───────────────────────────────────────────────────────

export function pool(): Teil {
  const s: string[] = [oval(36)]
  s.push(quader({ u0: -0.46, v0: -0.4, u1: 0.46, v1: 0.4, h: 4, farbe: '#fbfbf7', dachFarbe: '#f0ece0' }))
  s.push(wasser(-0.36, -0.3, 0.36, 0.3, 4.2))
  for (const v of [-0.12, 0.12]) s.push(`<polyline points="${pu(0.31, v, 5)} ${pu(0.31, v, 13)} ${pu(0.2, v, 13)}" stroke="#c9d6e4" stroke-width="1.6" fill="none" stroke-linecap="round"/>`)
  const [x, y] = iso(-0.08, 0.05, 5)
  s.push(`<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="8" ry="3.6" fill="#ff6f61" stroke="${KONTUR}" stroke-width="0.8"/><ellipse cx="${r1(x)}" cy="${r1(y)}" rx="4" ry="1.7" fill="${WASSER}"/>`)
  return { svg: s.join(''), hoehe: 24 }
}

export function spielplatz(): Teil {
  const s: string[] = [oval(32)]
  s.push(quader({ u0: -0.46, v0: -0.4, u1: 0.46, v1: 0.4, h: 2, farbe: '#f0d89a', dachFarbe: '#f5e3b0' }))
  for (const v of [-0.22, 0.04]) { s.push(box(-0.3, v, 2, 0.04, 0.04, 28, '#c98a45')); s.push(box(-0.06, v, 2, 0.04, 0.04, 28, '#c98a45')) }
  s.push(box(-0.18, -0.09, 28, 0.3, 0.3, 2.4, '#e2543a', '#f27a5c'))
  s.push(`<polygon points="${pu(-0.04, -0.2, 28)} ${pu(-0.04, 0.02, 28)} ${pu(0.4, 0.02, 3)} ${pu(0.4, -0.2, 3)}" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`)
  s.push(`<polyline points="${pu(-0.04, -0.2, 28)} ${pu(0.4, -0.2, 3)}" stroke="#c9980a" stroke-width="2"/>`)
  s.push(satteldach({ u0: -0.34, v0: -0.26, u1: 0.0, v1: 0.08, z: 31, hoehe: 10, farbe: '#2f8cf0' }))
  s.push(box(0.2, 0.3, 2, 0.34, 0.26, 4, '#c98a45', '#e0aa6a'))
  s.push(box(0.2, 0.3, 4.4, 0.28, 0.2, 0.6, '#f0d89a'))
  return { svg: s.join(''), hoehe: 46 }
}

export function restaurant(): Teil {
  const s: string[] = [schatten(-0.44, -0.4, 0.5, 0.46, 0.3)]
  s.push(quader({ u0: -0.44, v0: -0.4, u1: 0.1, v1: 0.4, h: 3, farbe: '#d6cfbf' }))
  s.push(quader({ u0: -0.42, v0: -0.38, u1: 0.08, v1: 0.38, z: 3, h: 26, farbe: '#ffd9a0' }))
  s.push(fensterLinks({ u0: -0.42, u1: 0.08, v: 0.38 }, 13, 9, 3, '#fff6e0'))
  s.push(`<polygon points="${pu(0.08, -0.14, 3)} ${pu(0.08, 0.14, 3)} ${pu(0.08, 0.14, 21)} ${pu(0.08, -0.14, 21)}" fill="#7a4a2a" stroke="#fff6e0" stroke-width="1"/>`)
  s.push(satteldach({ u0: -0.46, v0: -0.43, u1: 0.12, v1: 0.43, z: 29, hoehe: 12, farbe: '#d9553b' }))
  s.push(quader({ u0: 0.1, v0: -0.4, u1: 0.5, v1: 0.4, h: 2, farbe: '#e8dcc0', dachFarbe: '#f3ead2' }))
  for (const v of [-0.2, 0.2]) {
    s.push(box(0.3, v, 2, 0.04, 0.04, 14, '#8a5a2a'))
    s.push(box(0.3, v, 15, 0.16, 0.16, 1.6, '#fbfbf7', '#ffffff'))
    s.push(box(0.3, v - 0.1, 2, 0.05, 0.05, 6, '#c98a45'), box(0.3, v + 0.1, 2, 0.05, 0.05, 6, '#c98a45'))
  }
  const [x, y] = iso(0.18, 0, 36)
  s.push(`<rect x="${r1(x - 15)}" y="${r1(y - 7)}" width="30" height="9" rx="2" fill="#fff6e0" stroke="${KONTUR}" stroke-width="0.8"/><text x="${r1(x)}" y="${r1(y)}" font-family="sans-serif" font-size="7" font-weight="700" text-anchor="middle" fill="#d9402c">CAFÉ</text>`)
  return { svg: s.join(''), hoehe: 54 }
}

export function strandbar(): Teil {
  const s: string[] = [oval(30)]
  s.push(quader({ u0: -0.38, v0: -0.34, u1: 0.38, v1: 0.34, h: 2.5, farbe: '#f0d89a', dachFarbe: '#f5e3b0' }))
  for (const [u, v] of [[-0.3, -0.26], [0.3, -0.26], [-0.3, 0.26], [0.3, 0.26]] as const) s.push(box(u, v, 2.5, 0.05, 0.05, 30, '#b87a3a'))
  s.push(box(0.18, 0, 2.5, 0.12, 0.5, 13, '#ff8a5c', '#ffa88a'))
  s.push(box(0.18, 0, 15.5, 0.16, 0.54, 2, '#c98a45'))
  for (const v of [-0.16, 0, 0.16]) { s.push(box(0.34, v, 2.5, 0.06, 0.06, 8, '#8a5a2a')); s.push(box(0.34, v, 10.5, 0.12, 0.12, 2, '#e2543a')) }
  const [x, y] = iso(0, 0, 32)
  s.push(`<polygon points="${r1(x - 36)},${r1(y + 2)} ${r1(x)},${r1(y - 22)} ${r1(x + 36)},${r1(y + 2)} ${r1(x)},${r1(y + 18)}" fill="#e8c860" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`)
  s.push(`<polygon points="${r1(x)},${r1(y - 22)} ${r1(x + 36)},${r1(y + 2)} ${r1(x)},${r1(y + 18)}" fill="#cfa83c" stroke="${KONTUR}" stroke-width="0.9" stroke-linejoin="round"/>`)
  for (let i = -3; i <= 3; i++) s.push(`<line x1="${r1(x + i * 9)}" y1="${r1(y + 3)}" x2="${r1(x + i * 9 + 2)}" y2="${r1(y + 14 - Math.abs(i) * 2.4)}" stroke="#9a7a1c" stroke-width="0.8"/>`)
  s.push(kreis(x, y - 25, 2.4, '#e2543a', KONTUR, 0.6))
  return { svg: s.join(''), hoehe: 64 }
}

export function minigolf(): Teil {
  const s: string[] = [oval(32)]
  s.push(quader({ u0: -0.46, v0: -0.28, u1: 0.46, v1: 0.28, h: 4, farbe: '#b87a3a', dachFarbe: '#46c04a' }))
  s.push(`<polyline points="${pu(-0.4, 0.2, 4.4)} ${pu(0.3, 0.2, 4.4)} ${pu(0.3, -0.2, 4.4)} ${pu(0.4, -0.2, 4.4)}" stroke="#2f9a3a" stroke-width="1.2" fill="none" opacity="0.6"/>`)
  const [hx, hy] = iso(0.34, -0.16, 4.4)
  s.push(`<ellipse cx="${r1(hx)}" cy="${r1(hy)}" rx="3.4" ry="1.6" fill="#1f2430"/>`)
  s.push(`<rect x="${r1(hx - 0.7)}" y="${r1(hy - 24)}" width="1.4" height="24" fill="#e8e2d4"/><path d="M${r1(hx + 0.7)} ${r1(hy - 24)} l9 3 l-9 3 z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.5"/>`)
  s.push(box(-0.04, 0, 4.4, 0.16, 0.14, 12, '#fbfbf7', '#ffffff'))
  const [mx, my] = iso(-0.04, 0, 16.4)
  s.push(`<path d="M${r1(mx - 10)} ${r1(my + 8)} L${r1(mx)} ${r1(my - 6)} L${r1(mx + 10)} ${r1(my + 8)} Z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.7"/>`)
  s.push(`<g class="bt-fahne" style="transform-origin:${r1(mx)}px ${r1(my + 1)}px"><path d="M${r1(mx)} ${r1(my + 1)} L${r1(mx - 11)} ${r1(my - 9)} L${r1(mx - 7)} ${r1(my - 11)} Z M${r1(mx)} ${r1(my + 1)} L${r1(mx + 11)} ${r1(my + 11)} L${r1(mx + 7)} ${r1(my + 13)} Z" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.6"/></g>`)
  s.push(kreis(-0, 0, 0, 'none', 'none', 0))
  return { svg: s.join(''), hoehe: 38 }
}

export function sonnenliegen(): Teil {
  const s: string[] = [oval(28)]
  const liege = (v: number, farbe: string): string[] => [
    box(-0.04, v, 4, 0.5, 0.18, 3, '#fbfbf7', '#ffffff'),
    `<polygon points="${pu(-0.29, v - 0.09, 7)} ${pu(-0.29, v + 0.09, 7)} ${pu(-0.37, v + 0.09, 18)} ${pu(-0.37, v - 0.09, 18)}" fill="#fbfbf7" stroke="${KONTUR}" stroke-width="0.8" stroke-linejoin="round"/>`,
    box(-0.04, v, 7.4, 0.5, 0.17, 0.8, farbe),
    box(0.16, v, 7.4, 0.14, 0.17, 0.9, '#fff6e0'),
    box(0.17, v - 0.06, 0, 0.03, 0.03, 4, '#9aa0aa'), box(0.17, v + 0.06, 0, 0.03, 0.03, 4, '#9aa0aa'),
    box(-0.25, v - 0.06, 0, 0.03, 0.03, 4, '#9aa0aa'), box(-0.25, v + 0.06, 0, 0.03, 0.03, 4, '#9aa0aa'),
  ]
  s.push(...liege(-0.2, '#2f8cf0'), ...liege(0.2, '#ff6f61'))
  s.push(box(0, 0, 0, 0.1, 0.1, 9, '#c98a45', '#e0aa6a'))
  const [x, y] = iso(0, 0, 10)
  s.push(`<path d="M${r1(x - 4)} ${r1(y)} h8 l-1 6 h-6 z" fill="#ffd23f" opacity="0.9"/><rect x="${r1(x - 0.5)}" y="${r1(y - 8)}" width="1" height="8" fill="#e2543a"/>`)
  return { svg: s.join(''), hoehe: 30 }
}

export function brunnen(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = oval(28)
  s += `<defs><linearGradient id="br" x1="0" x2="1"><stop offset="0" stop-color="#f4f0e4"/><stop offset="1" stop-color="#bdb5a5"/></linearGradient></defs>`
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 4)}" rx="30" ry="12.5" fill="url(#br)" stroke="${KONTUR}" stroke-width="0.9"/>`
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 7)}" rx="26" ry="10.5" fill="${WASSER}" stroke="#1f8fb8" stroke-width="0.8"/><ellipse cx="${r1(x - 6)}" cy="${r1(y - 8)}" rx="9" ry="3" fill="${WASSER_HELL}" opacity="0.7"/>`
  s += `<rect x="${r1(x - 4)}" y="${r1(y - 32)}" width="8" height="26" fill="url(#br)" stroke="${KONTUR}" stroke-width="0.8"/>`
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 32)}" rx="13" ry="5" fill="#f4f0e4" stroke="${KONTUR}" stroke-width="0.8"/><ellipse cx="${r1(x)}" cy="${r1(y - 33)}" rx="10" ry="3.6" fill="${WASSER}"/>`
  s += `<path d="M${r1(x)} ${r1(y - 34)} q-8 -14 -15 -4 M${r1(x)} ${r1(y - 34)} q8 -14 15 -4 M${r1(x)} ${r1(y - 34)} v-18" fill="none" stroke="${WASSER_HELL}" stroke-width="2.4" stroke-linecap="round"/>`
  s += `<path d="M${r1(x - 15)} ${r1(y - 38)} q1 4 -1 8 M${r1(x + 15)} ${r1(y - 38)} q-1 4 1 8" fill="none" stroke="${WASSER}" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>`
  return { svg: s, hoehe: 64 }
}

export function rezeption(): Teil {
  const s: string[] = [schatten(-0.34, -0.3, 0.38, 0.34, 0.26)]
  s.push(quader({ u0: -0.34, v0: -0.3, u1: 0.34, v1: 0.3, h: 2.5, farbe: '#d6cfbf' }))
  s.push(quader({ u0: -0.32, v0: -0.28, u1: 0.32, v1: 0.28, z: 2.5, h: 22, farbe: '#fff1d4' }))
  s.push(fensterLinks({ u0: -0.32, u1: 0.32, v: 0.28 }, 11, 8, 3, '#7ec6e6'))
  s.push(`<polygon points="${pu(0.32, -0.12, 2.5)} ${pu(0.32, 0.12, 2.5)} ${pu(0.32, 0.12, 17)} ${pu(0.32, -0.12, 17)}" fill="#7ec6e6" stroke="#fff6e0" stroke-width="1"/>`)
  s.push(quader({ u0: -0.36, v0: -0.32, u1: 0.4, v1: 0.32, z: 24.5, h: 3.5, farbe: '#17a5c0', dachFarbe: '#58d0e8' }))
  s.push(box(0.4, 0.2, 2.5, 0.18, 0.14, 8, '#c98a45', '#e0aa6a'))
  const [x, y] = iso(0.4, 0.2, 11)
  s.push(`<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="4" ry="2" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.6"/><rect x="${r1(x - 0.6)}" y="${r1(y - 4)}" width="1.2" height="3" fill="#8a5a2a"/>`)
  return { svg: s.join(''), hoehe: 40 }
}

export function shuttlebus(): Teil {
  const s: string[] = [oval(28)]
  s.push(box(-0.04, 0, 4, 0.56, 0.3, 21, '#fbfbf7', '#ffffff'))
  s.push(box(0.3, 0, 4, 0.2, 0.3, 11, '#fbfbf7', '#ffffff'))
  s.push(fensterLinks({ u0: -0.3, u1: 0.2, v: 0.15 }, 14, 8, 4, '#9bdcf5'))
  s.push(`<polygon points="${pu(0.402, -0.12, 11)} ${pu(0.402, 0.12, 11)} ${pu(0.402, 0.12, 15)} ${pu(0.402, -0.12, 15)}" fill="#9bdcf5" stroke="${KONTUR}" stroke-width="0.6"/>`)
  s.push(`<polygon points="${pu(-0.32, 0.152, 6)} ${pu(0.24, 0.152, 6)} ${pu(0.24, 0.152, 11)} ${pu(-0.32, 0.152, 11)}" fill="#17a5c0"/>`)
  const [x, y] = iso(-0.06, 0.153, 8.5)
  s.push(`<path d="M${r1(x - 3)} ${r1(y + 1)} q1 -5 3 -7 q-1 5 -3 7 z M${r1(x)} ${r1(y + 1)} q3 -5 6 -5 q-3 3 -6 5 z" fill="#fff6e0"/>`)
  s.push(rad(-0.22, 0.16, 5, 5), rad(0.28, 0.16, 5, 5))
  return { svg: s.join(''), hoehe: 30 }
}

/** Alle Sprites dieses Blocks nach Icon-Schlüssel (Tourismus). */
export const RESORT_TEIL_1: Record<string, () => Teil> = {
  flugzeug,
  reisebus,
  zug,
  kreuzfahrtschiff,
  mietwagen,
  heissluftballon,
  segelboot,
  seilbahn,
  hotel,
  reisebuero,
  palme,
  leuchtturm,
  'flughafen-tower': flughafenTower,
  sonnenschirm,
  berghuette,
  zelt,
  koffer,
  globus,
  reisefuehrer,
  rucksack,
  kompass,
  bordkarte,
  fotokamera,
  sonnenbrille,
  'weltreise-pokal': weltreisePokal,
  'gold-medaille': goldMedaille,
  reisepass,
  'globetrotter-stern': globetrotterStern,
  wimpel,
  urkunde: urkundeResort,
  'silber-medaille': silberMedaille,
  ehrenschleife,
}

/** Neue Resort-Bauten (Schlüssel, Beschriftung, Kategorie) – PROJ-35. */
export const RESORT_NEU: { key: string; label: string; category: 'fahrzeuge' | 'gebaeude_deko' | 'ladung_ausstattung' | 'abzeichen_trophaeen'; bild: () => Teil }[] = [
  { key: 'pool', label: 'Pool', category: 'gebaeude_deko', bild: pool },
  { key: 'spielplatz', label: 'Spielplatz', category: 'gebaeude_deko', bild: spielplatz },
  { key: 'restaurant', label: 'Restaurant', category: 'gebaeude_deko', bild: restaurant },
  { key: 'strandbar', label: 'Strandbar', category: 'gebaeude_deko', bild: strandbar },
  { key: 'minigolf', label: 'Minigolf', category: 'gebaeude_deko', bild: minigolf },
  { key: 'rezeption', label: 'Rezeption', category: 'gebaeude_deko', bild: rezeption },
  { key: 'sonnenliegen', label: 'Sonnenliegen', category: 'ladung_ausstattung', bild: sonnenliegen },
  { key: 'brunnen', label: 'Brunnen', category: 'ladung_ausstattung', bild: brunnen },
  { key: 'shuttlebus', label: 'Shuttlebus', category: 'fahrzeuge', bild: shuttlebus },
]

export { BLUR, GOLD, GOLDK, SOCKEL, ton, stern }
