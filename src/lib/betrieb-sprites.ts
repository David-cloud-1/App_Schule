import { TILE_H, sprite } from './hof-welt/iso'
import { fahrzeugBild } from './hof-welt/fahrzeuge'
import * as N from './hof-welt/natur'
import * as V from './hof-welt/sprites-betrieb'
import { STIL_WEICH, stilAnwenden } from './hof-welt/stil'
import { SPEDITION_WEICH } from './hof-welt/spedition-weich'

/**
 * Sprite-Katalog für „Mein Betrieb" (PROJ-34): Icon-Schlüssel eines Shop-Items
 * -> isometrisches Sprite. Gleicher Schlüssel wie im flachen Icon-Set
 * (hof-icons.tsx); ein Item ohne Sprite bekommt einen Platzhalter, nie eine
 * Lücke. Neue Sprites erfordern einen Code-Deploy (wie die flachen Icons).
 */

export interface BetriebSprite {
  key: string
  /** Größe des Bildes in Welteinheiten (vor `skala`). */
  w: number
  h: number
  /** Abstand der Standlinie zur Bildunterkante (vor `skala`). */
  bottom: number
  /** data:-URI des fertigen SVG. */
  url: string
  /** Maßstab relativ zur Kachel (Items sind etwas größer als eine Kachel breit). */
  skala: number
  platzhalter: boolean
}

type Bild = { w: number; h: number; url: string; bottom: number }
type Baumeister = () => Bild

export const SPRITE_SKALA = 1.2

const dec = (url: string) => decodeURIComponent(url.slice('data:image/svg+xml,'.length))
const enc = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`

const aus = (t: { svg: string; hoehe: number }): Bild => {
  const s = sprite(t.svg, t.hoehe)
  return { w: s.w, h: s.h, url: s.url, bottom: TILE_H / 2 }
}

const fahrzeug = (art: string, farbe: string): Bild => {
  const b = fahrzeugBild(art, farbe, 'se')
  return { w: b.w, h: b.h, url: enc(stilAnwenden(dec(b.url), STIL_WEICH)), bottom: b.fuss }
}

const SPEDITION: Record<string, Baumeister> = {
  // Gebäude & Deko
  lagerhalle: () => aus(N.lagerhalleWeich()),
  buerogebaeude: () => aus(N.buerohausWeich()),
  scheune: () => aus(N.scheune()),
  baum: () => aus(N.baumLusch(1)),
  blumenwiese: () => aus(N.blumenWiese()),
  blumenbeet: () => aus(V.blumenbeet()),
  busch: () => aus(V.busch()),
  kegel: () => aus(V.kegel()),
  wegweiser: () => aus(V.wegweiser()),
  // Fahrzeuge
  'sattelschlepper-rot': () => fahrzeug('planensattel', 'red'),
  'transporter-blau': () => fahrzeug('solo', 'blue'),
  'kleinlaster-gruen': () => fahrzeug('solo', 'green'),
  kuehltransporter: () => fahrzeug('kuehlkoffer', 'blue'),
  // Ladung & Ausstattung
  container: () => aus(N.containerWeich()),
  // Abzeichen & Trophäen
  pokal: () => aus(N.pokalWeich()),
  // Serie aus spedition-weich.ts (Fahrzeuge, Hofdeko, Ladung, Abzeichen)
  ...Object.fromEntries(Object.entries(SPEDITION_WEICH).map(([k, f]) => [k, () => aus(f())])),
}

const KATALOG: Record<string, Record<string, Baumeister>> = {
  SPED: SPEDITION,
  // Tourismus folgt mit PROJ-35; bis dahin zeigt jedes Item den Platzhalter.
  TOUR: {},
}

const cache = new Map<string, BetriebSprite>()

/** Schlüssel mit eigenem Sprite für diesen Fachbereich. */
export function betriebSpriteSchluessel(departmentCode: string): string[] {
  return Object.keys(KATALOG[departmentCode] ?? {})
}

export function hatBetriebSprite(departmentCode: string, iconKey: string | null | undefined): boolean {
  return !!iconKey && !!KATALOG[departmentCode]?.[iconKey]
}

/** Sprite eines Items; ohne eigenes Sprite der Platzhalter (nie null). */
export function getBetriebSprite(departmentCode: string, iconKey: string | null | undefined): BetriebSprite {
  const echt = iconKey ? KATALOG[departmentCode]?.[iconKey] : undefined
  const key = echt ? `${departmentCode}:${iconKey}` : 'platzhalter'
  const alt = cache.get(key)
  if (alt) return alt
  const bild = (echt ?? (() => aus(N.platzhalterKiste())))()
  const neu: BetriebSprite = { key, ...bild, skala: SPRITE_SKALA, platzhalter: !echt }
  cache.set(key, neu)
  return neu
}
