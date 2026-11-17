/**
 * Bild-Blöcke im Baukasten (PROJ-104, PROJ-105, PROJ-106): Breite in Prozent, Ausrichtung,
 * Text daneben, Galerie und Markierungen. Reine Funktionen auf Blöcken, ohne Browser und Server.
 *
 * Alles, was die Vorschau (die abgeschottete Seite) wünscht, läuft vor dem Speichern durch
 * `leseBreite`, `bereinigeMarken` & Co.: Die Seite ist nicht vertrauenswürdig.
 * Die Grenzen entsprechen denen des Kerns (`bildmarken.py`, `seite.py`).
 */
import { kopie, type Block, type Ort, type Struktur } from '@/lib/werkzeugkiste-editor'

// ── Breite (PROJ-104) ────────────────────────────────────────────────────

export const BREITE_MIN = 20
export const BREITE_MAX = 100
/** Beim Ziehen rastet die Breite bei diesen Stufen ein */
export const BREITE_STUFEN = [25, 33, 50, 66, 100] as const
/** Wie nah (in Prozentpunkten) man an einer Stufe sein muss, damit sie einrastet */
export const EINRAST_NAEHE = 3
/** Die drei Knöpfe am Handy */
export const HANDY_BREITEN = [
  { name: 'Klein', prozent: 33 },
  { name: 'Halb', prozent: 50 },
  { name: 'Ganz', prozent: 100 },
] as const

/** Liest die Breite eines Bildes (`"40%"`, `"65"`, 50) in Prozent; ohne Angabe ganze Breite */
export function leseBreite(wert: unknown): number {
  if (typeof wert === 'number') return begrenzeBreite(wert)
  if (typeof wert !== 'string') return BREITE_MAX
  const m = /^\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:%|prozent)?\s*$/i.exec(wert)
  return m ? begrenzeBreite(Number(m[1].replace(',', '.'))) : BREITE_MAX
}

export function begrenzeBreite(p: number): number {
  if (!Number.isFinite(p)) return BREITE_MAX
  return Math.round(Math.max(BREITE_MIN, Math.min(BREITE_MAX, p)))
}

/** `50` → `"50%"` */
export const formatBreite = (p: number) => `${begrenzeBreite(p)}%`

/** Rastet an der nächsten Stufe ein, wenn sie nah genug ist (sonst bleibt der Wert, auf ganze Prozent gerundet) */
export function rasteEin(p: number, mitRaster = true): number {
  const b = begrenzeBreite(p)
  if (!mitRaster) return b
  let beste: number | null = null
  for (const s of BREITE_STUFEN) if (Math.abs(s - b) <= EINRAST_NAEHE && (beste === null || Math.abs(s - b) < Math.abs(beste - b))) beste = s
  return beste ?? b
}

/** Nächstgrößere (`1`) oder nächstkleinere (`-1`) Stufe; am Rand bleibt der Wert */
export function naechsteStufe(p: number, richtung: 1 | -1): number {
  const b = begrenzeBreite(p)
  if (richtung === 1) return BREITE_STUFEN.find((s) => s > b) ?? BREITE_MAX
  return [...BREITE_STUFEN].reverse().find((s) => s < b) ?? Math.min(b, BREITE_STUFEN[0])
}

export type Ausrichtung = 'links' | 'mitte' | 'rechts'
export const AUSRICHTUNGEN: { wert: Ausrichtung; name: string }[] = [
  { wert: 'links', name: 'Links' },
  { wert: 'mitte', name: 'Mittig' },
  { wert: 'rechts', name: 'Rechts' },
]

export function leseAusrichtung(wert: unknown): Ausrichtung {
  return wert === 'links' || wert === 'rechts' ? wert : 'mitte'
}

export type TextDaneben = 'aus' | 'links' | 'rechts'

export function leseTextDaneben(wert: unknown): TextDaneben {
  return wert === 'links' || wert === 'rechts' ? wert : 'aus'
}

/** Breite setzen; ganze Breite wird als `100%` gespeichert (so liest es auch der Kern bei alten Materialien) */
export function setzeBreite(block: Block, prozent: number): Block {
  return { ...block, width: formatBreite(prozent) }
}

export function setzeAusrichtung(block: Block, wert: Ausrichtung): Block {
  const { align: _alt, ...rest } = block
  void _alt
  return wert === 'mitte' ? ({ ...rest } as Block) : ({ ...rest, align: wert } as Block)
}

/** „Text daneben“ umstellen. Beim Einschalten höchstens die halbe Breite (Vorgabe 33 %) */
export function setzeTextDaneben(block: Block, wert: TextDaneben): Block {
  const { text_neben: _alt, ...rest } = block
  void _alt
  if (wert === 'aus') return { ...rest } as Block
  const breite = leseBreite(block.width)
  return { ...rest, text_neben: wert, width: formatBreite(breite > 50 || block.width === undefined ? 33 : breite) } as Block
}

/** Steht nach dem Bild an `ort` ein Lehrtext, der daneben fließen kann? */
export function hatTextDanach(s: Struktur, ort: Ort): boolean {
  return s.chapters[ort.thema]?.elements[ort.block + 1]?.type === 'text'
}

/** Ist der Block ein Bild, dessen Datei gesetzt ist? */
export function hatBild(block: Block | undefined | null): boolean {
  return !!block && block.type === 'image' && typeof block.path === 'string' && block.path.trim() !== ''
}

/** Mehr als 150 % der Originalgröße: Das Bild wird unscharf */
export function wirdUnscharf(prozent: number, bildBreitePx: number, inhaltBreitePx = 900): boolean {
  if (!(bildBreitePx > 0)) return false
  return (inhaltBreitePx * prozent) / 100 > bildBreitePx * 1.5
}

// ── Markierungen (PROJ-106) ──────────────────────────────────────────────

export const MARKEN_ARTEN = ['pfeil', 'linie', 'kreis', 'rechteck', 'nummer', 'text', 'marker'] as const
export type MarkenArt = (typeof MARKEN_ARTEN)[number]
export const MARKEN_FARBEN = ['rot', 'gelb', 'blau', 'gruen', 'weiss'] as const
export type MarkenFarbe = (typeof MARKEN_FARBEN)[number]
export const MARKEN_STAERKEN = ['duenn', 'mittel', 'dick'] as const
export type MarkenStaerke = (typeof MARKEN_STAERKEN)[number]
/** Farbwerte wie im Kern (`bildmarken.FARBEN`): Füllung und Schrift darauf */
export const MARKEN_FARBWERTE: Record<MarkenFarbe, { fuellung: string; schrift: string; name: string }> = {
  rot: { fuellung: '#c81e1e', schrift: '#ffffff', name: 'Rot' },
  gelb: { fuellung: '#facc15', schrift: '#111111', name: 'Gelb' },
  blau: { fuellung: '#1d4ed8', schrift: '#ffffff', name: 'Blau' },
  gruen: { fuellung: '#15803d', schrift: '#ffffff', name: 'Grün' },
  weiss: { fuellung: '#ffffff', schrift: '#111111', name: 'Weiß' },
}
/** Strichstärken in Einheiten bei 1000 Einheiten Bildbreite (wie `bildmarken.STAERKEN`) */
export const MARKEN_STAERKE_WERT: Record<MarkenStaerke, number> = { duenn: 4, mittel: 8, dick: 14 }
export const MARKEN_MAX = 60
export const MARKEN_TEXT_MAX = 80
/** Ab so vielen Markierungen kommt der Hinweis „unübersichtlich“ (ohne Sperre) */
export const MARKEN_VIELE = 30
const ZWEI_PUNKTE: readonly MarkenArt[] = ['pfeil', 'linie', 'kreis', 'rechteck', 'marker']

export const hatZweiPunkte = (art: MarkenArt) => ZWEI_PUNKTE.includes(art)

/** Orte in Prozent des Bildes (0 bis 100); `aus` = ausgeblendet (liegt nach dem Zuschneiden außerhalb) */
export interface Marke {
  art: MarkenArt
  x: number
  y: number
  x2?: number
  y2?: number
  farbe: MarkenFarbe
  staerke: MarkenStaerke
  text: string
  aus?: boolean
}

const prozent = (v: unknown, standard = 50): number => {
  const z = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(z) ? Math.max(0, Math.min(100, Math.round(z * 100) / 100)) : standard
}

const einzeilig = (v: unknown): string =>
  (typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim().slice(0, MARKEN_TEXT_MAX)

/** Liest Markierungen aus einem Block oder einer Nachricht; Unbrauchbares fällt weg (wie `bildmarken.lese` im Kern) */
export function bereinigeMarken(roh: unknown): Marke[] {
  if (!Array.isArray(roh)) return []
  const liste: Marke[] = []
  for (const r of roh.slice(0, MARKEN_MAX)) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const art = (MARKEN_ARTEN as readonly unknown[]).includes(o.art) ? (o.art as MarkenArt) : null
    if (!art) continue
    const m: Marke = {
      art,
      x: prozent(o.x),
      y: prozent(o.y),
      farbe: (MARKEN_FARBEN as readonly unknown[]).includes(o.farbe) ? (o.farbe as MarkenFarbe) : 'rot',
      staerke: (MARKEN_STAERKEN as readonly unknown[]).includes(o.staerke) ? (o.staerke as MarkenStaerke) : 'mittel',
      text: einzeilig(o.text),
    }
    if (hatZweiPunkte(art)) {
      m.x2 = prozent(o.x2, m.x + 10)
      m.y2 = prozent(o.y2, m.y + 10)
    }
    if (o.aus === true) m.aus = true
    liste.push(m)
  }
  return liste
}

/** Markierungen in den Block schreiben; keine Markierungen = Feld entfällt */
export function setzeMarken(block: Block, marken: Marke[]): Block {
  const { marks: _alt, ...rest } = block
  void _alt
  const sauber = bereinigeMarken(marken)
  return sauber.length ? ({ ...rest, marks: sauber } as Block) : ({ ...rest } as Block)
}

export const leseMarken = (block: Block): Marke[] => bereinigeMarken(block.marks)
export const sichtbareMarken = (marken: Marke[]) => marken.filter((m) => !m.aus)

function punktDrehen(x: number, y: number, richtung: 1 | -1): [number, number] {
  // Das Bild wird um 90° gedreht: Breite und Höhe tauschen, die Prozentwerte laufen mit
  return richtung === 1 ? [100 - y, x] : [y, 100 - x]
}

/** Markierungen nach einer 90°-Drehung des Bildes (`1` nach rechts, `-1` nach links) */
export function markenNachDrehung(marken: Marke[], richtung: 1 | -1): Marke[] {
  return marken.map((m) => {
    const [x, y] = punktDrehen(m.x, m.y, richtung)
    const neu: Marke = { ...m, x: prozent(x), y: prozent(y) }
    if (m.x2 !== undefined && m.y2 !== undefined) {
      const [x2, y2] = punktDrehen(m.x2, m.y2, richtung)
      neu.x2 = prozent(x2)
      neu.y2 = prozent(y2)
    }
    return neu
  })
}

/** Ausschnitt in Prozent des alten Bildes */
export interface AusschnittProzent {
  x: number
  y: number
  breite: number
  hoehe: number
}

const innen = (v: number) => v >= -0.5 && v <= 100.5

/**
 * Markierungen nach dem Zuschneiden: Orte auf den neuen Ausschnitt umrechnen. Was ganz außerhalb liegt, wird
 * ausgeblendet (`aus`), aber nicht gelöscht. `ausserhalb` zählt die neu ausgeblendeten.
 */
export function markenNachAusschnitt(marken: Marke[], a: AusschnittProzent): { marken: Marke[]; ausserhalb: number } {
  const w = Math.max(a.breite, 0.01)
  const h = Math.max(a.hoehe, 0.01)
  let ausserhalb = 0
  const neu = marken.map((m) => {
    const x = ((m.x - a.x) / w) * 100
    const y = ((m.y - a.y) / h) * 100
    const zwei = m.x2 !== undefined && m.y2 !== undefined
    const x2 = zwei ? (((m.x2 as number) - a.x) / w) * 100 : x
    const y2 = zwei ? (((m.y2 as number) - a.y) / h) * 100 : y
    // Ein Punkt gilt als außerhalb, wenn er (bei zwei Punkten: beide) nicht im Bild liegt
    const sichtbar = zwei ? innen(x) && innen(y) || innen(x2) && innen(y2) : innen(x) && innen(y)
    const gespeichert: Marke = { ...m, x: prozent(x), y: prozent(y) }
    if (zwei) {
      gespeichert.x2 = prozent(x2)
      gespeichert.y2 = prozent(y2)
    }
    if (!sichtbar) {
      if (!m.aus) ausserhalb++
      gespeichert.aus = true
    }
    return gespeichert
  })
  return { marken: neu, ausserhalb }
}

/** Nummern zählen auf der Seite automatisch hoch: die wievielte Nummer ist die Marke an `index`? */
export function nummerVon(marken: Marke[], index: number): number {
  let n = 0
  for (let i = 0; i <= index && i < marken.length; i++) if (marken[i].art === 'nummer' && !marken[i].aus) n++
  return n
}

/** Eine Zeile je Markierung für die Liste „Was auf dem Bild markiert ist“ */
export function markeKurz(marken: Marke[], index: number): string {
  const m = marken[index]
  const NAMEN: Record<MarkenArt, string> = {
    pfeil: 'Pfeil',
    linie: 'Linie',
    kreis: 'Kreis',
    rechteck: 'Rechteck',
    nummer: 'Nummer',
    text: 'Text',
    marker: 'Marker',
  }
  if (m.art === 'nummer') return `Nummer ${nummerVon(marken, index)}${m.text ? `: ${m.text}` : ''}`
  return m.text ? `${NAMEN[m.art]}: ${m.text}` : NAMEN[m.art]
}

// ── Galerie (PROJ-105) ───────────────────────────────────────────────────

export const GALERIE_MAX = 12
export const GALERIE_MIN = 2

export interface GalerieBild {
  path: string
  alt: string
  caption?: string
  marks?: Marke[]
}

export function leseGalerieBilder(block: Block): GalerieBild[] {
  const liste = Array.isArray(block.images) ? block.images : []
  return liste
    .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
    .slice(0, GALERIE_MAX)
    .map((b) => {
      const marken = bereinigeMarken(b.marks)
      return {
        path: typeof b.path === 'string' ? b.path : '',
        alt: typeof b.alt === 'string' ? b.alt : '',
        ...(typeof b.caption === 'string' && b.caption ? { caption: b.caption } : {}),
        ...(marken.length ? { marks: marken } : {}),
      }
    })
}

export function setzeGalerieBilder(block: Block, bilder: GalerieBild[]): Block {
  return { ...block, images: bilder.slice(0, GALERIE_MAX).map((b) => ({ ...b })) } as Block
}

export function leseSpalten(wert: unknown): 2 | 3 | 4 {
  const n = Number(wert)
  return n === 2 || n === 4 ? n : 3
}

/** Ein Bild-Block als Eintrag der Galerie (Breite, Ausrichtung und „Text daneben“ gelten dort nicht) */
export function bildAlsGalerieBild(block: Block): GalerieBild {
  const marken = bereinigeMarken(block.marks)
  return {
    path: typeof block.path === 'string' ? block.path : '',
    alt: typeof block.alt === 'string' ? block.alt : '',
    ...(typeof block.caption === 'string' && block.caption ? { caption: block.caption } : {}),
    ...(marken.length ? { marks: marken } : {}),
  }
}

export function galerieBildAlsBlock(b: GalerieBild): Block {
  return { type: 'image', path: b.path, alt: b.alt, ...(b.caption ? { caption: b.caption } : {}), width: '100%', ...(b.marks?.length ? { marks: b.marks } : {}) } as Block
}

/** Alle Orte sind Bild-Blöcke mit Bild, in einem Thema? (Voraussetzung für „Als Galerie zusammenfassen“) */
export function kannZurGalerie(s: Struktur, orte: Ort[]): boolean {
  if (orte.length < GALERIE_MIN || orte.length > GALERIE_MAX) return false
  return orte.every((o) => hatBild(s.chapters[o.thema]?.elements[o.block]))
}

/**
 * Mehrere Bild-Blöcke zu einer Galerie zusammenfassen. Die Galerie steht an der Stelle des ersten gewählten
 * Bildes (in der Reihenfolge der Seite), die anderen Bild-Blöcke entfallen. Alternativtexte, Unterschriften und
 * Markierungen bleiben erhalten. `null`, wenn es nicht geht.
 */
export function fasseZurGalerieZusammen(s: Struktur, orte: Ort[]): { struktur: Struktur; ort: Ort } | null {
  const geordnet = [...orte].sort((a, b) => a.thema - b.thema || a.block - b.block)
  if (!kannZurGalerie(s, geordnet)) return null
  const bilder = geordnet.map((o) => bildAlsGalerieBild(s.chapters[o.thema].elements[o.block]))
  const galerie = { type: 'gallery', columns: bilder.length === 2 ? 2 : bilder.length === 4 ? 2 : 3, images: bilder } as Block
  const themen = s.chapters.map((t) => ({ ...t, elements: [...t.elements] }))
  for (let i = geordnet.length - 1; i >= 1; i--) themen[geordnet[i].thema].elements.splice(geordnet[i].block, 1)
  const erster = geordnet[0]
  themen[erster.thema].elements[erster.block] = galerie
  return { struktur: { ...s, chapters: themen }, ort: { thema: erster.thema, block: erster.block } }
}

/** Galerie auflösen: aus jedem Bild wird wieder ein einzelner Bild-Block (an der Stelle der Galerie) */
export function loeseGalerieAuf(s: Struktur, ort: Ort): { struktur: Struktur; orte: Ort[] } | null {
  const block = s.chapters[ort.thema]?.elements[ort.block]
  if (!block || block.type !== 'gallery') return null
  const bilder = leseGalerieBilder(block).map(galerieBildAlsBlock)
  if (bilder.length === 0) return null
  const themen = s.chapters.map((t) => ({ ...t, elements: [...t.elements] }))
  themen[ort.thema].elements.splice(ort.block, 1, ...bilder.map((b) => kopie(b)))
  return { struktur: { ...s, chapters: themen }, orte: bilder.map((_, i) => ({ thema: ort.thema, block: ort.block + i })) }
}

/** Galerie mit nur einem Bild in ein Einzelbild umwandeln (Rest-Fall, wenn alle anderen entfernt wurden) */
export function galerieAlsEinzelbild(block: Block): Block | null {
  const bilder = leseGalerieBilder(block)
  return bilder.length === 1 ? galerieBildAlsBlock(bilder[0]) : null
}

/** Was beim Bearbeiten mit dem Bild passiert ist: Anzahl 90°-Drehungen nach rechts (0 bis 3) und Ausschnitt */
export interface BildAenderung {
  drehungen: number
  ausschnitt: AusschnittProzent | null
}

/**
 * Das bearbeitete Bild (gedreht/zugeschnitten) in den Block setzen. Die Markierungen laufen mit: erst gedreht,
 * dann auf den Ausschnitt umgerechnet. `ausserhalb` zählt die Markierungen, die nun außerhalb liegen (sie bleiben
 * gespeichert, werden aber nicht gezeigt).
 */
export function wendeBildAenderungAn(block: Block, pfad: string, alt: string | undefined, aenderung: BildAenderung): { block: Block; ausserhalb: number } {
  let marken = leseMarken(block)
  for (let i = 0; i < ((aenderung.drehungen % 4) + 4) % 4; i++) marken = markenNachDrehung(marken, 1)
  let ausserhalb = 0
  if (aenderung.ausschnitt) {
    const r = markenNachAusschnitt(marken, aenderung.ausschnitt)
    marken = r.marken
    ausserhalb = r.ausserhalb
  }
  const neu: Block = { ...block, path: pfad }
  if (alt !== undefined && alt.trim()) neu.alt = alt
  return { block: setzeMarken(neu, marken), ausserhalb }
}

/** Neues Bild in einen Bild-Block setzen und dabei Breite, Ausrichtung, Text daneben und Alternativtext behalten */
export function ersetzeBild(block: Block, pfad: string, alt?: string, markenBehalten = false): Block {
  const neu: Block = { ...block, path: pfad }
  if (alt !== undefined && alt.trim()) neu.alt = alt
  return markenBehalten ? neu : (setzeMarken(neu, []) as Block)
}

// ── Bild aus Datei oder Zwischenablage (PROJ-104) ────────────────────────

/** Ein neuer Bild-Block für ein eben hochgeladenes Bild */
export function neuerBildBlock(pfad: string, alt = ''): Block {
  return { type: 'image', path: pfad, alt, width: '100%' }
}

/** Nimmt aus einer Liste von Dateien (Ziehen/Einfügen) nur die Bilder; die übrigen werden gezählt */
export function nurBilder<T extends { type: string; name: string }>(
  dateien: T[],
  erlaubt: (d: T) => boolean,
): { bilder: T[]; abgelehnt: number } {
  const bilder = dateien.filter(erlaubt)
  return { bilder, abgelehnt: dateien.length - bilder.length }
}

export const NUR_BILDER_FEHLER = 'Nur PNG, JPG und WebP können als Bild eingefügt werden.'

// ── Stelle im Bild finden / Bild als Aufgabe (PROJ-107) ──────────────────

export const BEREICHE_MAX = 20
export type BereichArt = 'kreis' | 'rechteck'

/** Ein anklickbarer Bereich: Rahmen in Prozent des Bildes (wie `bild-beschriften`), `richtig` und kurze Texte */
export interface Bereich {
  art: BereichArt
  x: number
  y: number
  x2: number
  y2: number
  richtig: boolean
  label: string
  feedback: string
}

const kurz = (v: unknown, max: number): string => (typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim().slice(0, max)

/** Liest Bereiche aus einem Block oder einer Nachricht; Unbrauchbares fällt weg (wie `seite.baue_hotspot` im Kern) */
export function bereinigeBereiche(roh: unknown): Bereich[] {
  if (!Array.isArray(roh)) return []
  const liste: Bereich[] = []
  for (const r of roh.slice(0, BEREICHE_MAX)) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const zahlen = [o.x, o.y, o.x2, o.y2].map((v) => (typeof v === 'number' ? v : Number(v)))
    if (zahlen.some((z) => !Number.isFinite(z))) continue
    const [x, y, x2, y2] = zahlen.map((z) => Math.round(Math.max(0, Math.min(100, z)) * 100) / 100)
    liste.push({
      art: o.art === 'kreis' ? 'kreis' : 'rechteck',
      x,
      y,
      x2,
      y2,
      richtig: o.richtig === true,
      label: kurz(o.label, 80),
      feedback: kurz(o.feedback, 300),
    })
  }
  return liste
}

export const leseBereiche = (block: Block): Bereich[] => bereinigeBereiche(block.bereiche)

export function setzeBereiche(block: Block, bereiche: Bereich[]): Block {
  return { ...block, bereiche: bereinigeBereiche(bereiche) } as Block
}

/** Ein neuer, noch nicht gezeichneter Bereich (kleine Mitte), damit er sichtbar ist und gezogen werden kann */
export function neuerBereich(art: BereichArt = 'kreis', richtig = false): Bereich {
  return { art, x: 40, y: 40, x2: 60, y2: 60, richtig, label: '', feedback: '' }
}

/** Beim Ziehen von Punkt A nach Punkt B: Rahmen (Ecken in beliebiger Richtung) */
export function rahmenAusZiehen(ax: number, ay: number, bx: number, by: number) {
  const k = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10
  return { x: k(Math.min(ax, bx)), y: k(Math.min(ay, by)), x2: k(Math.max(ax, bx)), y2: k(Math.max(ay, by)) }
}

/** Reicht es für eine Aufgabe? Mindestens ein richtiger Bereich */
export const hatRichtigenBereich = (bereiche: Bereich[]) => bereiche.some((b) => b.richtig)

export const BILD_AUFGABEN = ['hotspot', 'bildzuordnung'] as const
export type BildAufgabe = (typeof BILD_AUFGABEN)[number]

export const BILD_AUFGABE_NAME: Record<BildAufgabe, string> = {
  hotspot: 'Stelle im Bild finden',
  bildzuordnung: 'Bild beschriften',
}

/**
 * Ein Bild-Block wird zur Aufgabe. Bild und Alternativtext bleiben; bei „Stelle im Bild finden“ auch die Unterschrift.
 * Breite, Ausrichtung, „Text daneben“ und Markierungen gelten in der Aufgabe nicht (Aufgaben zeigen das Bild immer ganz).
 */
export function bildInAufgabe(block: Block, ziel: BildAufgabe): Block {
  const grund = { path: typeof block.path === 'string' ? block.path : '', alt: typeof block.alt === 'string' ? block.alt : '' }
  if (ziel === 'hotspot') {
    const caption = typeof block.caption === 'string' && block.caption.trim() ? { caption: block.caption } : {}
    return { type: 'hotspot', description: 'Finde die gesuchte Stelle im Bild.', ...grund, ...caption, bereiche: [] }
  }
  return { type: 'bildzuordnung', description: 'Setze die Begriffe an die richtige Stelle.', ...grund, punkte: [{ label: '' }, { label: '' }] }
}

/** Zurück zum reinen Bild: Die Aufgabe (Bereiche, Punkte, Texte) entfällt, das Bild bleibt */
export function aufgabeInBild(block: Block): Block {
  const caption = typeof block.caption === 'string' && block.caption.trim() ? { caption: block.caption } : {}
  return { type: 'image', path: typeof block.path === 'string' ? block.path : '', alt: typeof block.alt === 'string' ? block.alt : '', ...caption, width: '100%' }
}

/** Geht beim Zurückverwandeln etwas verloren, das die Lehrkraft gebaut hat? (für den Hinweis) */
export function aufgabeHatInhalt(block: Block): boolean {
  if (block.type === 'hotspot') return leseBereiche(block).length > 0
  if (block.type === 'bildzuordnung') {
    const p = Array.isArray(block.punkte) ? block.punkte : Array.isArray(block.points) ? block.points : []
    return p.some((x) => x && typeof x === 'object' && typeof (x as { label?: unknown }).label === 'string' && (x as { label: string }).label.trim() !== '')
  }
  return false
}
