import type { FigurArt } from '../betrieb-figuren'

/**
 * Figuren im weichen Stil (PROJ-37): kleine Menschen und Tiere mit zwei
 * Schritt-Posen und zwei Blickrichtungen (links/rechts, die andere Seite wird
 * gespiegelt). Jede Zeichnung ist ein eigenes kleines SVG; der Fußpunkt liegt
 * mittig auf der Unterkante.
 */

export type Blick = 'links' | 'rechts'
export type Phase = 0 | 1

export interface FigurBild {
  w: number
  h: number
  /** data:-URI. */
  url: string
  /** Abstand vom Fußpunkt zur Bildunterkante (hier 0: Fuß = Unterkante). */
  fuss: number
}

const W = 44
const H = 54
const BODEN = H - 4
const KONTUR = '#5a3a24'
const r1 = (n: number) => Math.round(n * 10) / 10
const datenUri = (svg: string) =>
  `data:image/svg+xml,${encodeURIComponent(svg).replace(/[()']/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`

const ellipse = (cx: number, cy: number, rx: number, ry: number, f: string, st = KONTUR, sw = 0.8): string =>
  `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${f}" stroke="${st}" stroke-width="${sw}"/>`
const kreis = (cx: number, cy: number, r: number, f: string, st = KONTUR, sw = 0.8): string => ellipse(cx, cy, r, r, f, st, sw)
const linie = (x1: number, y1: number, x2: number, y2: number, f: string, w = 2): string =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${f}" stroke-width="${w}" stroke-linecap="round"/>`

const schatten = (rx: number): string => `<ellipse cx="${W / 2}" cy="${BODEN + 1}" rx="${rx}" ry="${r1(rx * 0.38)}" fill="#1e4d12" opacity="0.28"/>`

// ── Menschen ─────────────────────────────────────────────────────────────────

interface MenschStil {
  haut: string
  oben: string
  hose: string
  /** zusätzliche Teile über dem Kopf/Körper */
  kopf?: (cx: number, cy: number) => string
  koerper?: (cx: number, cy: number) => string
  skala?: number
}

const MENSCHEN: Record<'gast-1' | 'gast-2' | 'gast-3' | 'kind' | 'arbeiter' | 'fahrer', MenschStil> = {
  'gast-1': {
    haut: '#f2c9a0',
    oben: '#e2543a',
    hose: '#2f8cf0',
    kopf: (cx, cy) => `<ellipse cx="${cx}" cy="${r1(cy - 4)}" rx="9" ry="2.6" fill="#e8c860" stroke="${KONTUR}" stroke-width="0.7"/><path d="M${cx - 5} ${r1(cy - 4)} q5 -8 10 0 z" fill="#e8c860" stroke="${KONTUR}" stroke-width="0.7"/><rect x="${cx - 5}" y="${r1(cy - 5.4)}" width="10" height="1.6" fill="#e2543a"/>`,
  },
  'gast-2': {
    haut: '#c98a5c',
    oben: '#ffd23f',
    hose: '#fbfbf7',
    kopf: (cx, cy) => `<rect x="${cx - 5}" y="${r1(cy - 1.4)}" width="10" height="2.8" rx="1.2" fill="#14161c"/><path d="M${cx - 5} ${r1(cy - 6)} q5 -4 10 0" fill="#3a2a20" stroke="${KONTUR}" stroke-width="0.6"/>`,
  },
  'gast-3': {
    haut: '#e8b88a',
    oben: '#e8b88a',
    hose: '#17a5c0',
    koerper: (cx, cy) => `<path d="M${cx - 5.4} ${cy - 1} h10.8 v4 h-10.8 z" fill="#ff6f9a" stroke="${KONTUR}" stroke-width="0.6"/>`,
    kopf: (cx, cy) => `<path d="M${cx - 5.4} ${r1(cy - 3)} q5.4 -7 10.8 0 q-5.4 -3 -10.8 0 z" fill="#8a4a2a" stroke="${KONTUR}" stroke-width="0.6"/>`,
  },
  kind: {
    haut: '#f2c9a0',
    oben: '#2f8cf0',
    hose: '#ffd23f',
    skala: 0.74,
    kopf: (cx, cy) => `<path d="M${cx - 5} ${r1(cy - 2.4)} q5 -7 10 0 q-5 -2 -10 0 z" fill="#6a3a1a" stroke="${KONTUR}" stroke-width="0.6"/>${kreis(cx + 6, cy - 5, 1.8, '#ff6f61', KONTUR, 0.5)}`,
  },
  arbeiter: {
    haut: '#e8b88a',
    oben: '#ff8a1c',
    hose: '#4b5563',
    kopf: (cx, cy) => `<path d="M${cx - 6} ${r1(cy - 1.4)} q6 -9 12 0 z" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.7"/><rect x="${cx - 7}" y="${r1(cy - 1.8)}" width="14" height="2" rx="1" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.6"/>`,
    koerper: (cx, cy) => `<rect x="${cx - 5.8}" y="${r1(cy + 6)}" width="11.6" height="2" fill="#f4f6d8"/>`,
  },
  fahrer: {
    haut: '#e8b88a',
    oben: '#fff1d4',
    hose: '#2b3a55',
    kopf: (cx, cy) => `<path d="M${cx - 5.6} ${r1(cy - 1.4)} q5.6 -8 11.2 0 z" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="0.7"/><rect x="${cx + 1}" y="${r1(cy - 2)}" width="8" height="1.8" rx="0.8" fill="#12427c"/>`,
    koerper: (cx, cy) => `<rect x="${cx - 1}" y="${cy + 4}" width="2" height="5" fill="#e2543a"/>`,
  },
}

function mensch(art: keyof typeof MENSCHEN, phase: Phase): string {
  const s = MENSCHEN[art]
  const k = s.skala ?? 1
  const cx = W / 2
  const fuss = BODEN
  const hoeheBein = 11 * k
  const huefte = fuss - hoeheBein
  const schulter = huefte - 14 * k
  const kopfY = schulter - 7 * k
  const schritt = phase === 0 ? 3.4 * k : -1.2 * k
  let out = schatten(10 * k)
  // Beine
  out += linie(cx - 2, huefte, cx - 2 - schritt, fuss, s.hose, 3.4 * k)
  out += linie(cx + 2, huefte, cx + 2 + schritt, fuss, ton2(s.hose), 3.4 * k)
  out += ellipse(cx - 2 - schritt, fuss, 2.4 * k, 1.2 * k, '#2b2f3a', '#14161c', 0.4)
  out += ellipse(cx + 2 + schritt, fuss, 2.4 * k, 1.2 * k, '#2b2f3a', '#14161c', 0.4)
  // Körper und Arme
  out += `<rect x="${r1(cx - 5.4 * k)}" y="${r1(schulter)}" width="${r1(10.8 * k)}" height="${r1(huefte - schulter + 1)}" rx="${r1(2.6 * k)}" fill="${s.oben}" stroke="${KONTUR}" stroke-width="0.8"/>`
  out += linie(cx - 5.4 * k, schulter + 2, cx - 7.6 * k, huefte - 2 + (phase === 0 ? 1 : -1), s.haut, 2.6 * k)
  out += linie(cx + 5.4 * k, schulter + 2, cx + 7.6 * k, huefte - 2 + (phase === 0 ? -1 : 1), s.haut, 2.6 * k)
  if (s.koerper) out += s.koerper(cx, schulter)
  // Kopf
  out += kreis(cx, kopfY, 5.6 * k, s.haut)
  out += kreis(cx + 1.8 * k, kopfY - 0.4, 0.8 * k, '#2b1a10', '#2b1a10', 0)
  out += `<path d="M${r1(cx + 0.4)} ${r1(kopfY + 2.4 * k)} q1.6 1 3 0" fill="none" stroke="#a04a3a" stroke-width="0.7" stroke-linecap="round"/>`
  if (s.kopf) out += s.kopf(cx, kopfY)
  return out
}

const ton2 = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16)
  const c = (sh: number) => Math.max(0, Math.round(((n >> sh) & 255) * 0.82))
  return `#${((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1)}`
}

// ── Tiere ────────────────────────────────────────────────────────────────────

function vierbeiner(phase: Phase, haut: string, hell: string, ohr: string, ruecken: number): string {
  const cx = W / 2
  const y = BODEN
  const a = phase === 0 ? 3 : -2
  let out = schatten(15)
  // Beine (hinten/vorne)
  out += linie(cx - 8, y - 8, cx - 8 - a, y, ton2(haut), 3.2) + linie(cx - 4, y - 8, cx - 4 + a, y, haut, 3.2)
  out += linie(cx + 6, y - 8, cx + 6 + a, y, ton2(haut), 3.2) + linie(cx + 10, y - 8, cx + 10 - a, y, haut, 3.2)
  // Schwanz
  out += `<path d="M${cx - 13} ${y - 15 - ruecken} q-6 -5 -4 -11" fill="none" stroke="${haut}" stroke-width="3.4" stroke-linecap="round"/>`
  // Körper
  out += ellipse(cx - 1, y - 13, 13, 7.4, haut)
  out += ellipse(cx + 1, y - 10, 8, 3.6, hell, 'none', 0)
  // Kopf
  out += kreis(cx + 12, y - 19, 6.4, haut)
  out += ellipse(cx + 17, y - 17, 4, 3, hell)
  out += kreis(cx + 20, y - 18, 1.3, '#2b1a10', '#2b1a10', 0)
  out += kreis(cx + 12, y - 21, 0.9, '#2b1a10', '#2b1a10', 0)
  out += `<path d="M${cx + 9} ${y - 24} q-3 1 -3 6 q3 0 4 -3 z" fill="${ohr}" stroke="${KONTUR}" stroke-width="0.7" stroke-linejoin="round"/>`
  return out
}

const hund = (p: Phase): string => vierbeiner(p, '#c98a45', '#f3d9a8', '#8a5a2a', 2) + `<rect x="${W / 2 + 7}" y="${BODEN - 18}" width="8" height="2.2" rx="1" fill="#e2543a"/>`
const strandhund = (p: Phase): string => vierbeiner(p, '#e8b45a', '#fbe9bc', '#b87a2a', 3) + `<rect x="${W / 2 + 7}" y="${BODEN - 18}" width="8" height="2.2" rx="1" fill="#17a5c0"/>`

function katze(phase: Phase): string {
  const cx = W / 2
  const y = BODEN
  const a = phase === 0 ? 2.4 : -1.6
  let out = schatten(11)
  out += linie(cx - 6, y - 6, cx - 6 - a, y, '#c9751c', 2.6) + linie(cx - 2, y - 6, cx - 2 + a, y, '#e8903a', 2.6)
  out += linie(cx + 4, y - 6, cx + 4 + a, y, '#c9751c', 2.6) + linie(cx + 8, y - 6, cx + 8 - a, y, '#e8903a', 2.6)
  out += `<path d="M${cx - 10} ${y - 10} q-9 -4 -6 -14 q2 -3 4 0" fill="none" stroke="#e8903a" stroke-width="3" stroke-linecap="round"/>`
  out += ellipse(cx - 1, y - 10, 10, 5.6, '#f0a04a')
  out += `<path d="M${cx - 6} ${y - 14} v5 M${cx - 1} ${y - 15} v6 M${cx + 4} ${y - 14} v5" stroke="#c9751c" stroke-width="1.2" opacity="0.8"/>`
  out += kreis(cx + 9, y - 15, 5.2, '#f0a04a')
  out += `<path d="M${cx + 5} ${y - 19} l-1.6 -5 l4.4 2.6 z M${cx + 12.4} ${y - 19} l1.6 -5 l-4.4 2.6 z" fill="#f0a04a" stroke="${KONTUR}" stroke-width="0.7" stroke-linejoin="round"/>`
  out += kreis(cx + 10.4, y - 15.6, 1, '#2b1a10', '#2b1a10', 0) + kreis(cx + 7, y - 15.6, 1, '#2b1a10', '#2b1a10', 0)
  out += `<path d="M${cx + 8} ${y - 13.6} l0.8 0.8 l0.8 -0.8" stroke="#a04a3a" stroke-width="0.7" fill="none"/>`
  return out
}

function huhn(phase: Phase): string {
  const cx = W / 2
  const y = BODEN
  const a = phase === 0 ? 2 : -1.4
  const out = schatten(14)
  const einHuhn = (dx: number, f: string): string => {
    const x = cx + dx
    return (
      linie(x - 2, y - 5, x - 2 - a, y, '#e8a010', 1.6) + linie(x + 2, y - 5, x + 2 + a, y, '#e8a010', 1.6) +
      ellipse(x, y - 9, 6.6, 5.4, f) +
      `<path d="M${x - 5.6} ${y - 11} q-5 -2 -4 -6 q4 1 6 4 z" fill="${f}" stroke="${KONTUR}" stroke-width="0.7"/>` +
      kreis(x + 5.2, y - 15, 3.4, f) +
      `<path d="M${x + 8.4} ${y - 15.6} l3 1 l-3 1.2 z" fill="#ffb21c" stroke="${KONTUR}" stroke-width="0.5"/>` +
      `<path d="M${x + 3.8} ${y - 19} q1.4 -2.4 3 0 q1.4 -2 2 0.4 q-2.6 2.2 -5 -0.4 z" fill="#e2543a" stroke="${KONTUR}" stroke-width="0.4"/>` +
      kreis(x + 6, y - 15.2, 0.7, '#2b1a10', '#2b1a10', 0)
    )
  }
  return out + einHuhn(-7, '#fbfbf7') + einHuhn(8, '#e8b45a')
}

function flamingo(phase: Phase): string {
  const cx = W / 2
  const y = BODEN
  const a = phase === 0 ? 2.6 : -1.6
  let out = schatten(10)
  out += linie(cx - 2, y - 20, cx - 2 - a, y, '#ff8fb1', 1.6) + linie(cx + 2, y - 20, cx + 2 + a, y - 2, '#ff8fb1', 1.6)
  out += ellipse(cx, y - 24, 9, 6, '#ff9ec0')
  out += `<path d="M${cx - 8} ${y - 25} q-4 2 -5 6 q4 -1 6 -3 z" fill="#ff7aa8" stroke="${KONTUR}" stroke-width="0.6"/>`
  out += `<path d="M${cx + 6} ${y - 27} q6 -4 3 -12" fill="none" stroke="#ff9ec0" stroke-width="3" stroke-linecap="round"/>`
  out += kreis(cx + 9, y - 40, 3, '#ff9ec0')
  out += `<path d="M${cx + 10.6} ${y - 41} l5 1.6 l-3 2 z" fill="#2b2f3a" stroke="${KONTUR}" stroke-width="0.5"/>`
  out += kreis(cx + 9.4, y - 40.6, 0.7, '#2b1a10', '#2b1a10', 0)
  return out
}

function papagei(phase: Phase): string {
  const cx = W / 2
  const y = BODEN
  const hop = phase === 0 ? 0 : -3
  let out = schatten(9)
  out += linie(cx - 1, y - 6 + hop, cx - 1, y, '#8a919c', 1.6) + linie(cx + 3, y - 6 + hop, cx + 3, y, '#8a919c', 1.6)
  out += `<path d="M${cx - 6} ${y - 12 + hop} q-6 10 -2 18 q4 -4 5 -10 z" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="0.7" stroke-linejoin="round"/>`
  out += ellipse(cx, y - 16 + hop, 7, 9, '#e2543a')
  out += `<path d="M${cx - 5} ${y - 18 + hop} q-2 8 3 11 q4 -4 3 -11 z" fill="#2f8cf0" stroke="${KONTUR}" stroke-width="0.6"/><path d="M${cx - 3} ${y - 14 + hop} q0 4 3 6" stroke="#ffd23f" stroke-width="1.4" fill="none"/>`
  out += kreis(cx + 4, y - 28 + hop, 5, '#e2543a')
  out += `<ellipse cx="${cx + 6}" cy="${r1(y - 28 + hop)}" rx="2.6" ry="3.4" fill="#fbfbf7" stroke="${KONTUR}" stroke-width="0.5"/>`
  out += `<path d="M${cx + 8} ${y - 29 + hop} q4 0 3 4 q-3 1 -4 -2 z" fill="#ffd23f" stroke="${KONTUR}" stroke-width="0.6" stroke-linejoin="round"/>`
  out += kreis(cx + 5.4, y - 29 + hop, 0.9, '#2b1a10', '#2b1a10', 0)
  return out
}

function krebs(phase: Phase): string {
  const cx = W / 2
  const y = BODEN
  const a = phase === 0 ? 2 : -2
  let out = schatten(11)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) out += linie(cx + s * 4, y - 6, cx + s * (9 + i * 1.6) + (i % 2 ? a : -a) * 0.6, y - 1 + i * 0.4, '#d9402c', 1.4)
    out += `<path d="M${cx + s * 8} ${y - 8} q${s * 5} -4 ${s * 4} -10" fill="none" stroke="#e2543a" stroke-width="2.4" stroke-linecap="round"/>`
    out += `<path d="M${cx + s * 12} ${y - 18} q${s * 3} -2 ${s * 0.4} -6 q${s * -3} 2 ${s * -0.4} 6 z" fill="#ff6f61" stroke="${KONTUR}" stroke-width="0.7" stroke-linejoin="round"/>`
  }
  out += ellipse(cx, y - 8, 9, 6, '#e2543a')
  out += `<path d="M${cx - 5} ${y - 11} q5 -3 10 0" stroke="#ff9a8a" stroke-width="1.6" fill="none" opacity="0.8"/>`
  for (const s of [-1, 1]) {
    out += linie(cx + s * 3, y - 13, cx + s * 3.6, y - 18, '#d9402c', 1.2)
    out += kreis(cx + s * 3.6, y - 19, 1.8, '#fbfbf7') + kreis(cx + s * 3.6, y - 19, 0.8, '#2b1a10', '#2b1a10', 0)
  }
  return out
}

function zeichne(art: FigurArt, phase: Phase): string {
  switch (art) {
    case 'hund': return hund(phase)
    case 'strandhund': return strandhund(phase)
    case 'katze': return katze(phase)
    case 'huhn': return huhn(phase)
    case 'flamingo': return flamingo(phase)
    case 'papagei': return papagei(phase)
    case 'krebs': return krebs(phase)
    default: return mensch(art, phase)
  }
}

const cache = new Map<string, FigurBild>()

/** Zeichnung einer Figur; `blick: 'links'` ist die gespiegelte Variante. */
export function figurBild(art: FigurArt, blick: Blick, phase: Phase): FigurBild {
  const key = `${art}|${blick}|${phase}`
  const alt = cache.get(key)
  if (alt) return alt
  const inhalt = zeichne(art, phase)
  const gruppe = blick === 'links' ? `<g transform="translate(${W} 0) scale(-1 1)">${inhalt}</g>` : inhalt
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${gruppe}</svg>`
  const bild: FigurBild = { w: W, h: H, url: datenUri(svg), fuss: 4 }
  cache.set(key, bild)
  return bild
}

export const ALLE_FIGUREN: FigurArt[] = ['gast-1', 'gast-2', 'gast-3', 'kind', 'arbeiter', 'fahrer', 'hund', 'katze', 'huhn', 'strandhund', 'flamingo', 'papagei', 'krebs']
export { BODEN }

export interface TierDef {
  key: string
  label: string
  art: FigurArt
  category: 'fahrzeuge' | 'gebaeude_deko' | 'ladung_ausstattung' | 'abzeichen_trophaeen'
}

export const SPEDITION_TIERE: TierDef[] = [
  { key: 'hofhund', label: 'Hofhund', art: 'hund', category: 'ladung_ausstattung' },
  { key: 'hofkatze', label: 'Hofkatze', art: 'katze', category: 'ladung_ausstattung' },
  { key: 'huehner', label: 'Hühner', art: 'huhn', category: 'ladung_ausstattung' },
]
export const RESORT_TIERE: TierDef[] = [
  { key: 'strandhund', label: 'Strandhund', art: 'strandhund', category: 'ladung_ausstattung' },
  { key: 'flamingo', label: 'Flamingo', art: 'flamingo', category: 'ladung_ausstattung' },
  { key: 'papagei', label: 'Papagei', art: 'papagei', category: 'ladung_ausstattung' },
  { key: 'krebs', label: 'Krebs', art: 'krebs', category: 'ladung_ausstattung' },
]

/** Standbild eines Tiers (Shop, Admin-Auswahl): die Figur groß auf einer Kachel. */
export function tierStandbild(art: FigurArt): { svg: string; hoehe: number } {
  const f = figurBild(art, 'rechts', 0)
  const k = 1.7
  return {
    svg: `<image href="${f.url}" x="${r1((-f.w * k) / 2)}" y="${r1(-(f.h - f.fuss) * k + 2)}" width="${r1(f.w * k)}" height="${r1(f.h * k)}"/>`,
    hoehe: Math.round((f.h - f.fuss) * k) + 6,
  }
}
