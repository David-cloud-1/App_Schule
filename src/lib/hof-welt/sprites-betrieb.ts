import { TILE_H, iso, ton, quader, kantenTon, sprite, type Sprite } from './iso'
import type { Teil } from './bauteile'

const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * Pokal auf Steinsockel (PROJ-34, Stilprobe): im Tycoon gibt es keine
 * Trophäen, deshalb mit denselben Iso-Bausteinen neu gezeichnet. Der Becher
 * selbst steht „frontal" wie Bäume und Fahnen — so wirkt er klar und lesbar.
 */
export function pokalTeil(gold = '#f2b705'): Teil {
  const sockel = quader({ u0: -0.26, v0: -0.26, u1: 0.26, v1: 0.26, h: 9, farbe: '#d9d2c3', dachFarbe: '#e8e2d4' })
  const sockel2 = quader({ u0: -0.17, v0: -0.17, u1: 0.17, v1: 0.17, z: 9, h: 5, farbe: '#b8863b', dachFarbe: '#d9a24d' })
  const [cx, cy] = iso(0, 0, 14)
  const dunkel = kantenTon(gold)
  const hell = ton(gold, 1.3)
  const x = (n: number) => r1(cx + n)
  const y = (n: number) => r1(cy + n)
  const becher =
    // Henkel
    `<path d="M${x(-11)} ${y(-24)} q-9 1 -8 9 q1 8 10 8" fill="none" stroke="${dunkel}" stroke-width="4.6" stroke-linecap="round"/>` +
    `<path d="M${x(-11)} ${y(-24)} q-9 1 -8 9 q1 8 10 8" fill="none" stroke="${gold}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M${x(11)} ${y(-24)} q9 1 8 9 q-1 8 -10 8" fill="none" stroke="${dunkel}" stroke-width="4.6" stroke-linecap="round"/>` +
    `<path d="M${x(11)} ${y(-24)} q9 1 8 9 q-1 8 -10 8" fill="none" stroke="${gold}" stroke-width="2.6" stroke-linecap="round"/>` +
    // Fuß und Schaft
    `<rect x="${x(-8)}" y="${y(-3)}" width="16" height="4.5" rx="2" fill="${ton(gold, 0.78)}" stroke="${dunkel}" stroke-width="1.4"/>` +
    `<rect x="${x(-2.6)}" y="${y(-11)}" width="5.2" height="9" fill="${ton(gold, 0.9)}" stroke="${dunkel}" stroke-width="1.2"/>` +
    // Kelch
    `<path d="M${x(-12)} ${y(-28)} h24 q0 17 -12 19 q-12 -2 -12 -19 z" fill="${gold}" stroke="${dunkel}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M${x(-9)} ${y(-26)} q-1 9 3 14" fill="none" stroke="${hell}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<ellipse cx="${x(0)}" cy="${y(-28)}" rx="12" ry="3.2" fill="${ton(gold, 1.12)}" stroke="${dunkel}" stroke-width="1.4"/>` +
    // Stern
    `<path d="M${x(0)} ${y(-24)} l1.9 3.9 4.2 0.5 -3.1 2.9 0.8 4.2 -3.8 -2.1 -3.8 2.1 0.8 -4.2 -3.1 -2.9 4.2 -0.5z" fill="#fff6c8" stroke="${dunkel}" stroke-width="0.8" stroke-linejoin="round"/>`
  const schatten = `<ellipse cx="${x(0)}" cy="${y(2)}" rx="${r1(TILE_H * 0.52)}" ry="${r1(TILE_H * 0.2)}" fill="#000" opacity="0.18"/>`
  return { svg: schatten + sockel + sockel2 + becher, hoehe: 46 }
}

export function pokalSprite(): Sprite {
  const t = pokalTeil()
  return sprite(t.svg, t.hoehe)
}

// ── Verspielte Details (PROJ-34, „Hay-Day-Stil") ────────────────────────────
// Kleine Dinge, die aus einem Gebäude einen Ort machen: Wimpel, Markisen,
// Blumen, Büsche. Alle im selben Koordinatensystem wie die Tycoon-Bausteine.

const pt = (u: number, v: number, w = 0): [number, number] => iso(u, v, w)
const FEST = ['#ec4636', '#ffd23f', '#2f8cf0', '#3fc060', '#ff8fb1']

/** Wimpelkette zwischen zwei Punkten, mit leichtem Durchhang. */
export function wimpelkette(
  a: [number, number, number],
  b: [number, number, number],
  anzahl = 7,
  durchhang = 4,
  farben: string[] = FEST,
): string {
  const [x0, y0] = pt(a[0], a[1], a[2])
  const [x1, y1] = pt(b[0], b[1], b[2])
  const punkt = (t: number): [number, number] => [
    x0 + (x1 - x0) * t,
    y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * durchhang,
  ]
  let s = `<path d="M${r1(x0)} ${r1(y0)} Q${r1((x0 + x1) / 2)} ${r1((y0 + y1) / 2 + durchhang * 2)} ${r1(x1)} ${r1(y1)}" fill="none" stroke="#5a3a24" stroke-width="1.1"/>`
  for (let i = 0; i < anzahl; i++) {
    const t = (i + 0.7) / (anzahl + 0.4)
    const [px, py] = punkt(t)
    const f = farben[i % farben.length]!
    s += `<polygon points="${r1(px - 3)},${r1(py)} ${r1(px + 3)},${r1(py)} ${r1(px)},${r1(py + 7)}" fill="${f}" stroke="#5a3a24" stroke-width="0.9" stroke-linejoin="round"/>`
  }
  return s
}

/** Gestreifte Markise über einer Tür an der Südost-Wand (u = konstant). */
export function markise(u: number, v0: number, v1: number, z: number, tiefe = 0.13, streifen = 6): string {
  let s = ''
  const hoeheAussen = z - 5
  for (let i = 0; i < streifen; i++) {
    const a = v0 + ((v1 - v0) * i) / streifen
    const b = v0 + ((v1 - v0) * (i + 1)) / streifen
    const f = i % 2 === 0 ? '#ec4636' : '#fff6e0'
    const p = [pt(u, a, z), pt(u, b, z), pt(u + tiefe, b, hoeheAussen), pt(u + tiefe, a, hoeheAussen)]
    s += `<polygon points="${p.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')}" fill="${f}" stroke="#5a3a24" stroke-width="0.9" stroke-linejoin="round"/>`
  }
  // Zackenkante
  for (let i = 0; i < streifen; i++) {
    const m = v0 + ((v1 - v0) * (i + 0.5)) / streifen
    const [x, y] = pt(u + tiefe, m, hoeheAussen)
    s += `<circle cx="${r1(x)}" cy="${r1(y + 1.4)}" r="2.2" fill="${i % 2 === 0 ? '#ec4636' : '#fff6e0'}" stroke="#5a3a24" stroke-width="0.8"/>`
  }
  return s
}

/** Fahnenmast auf einem Dach: wehende Fahne wie bei `fahne`, aber auf Höhe z. */
export function dachfahne(u: number, v: number, z: number, h: number, farbe: string): string {
  const [x, y] = pt(u, v, z)
  const ox = r1(x + 1)
  const oy = r1(y - h + 2)
  return (
    `<rect x="${r1(x - 0.9)}" y="${r1(y - h)}" width="1.8" height="${r1(h)}" fill="#8a7a6a" stroke="#5a3a24" stroke-width="0.7"/>` +
    `<circle cx="${r1(x)}" cy="${r1(y - h - 0.5)}" r="1.6" fill="#ffd23f" stroke="#5a3a24" stroke-width="0.7"/>` +
    `<path class="bt-fahne" style="transform-origin:${ox}px ${oy}px" d="M ${ox} ${oy} L ${r1(x + 15)} ${r1(y - h + 5)} L ${ox} ${r1(y - h + 11)} Z" fill="${farbe}" stroke="#5a3a24" stroke-width="0.9" stroke-linejoin="round"/>`
  )
}

function schattenOval(rx = 20): string {
  const [x, y] = pt(0, 0, 0)
  return `<ellipse cx="${r1(x)}" cy="${r1(y + 1)}" rx="${rx}" ry="${r1(rx * 0.42)}" fill="#000" opacity="0.18"/>`
}

/** Blumenbeet: grüner Hügel mit bunten Blüten. */
export function blumenbeet(): Teil {
  const [x, y] = pt(0, 0, 0)
  let s = schattenOval(22)
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 2)}" rx="21" ry="9.5" fill="#8b5a2b" stroke="#5a3a24" stroke-width="1.2"/>`
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - 5)}" rx="19" ry="8" fill="#5cc450" stroke="#2f7a2a" stroke-width="1"/>`
  const blueten: [number, number, string][] = [
    [-11, -7, '#ec4636'], [-3, -11, '#ffd23f'], [6, -9, '#ff8fb1'], [12, -5, '#ffffff'],
    [-6, -3, '#ffffff'], [3, -4, '#ec4636'], [-14, -3, '#ffd23f'],
  ]
  for (const [dx, dy, f] of blueten) {
    s += `<line x1="${r1(x + dx)}" y1="${r1(y + dy)}" x2="${r1(x + dx)}" y2="${r1(y + dy + 5)}" stroke="#2f7a2a" stroke-width="1.2"/>`
    s += `<circle cx="${r1(x + dx)}" cy="${r1(y + dy)}" r="3.4" fill="${f}" stroke="#5a3a24" stroke-width="0.9"/>`
    s += `<circle cx="${r1(x + dx)}" cy="${r1(y + dy)}" r="1.1" fill="#ffb21c"/>`
  }
  return { svg: s, hoehe: 22 }
}

/** Runder Busch aus drei Kugeln mit Glanzlicht und roten Beeren. */
export function busch(): Teil {
  const [x, y] = pt(0, 0, 0)
  let s = schattenOval(20)
  const kugel = (dx: number, dy: number, r: number, f: string) =>
    `<circle cx="${r1(x + dx)}" cy="${r1(y + dy)}" r="${r}" fill="${f}" stroke="#2f7a2a" stroke-width="1.2"/>`
  s += kugel(-9, -6, 9, '#46b84a') + kugel(9, -6, 9, '#46b84a') + kugel(0, -12, 11, '#5cc450')
  s += `<ellipse cx="${r1(x - 3)}" cy="${r1(y - 16)}" rx="4" ry="2.4" fill="#a6e66c" opacity="0.85"/>`
  for (const [dx, dy] of [[-8, -4], [6, -9], [10, -3], [-2, -14]] as const) {
    s += `<circle cx="${r1(x + dx)}" cy="${r1(y + dy)}" r="1.8" fill="#ec4636" stroke="#5a3a24" stroke-width="0.6"/>`
  }
  return { svg: s, hoehe: 26 }
}

/** Verkehrskegel – klein, orange, mit weißem Streifen. */
export function kegel(): Teil {
  const [x, y] = pt(0, 0, 0)
  let s = schattenOval(11)
  s += `<rect x="${r1(x - 8)}" y="${r1(y - 2.5)}" width="16" height="4.5" rx="1.4" fill="#4b5563" stroke="#5a3a24" stroke-width="1"/>`
  s += `<polygon points="${r1(x - 6)},${r1(y - 2)} ${r1(x + 6)},${r1(y - 2)} ${r1(x + 2.2)},${r1(y - 19)} ${r1(x - 2.2)},${r1(y - 19)}" fill="#ff8a1c" stroke="#5a3a24" stroke-width="1.1" stroke-linejoin="round"/>`
  s += `<polygon points="${r1(x - 4.4)},${r1(y - 8.5)} ${r1(x + 4.4)},${r1(y - 8.5)} ${r1(x + 3.4)},${r1(y - 12.5)} ${r1(x - 3.4)},${r1(y - 12.5)}" fill="#fff6e0"/>`
  return { svg: s, hoehe: 22 }
}

/** Holz-Wegweiser mit zwei Schildern. */
export function wegweiser(): Teil {
  const [x, y] = pt(0, 0, 0)
  let s = schattenOval(13)
  s += `<rect x="${r1(x - 2)}" y="${r1(y - 30)}" width="4" height="31" rx="1.2" fill="#c98a45" stroke="#5a3a24" stroke-width="1.1"/>`
  s += `<polygon points="${r1(x - 14)},${r1(y - 28)} ${r1(x + 9)},${r1(y - 28)} ${r1(x + 15)},${r1(y - 23)} ${r1(x + 9)},${r1(y - 18)} ${r1(x - 14)},${r1(y - 18)}" fill="#ffd23f" stroke="#5a3a24" stroke-width="1.1" stroke-linejoin="round"/>`
  s += `<polygon points="${r1(x + 14)},${r1(y - 15)} ${r1(x - 9)},${r1(y - 15)} ${r1(x - 15)},${r1(y - 10)} ${r1(x - 9)},${r1(y - 5)} ${r1(x + 14)},${r1(y - 5)}" fill="#ec4636" stroke="#5a3a24" stroke-width="1.1" stroke-linejoin="round"/>`
  s += `<rect x="${r1(x - 9)}" y="${r1(y - 25)}" width="14" height="2" rx="1" fill="#5a3a24" opacity="0.7"/>`
  s += `<rect x="${r1(x - 6)}" y="${r1(y - 12)}" width="14" height="2" rx="1" fill="#fff6e0" opacity="0.9"/>`
  return { svg: s, hoehe: 34 }
}
