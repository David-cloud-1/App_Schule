import { TILE_W, TILE_H, iso, ton, quader, satteldach, schatten, fensterLinks, fensterRechts, type Sprite } from './iso'
import type { Teil } from './bauteile'

/**
 * Natur und Landleben im weicheren Stil (PROJ-34, Stilprobe 5): nahtlose
 * Wiese, Erdweg, üppige Bäume, Scheune und weißer Lattenzaun. Verläufe,
 * weiche Schatten, dünne Konturen — näher an Hay Day als die Tycoon-Flächen.
 */

const r1 = (n: number) => Math.round(n * 10) / 10
const datenUri = (svg: string) =>
  `data:image/svg+xml,${encodeURIComponent(svg).replace(/[()']/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`

/** Pseudo-Zufall, deterministisch je Kachel-Variante. */
function zufall(seed: number): () => number {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const RAUTE = (grow = 0.7) =>
  `${TILE_W / 2},${-grow} ${TILE_W + grow},${TILE_H / 2} ${TILE_W / 2},${TILE_H + grow} ${-grow},${TILE_H / 2}`

function kachelSvg(inhalt: string, defs = ''): string {
  return datenUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H + 1}" viewBox="0 0 ${TILE_W} ${TILE_H + 1}">` +
      `<defs>${defs}<clipPath id="c"><polygon points="${RAUTE()}"/></clipPath></defs>` +
      `<g clip-path="url(#c)">${inhalt}</g></svg>`,
  )
}

/** Nahtlose Wiese: einheitliche Grundfarbe, Gräser und Blümchen variieren. */
export function wieseUrl(variante: number): string {
  const z = zufall(variante + 3)
  let s = `<rect width="${TILE_W}" height="${TILE_H + 1}" fill="#7fd24f"/>`
  for (let i = 0; i < 8; i++) {
    const x = 6 + z() * (TILE_W - 12)
    const y = 4 + z() * (TILE_H - 8)
    const h = 3 + z() * 3
    s += `<path d="M${r1(x)} ${r1(y)} q${r1(-0.8)} ${r1(-h * 0.6)} ${r1(0.4)} ${r1(-h)} M${r1(x + 1.4)} ${r1(y)} q${r1(0.9)} ${r1(-h * 0.5)} ${r1(0.2)} ${r1(-h * 0.9)}" fill="none" stroke="${z() > 0.5 ? '#a8ee6f' : '#62b83a'}" stroke-width="1" stroke-linecap="round"/>`
  }
  for (let i = 0; i < 2; i++) {
    const x = 10 + z() * (TILE_W - 20)
    const y = 8 + z() * (TILE_H - 16)
    const f = ['#ffffff', '#ffd23f', '#ff9ac0'][Math.floor(z() * 3)]!
    s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="1.5" fill="${f}"/><circle cx="${r1(x)}" cy="${r1(y)}" r="0.6" fill="#f2a31c"/>`
  }
  return kachelSvg(s)
}

/** Erdweg mit Kieseln. */
export function wegUrl(variante: number): string {
  const z = zufall(variante + 11)
  let s = `<rect width="${TILE_W}" height="${TILE_H + 1}" fill="#c98f58"/>`
  s += `<ellipse cx="${TILE_W / 2}" cy="${TILE_H / 2}" rx="${TILE_W * 0.36}" ry="${TILE_H * 0.36}" fill="#d9a46c" opacity="0.28"/>`
  for (let i = 0; i < 10; i++) {
    const x = 8 + z() * (TILE_W - 16)
    const y = 5 + z() * (TILE_H - 10)
    s += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(1.2 + z() * 1.6)}" ry="${r1(0.8 + z())}" fill="${z() > 0.5 ? '#e8c9a0' : '#a8723e'}" opacity="0.8"/>`
  }
  return kachelSvg(s)
}

const BLUR = '<filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>'

function weicherSchatten(cx: number, cy: number, rx: number): string {
  return `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${rx}" ry="${r1(rx * 0.42)}" fill="#1e4d12" opacity="0.32" filter="url(#b)"/>`
}

/** Üppiger Laubbaum aus vielen Kugeln mit Licht und Schatten. */
export function baumLusch(groesse = 1): Teil {
  const [x, y] = iso(0, 0, 0)
  const s = groesse
  const c = (dx: number, dy: number, r: number, f: string, o = 1) =>
    `<circle cx="${r1(x + dx * s)}" cy="${r1(y + dy * s)}" r="${r1(r * s)}" fill="${f}" opacity="${o}"/>`
  let svg = `<defs>${BLUR}<linearGradient id="st" x1="0" x2="1"><stop offset="0" stop-color="#9a6a3a"/><stop offset="1" stop-color="#6e4624"/></linearGradient></defs>`
  svg += weicherSchatten(x + 2, y + 1, 22 * s)
  svg += `<path d="M${r1(x - 4 * s)} ${r1(y)} q${r1(1 * s)} ${r1(-12 * s)} ${r1(-1.5 * s)} ${r1(-26 * s)} h${r1(7 * s)} q${r1(-2.5 * s)} ${r1(14 * s)} ${r1(1.5 * s)} ${r1(26 * s)} z" fill="url(#st)"/>`
  // dunkle Rückseite, dann mittlere und helle Büschel
  for (const [dx, dy, r] of [[-15, -30, 12], [15, -30, 12], [0, -26, 14], [-9, -42, 12], [9, -42, 12], [0, -50, 12]] as const) svg += c(dx, dy, r, '#2f9139')
  for (const [dx, dy, r] of [[-14, -33, 10], [13, -33, 10], [0, -31, 12], [-8, -45, 10], [9, -45, 10], [0, -54, 10]] as const) svg += c(dx, dy, r, '#45b24a')
  for (const [dx, dy, r] of [[-12, -37, 7], [-3, -50, 8], [-9, -48, 6], [6, -53, 6]] as const) svg += c(dx, dy, r, '#7fdc6a', 0.95)
  for (const [dx, dy, r] of [[-12, -39, 3], [-4, -53, 3.4], [-8, -50, 2.4]] as const) svg += c(dx, dy, r, '#b8f58f', 0.9)
  return { svg, hoehe: Math.round(70 * s) }
}

/** Rote Scheune mit dunklem Dach, weißen Zierleisten und X-Tor. */
export function scheune(): Teil {
  const teile: string[] = [schatten(-0.42, -0.4, 0.46, 0.44, 0.3)]
  const wand = '#d9402c'
  teile.push(quader({ u0: -0.44, v0: -0.38, u1: 0.44, v1: 0.38, h: 3, farbe: '#b9b2a4' }))
  teile.push(quader({ u0: -0.42, v0: -0.36, u1: 0.42, v1: 0.36, z: 3, h: 26, farbe: wand }))
  const p = (u: number, v: number, w: number) => iso(u, v, w).map(r1).join(',')
  // Bretter auf der Südost-Wand
  for (let i = 1; i < 14; i++) {
    const v = -0.36 + (0.72 * i) / 14
    teile.push(`<polyline points="${p(0.42, v, 3)} ${p(0.42, v, 29)}" stroke="#7d1d12" stroke-width="0.7" opacity="0.35" fill="none"/>`)
  }
  // Tor mit weißem Rahmen und X
  teile.push(`<polygon points="${p(0.42, -0.17, 3)} ${p(0.42, 0.17, 3)} ${p(0.42, 0.17, 22)} ${p(0.42, -0.17, 22)}" fill="#b8301f" stroke="#fff6e0" stroke-width="1.5" stroke-linejoin="round"/>`)
  teile.push(`<polyline points="${p(0.42, -0.17, 3)} ${p(0.42, 0.17, 22)}" stroke="#fff6e0" stroke-width="1.3" fill="none"/>`)
  teile.push(`<polyline points="${p(0.42, 0.17, 3)} ${p(0.42, -0.17, 22)}" stroke="#fff6e0" stroke-width="1.3" fill="none"/>`)
  // Heuboden-Luke
  teile.push(`<polygon points="${p(0.42, -0.07, 23.5)} ${p(0.42, 0.07, 23.5)} ${p(0.42, 0.07, 28)} ${p(0.42, -0.07, 28)}" fill="#7d1d12" stroke="#fff6e0" stroke-width="1.1"/>`)
  // Fenster auf der Südwest-Wand
  for (const u of [-0.25, 0.0, 0.25]) {
    teile.push(`<polygon points="${p(u - 0.06, 0.36, 12)} ${p(u + 0.06, 0.36, 12)} ${p(u + 0.06, 0.36, 21)} ${p(u - 0.06, 0.36, 21)}" fill="#8fd3f0" stroke="#fff6e0" stroke-width="1.2"/>`)
  }
  teile.push(satteldach({ u0: -0.47, v0: -0.42, u1: 0.47, v1: 0.42, z: 29, hoehe: 17, farbe: '#4a3f48' }))
  return { svg: teile.join(''), hoehe: 29 + 17 }
}

/** Weißer Lattenzaun entlang einer Kachelkante. */
export function zaunWeissUrl(seite: 'x' | 'y'): string {
  const UEBER = 14
  const H = TILE_H + UEBER
  const MX = TILE_W / 2
  const MY = TILE_H / 2
  const py = (u: number, v: number, w = 0) => `${r1(MX + (u - v) * MX)},${r1(UEBER + MY + (u + v) * MY - w)}`
  let s = ''
  const [a0, b0, a1, b1] = seite === 'y' ? [-0.5, -0.5, 0.5, -0.5] : [-0.5, -0.5, -0.5, 0.5]
  for (const w of [10.5, 5]) s += `<polyline points="${py(a0, b0, w)} ${py(a1, b1, w)}" stroke="#b9b2a4" stroke-width="3" fill="none" stroke-linecap="round"/><polyline points="${py(a0, b0, w)} ${py(a1, b1, w)}" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>`
  const n = 7
  for (let i = 0; i <= n; i++) {
    const t = -0.5 + i / n
    const [a, b] = seite === 'y' ? [t, -0.5] : [-0.5, t]
    s += `<polyline points="${py(a, b, 13)} ${py(a, b, 0)}" stroke="#b9b2a4" stroke-width="3.6" fill="none" stroke-linecap="round"/><polyline points="${py(a, b, 13)} ${py(a, b, 0.6)}" stroke="#ffffff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
  }
  return datenUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${H}" viewBox="0 0 ${TILE_W} ${H}">${s}</svg>`)
}

/** Weiche Blumeninsel (ohne dicke Kontur). */
export function blumenWiese(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = `<defs>${BLUR}</defs>` + weicherSchatten(x, y + 1, 20)
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 3)}" rx="20" ry="9" fill="#58c04a"/>`
  const z = zufall(5)
  for (let i = 0; i < 16; i++) {
    const dx = (z() - 0.5) * 34
    const dy = -3 + (z() - 0.5) * 12
    const f = ['#ffffff', '#ffd23f', '#ff7aa8', '#b07cf0'][i % 4]!
    s += `<line x1="${r1(x + dx)}" y1="${r1(y + dy)}" x2="${r1(x + dx)}" y2="${r1(y + dy + 4)}" stroke="#2f8f3a" stroke-width="1"/>`
    s += `<circle cx="${r1(x + dx)}" cy="${r1(y + dy)}" r="2.6" fill="${f}"/><circle cx="${r1(x + dx)}" cy="${r1(y + dy)}" r="0.9" fill="#f2a31c"/>`
  }
  return { svg: s, hoehe: 18 }
}

export type { Sprite }
export { ton }


// ── Spedition im weichen Stil (PROJ-34, Stilprobe 6) ───────────────────────

const pu = (u: number, v: number, w: number) => iso(u, v, w).map(r1).join(',')

/** Lagerhalle: cremefarbene Wände, rotes Satteldach, drei Rolltore mit Rampe. */
export function lagerhalleWeich(): Teil {
  const teile: string[] = [schatten(-0.46, -0.42, 0.5, 0.46, 0.3)]
  teile.push(quader({ u0: -0.46, v0: -0.4, u1: 0.46, v1: 0.4, h: 3, farbe: '#bdb5a5' }))
  teile.push(quader({ u0: -0.44, v0: -0.38, u1: 0.44, v1: 0.38, z: 3, h: 24, farbe: '#f6e3b4' }))
  // Wellblech-Rillen auf der Südost-Wand
  for (let i = 1; i < 22; i++) {
    const v = -0.38 + (0.76 * i) / 22
    teile.push(`<polyline points="${pu(0.44, v, 3)} ${pu(0.44, v, 27)}" stroke="#c9a45a" stroke-width="0.6" opacity="0.4" fill="none"/>`)
  }
  // Drei Rolltore mit Lamellen und weißem Rahmen
  for (const vm of [-0.25, 0, 0.25]) {
    const a = vm - 0.09
    const b = vm + 0.09
    teile.push(`<polygon points="${pu(0.44, a, 3)} ${pu(0.44, b, 3)} ${pu(0.44, b, 20)} ${pu(0.44, a, 20)}" fill="#f0a02a" stroke="#fff6e0" stroke-width="1.3" stroke-linejoin="round"/>`)
    for (let k = 1; k < 6; k++) {
      const w = 3 + (17 * k) / 6
      teile.push(`<polyline points="${pu(0.44, a, w)} ${pu(0.44, b, w)}" stroke="#c97a10" stroke-width="0.7" opacity="0.7" fill="none"/>`)
    }
  }
  // Rampe vor den Toren
  teile.push(quader({ u0: 0.44, v0: -0.36, u1: 0.55, v1: 0.36, h: 4, farbe: '#cfc7b6' }))
  // Fenster auf der Südwest-Wand
  teile.push(fensterLinks({ u0: -0.44, u1: 0.44, v: 0.38 }, 15, 8, 4, '#9bdcf5'))
  teile.push(satteldach({ u0: -0.48, v0: -0.42, u1: 0.48, v1: 0.42, z: 27, hoehe: 16, farbe: '#d9553b' }))
  return { svg: teile.join(''), hoehe: 27 + 16 }
}

/** Bürohaus: zwei Etagen, Satteldach, Schornstein mit Rauch, Tür mit Markise. */
export function buerohausWeich(): Teil {
  const teile: string[] = [schatten(-0.4, -0.4, 0.44, 0.44, 0.3)]
  teile.push(quader({ u0: -0.4, v0: -0.4, u1: 0.4, v1: 0.4, h: 3, farbe: '#bdb5a5' }))
  teile.push(quader({ u0: -0.38, v0: -0.38, u1: 0.38, v1: 0.38, z: 3, h: 40, farbe: '#fff1d4' }))
  for (const z of [10, 28]) {
    teile.push(fensterLinks({ u0: -0.38, u1: 0.38, v: 0.38 }, z, 9, 3, '#9bdcf5'))
    teile.push(fensterRechts({ v0: -0.38, v1: 0.38, u: 0.38 }, z + (z === 10 ? 0 : 0), 9, 3, '#7ec6e6'))
  }
  // Tür mit Markise (an der Südost-Wand, unter dem unteren Fensterband freigehalten)
  teile.push(`<polygon points="${pu(0.38, -0.09, 3)} ${pu(0.38, 0.09, 3)} ${pu(0.38, 0.09, 17)} ${pu(0.38, -0.09, 17)}" fill="#7a4a2a" stroke="#fff6e0" stroke-width="1.1"/>`)
  const m = 0.13
  for (let i = 0; i < 6; i++) {
    const a = -0.14 + (0.28 * i) / 6
    const b = -0.14 + (0.28 * (i + 1)) / 6
    teile.push(`<polygon points="${pu(0.38, a, 21)} ${pu(0.38, b, 21)} ${pu(0.38 + m, b, 16)} ${pu(0.38 + m, a, 16)}" fill="${i % 2 ? '#fff6e0' : '#e8503a'}" stroke="#7d2a1a" stroke-width="0.6" stroke-linejoin="round"/>`)
  }
  teile.push(satteldach({ u0: -0.43, v0: -0.43, u1: 0.43, v1: 0.43, z: 43, hoehe: 18, farbe: '#b9402b' }))
  // Schornstein mit Rauch
  const [x, y] = iso(-0.22, -0.12, 56)
  teile.push(`<rect x="${r1(x - 3)}" y="${r1(y - 10)}" width="6" height="12" fill="#d9a07a" stroke="#8a4a2a" stroke-width="0.7"/>`)
  for (const [dx, r, d] of [[0, 3, 0], [1.1, 2.4, 1.2], [-0.9, 2.7, 2.4]] as const) {
    teile.push(`<circle class="bt-rauch" style="animation-delay:${d}s" cx="${r1(x + dx)}" cy="${r1(y - 12)}" r="${r}" fill="#f1f3f5"/>`)
  }
  return { svg: teile.join(''), hoehe: 43 + 18 + 26 }
}

/** Gestapelte Container, Seitenrillen, dünne Konturen. */
export function containerWeich(): Teil {
  const box = (u: number, v: number, z: number, farbe: string): string => {
    let s = quader({ u0: u - 0.21, v0: v - 0.1, u1: u + 0.21, v1: v + 0.1, z, h: 12, farbe })
    for (let i = 1; i < 8; i++) {
      const uu = u - 0.21 + (0.42 * i) / 8
      s += `<polyline points="${pu(uu, v + 0.1, z + 1)} ${pu(uu, v + 0.1, z + 11)}" stroke="${ton(farbe, 0.7)}" stroke-width="0.8" opacity="0.7" fill="none"/>`
    }
    return s
  }
  return {
    svg: schatten(-0.34, -0.22, 0.34, 0.26, 0.28) + box(-0.1, -0.1, 0, '#ec4636') + box(0.12, 0.12, 0, '#2f8cf0') + box(-0.1, -0.1, 12, '#ffb21c'),
    hoehe: 26,
  }
}

/** Pokal mit Goldverlauf, Stern und Steinsockel. */
export function pokalWeich(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = `<defs>${BLUR}<linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ffe27a"/><stop offset="0.5" stop-color="#f6b81a"/><stop offset="1" stop-color="#c98a0a"/></linearGradient>` +
    `<linearGradient id="g2" x1="0" x2="1"><stop offset="0" stop-color="#ffd35a"/><stop offset="1" stop-color="#b87a08"/></linearGradient></defs>`
  s += weicherSchatten(x, y + 1, 22)
  s += quader({ u0: -0.27, v0: -0.27, u1: 0.27, v1: 0.27, h: 9, farbe: '#e8e0d0', dachFarbe: '#f5efe3' })
  s += quader({ u0: -0.17, v0: -0.17, u1: 0.17, v1: 0.17, z: 9, h: 4, farbe: '#b87a3a', dachFarbe: '#d99a54' })
  const cy = y - 12
  s += `<path d="M${r1(x - 12)} ${r1(cy - 24)} q-10 1 -9 10 q1 8 11 9" fill="none" stroke="url(#g2)" stroke-width="3.2" stroke-linecap="round"/>`
  s += `<path d="M${r1(x + 12)} ${r1(cy - 24)} q10 1 9 10 q-1 8 -11 9" fill="none" stroke="url(#g2)" stroke-width="3.2" stroke-linecap="round"/>`
  s += `<rect x="${r1(x - 7)}" y="${r1(cy - 2)}" width="14" height="4" rx="2" fill="url(#g2)"/>`
  s += `<rect x="${r1(x - 2.4)}" y="${r1(cy - 11)}" width="4.8" height="10" fill="url(#g)"/>`
  s += `<path d="M${r1(x - 13)} ${r1(cy - 28)} h26 q0 18 -13 20 q-13 -2 -13 -20 z" fill="url(#g)" stroke="#a8700a" stroke-width="0.8" stroke-linejoin="round"/>`
  s += `<ellipse cx="${r1(x)}" cy="${r1(cy - 28)}" rx="13" ry="3.4" fill="#ffe99a" stroke="#a8700a" stroke-width="0.7"/>`
  s += `<path d="M${r1(x - 9)} ${r1(cy - 25)} q-1 9 3 15" fill="none" stroke="#fff3b8" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>`
  s += `<path d="M${r1(x)} ${r1(cy - 23)} l2 4.2 4.5 0.6 -3.3 3.1 0.9 4.5 -4.1 -2.2 -4.1 2.2 0.9 -4.5 -3.3 -3.1 4.5 -0.6z" fill="#fffbe0" stroke="#c98a0a" stroke-width="0.6" stroke-linejoin="round"/>`
  return { svg: s, hoehe: 52 }
}

/** Platzhalter für Items ohne eigenes Sprite: Holzkiste mit Fragezeichen. */
export function platzhalterKiste(): Teil {
  const [x, y] = iso(0, 0, 0)
  let s = `<defs>${BLUR}</defs>` + weicherSchatten(x, y + 1, 20)
  s += quader({ u0: -0.2, v0: -0.2, u1: 0.2, v1: 0.2, h: 18, farbe: '#c98a45', dachFarbe: '#e0aa6a' })
  const [tx, ty] = iso(0, 0, 18)
  s += `<text x="${r1(tx)}" y="${r1(ty + 5)}" font-family="sans-serif" font-size="15" font-weight="700" text-anchor="middle" fill="#7a4a1c">?</text>`
  return { svg: s, hoehe: 30 }
}
