import { useId } from 'react'
import { TILE_H, TILE_W } from '@/lib/hof-welt/iso'
import { sandUrl, wegUrl, wieseUrl, zaunWeissUrl } from '@/lib/hof-welt/natur'
import { getBetriebSprite, type BetriebSprite } from '@/lib/betrieb-sprites'
import { istImLand } from '@/lib/betrieb-land'
import { baueKacheln, baueZaun, grundMitte, istNeueKachel, kachelMitte, tiefe, weltGrenzen, type BodenArt } from '@/lib/betrieb-welt'
import type { HofRarity } from '@/lib/hof-rarity'
import { figurBild, type Blick, type Phase } from '@/lib/hof-welt/figuren'
import type { FigurArt } from '@/lib/betrieb-figuren'

/**
 * „Mein Betrieb" als isometrische Welt (PROJ-34) — ein einziges SVG. Boden,
 * Zaun und Sprites werden einmal in `defs` definiert und per `use` wiederholt
 * (statt hunderte Bilder ins DOM zu hängen). Zeichenreihenfolge von hinten nach
 * vorne; die Position eines Items hängt nur von seiner Kachel ab.
 *
 * Diese Komponente zeichnet nur. Kamera (Verschieben/Zoomen), Lager-Leiste und
 * Setzen kommen in späteren Schritten darüber.
 */

export interface PlatziertesItem {
  id: string
  name: string
  iconKey: string
  /** Kachel im Betriebsgrund (ab 0, hinten links = 0,0). */
  x: number
  y: number
  rarity?: HofRarity
}

/** Eine Figur in der Welt (PROJ-37): Tier, Gast oder Personal. */
export interface FigurAnzeige {
  id: string
  art: FigurArt
  /** Position in Kachelkoordinaten (Bruchteile während des Gehens). */
  x: number
  y: number
  blick: Blick
  phase: Phase
  laeuft: boolean
  tier: boolean
  /** Zeigt kurz ein Herz (Tier wurde angetippt). */
  reaktion?: boolean
}

interface Props {
  departmentCode: string
  /** Kantenlänge des Betriebsgrunds in Kacheln (siehe betrieb-land.ts). */
  seite: number
  items: PlatziertesItem[]
  className?: string
  ariaLabel?: string
  /** Sichtbarer Ausschnitt (Kamera); ohne Angabe die ganze Welt. */
  viewBox?: string
  svgRef?: React.Ref<SVGSVGElement>
  /** Kacheln, auf die das gewählte Item gesetzt werden kann (zart markiert). */
  freieKacheln?: { x: number; y: number }[]
  /** Gewähltes, bereits gesetztes Item (gestrichelter Ring um seine Kachel). */
  ausgewaehltId?: string | null
  /** Eben gesetztes Item: spielt einmal die Aufstell-Animation ab. */
  frischId?: string | null
  /** Frühere Landgröße: das seither neue Land blendet sich ein. */
  wachstumVon?: number | null
  /** Tiere, Gäste und Personal; ohne Angabe bleibt die Welt still. */
  figuren?: FigurAnzeige[]
}

/** Motiv je Fachbereich: Spedition hat vorne eine Erdstraße, Tourismus eine Sand-Promenade. */
const bodenCache = new Map<string, string>()
function bodenBild(departmentCode: string, art: BodenArt, variante: number): string {
  const key = `${departmentCode}${art}${variante}`
  let url = bodenCache.get(key)
  if (!url) {
    url = art === 'weg' ? (departmentCode === 'TOUR' ? sandUrl(variante) : wegUrl(variante)) : wieseUrl(variante)
    bodenCache.set(key, url)
  }
  return url
}

const RARITY_FARBE: Record<Exclude<HofRarity, 'standard'>, { stroke: string; fill: string }> = {
  selten: { stroke: '#1CB0F6', fill: 'rgba(28,176,246,0.22)' },
  episch: { stroke: '#FFD700', fill: 'rgba(255,215,0,0.26)' },
}

const f1 = (n: number) => Math.round(n * 10) / 10

/** Figuren sind etwas größer als ihre Zeichnung, damit sie auf dem Handy erkennbar bleiben. */
const FIGUR_SKALA = 1.3

function rautePunkte(mx: number, my: number, inset: number): string {
  return `${f1(mx)},${f1(my - TILE_H / 2 + inset)} ${f1(mx + TILE_W / 2 - inset * 2)},${f1(my)} ${f1(mx)},${f1(my + TILE_H / 2 - inset)} ${f1(mx - TILE_W / 2 + inset * 2)},${f1(my)}`
}

export function BetriebWelt({ departmentCode, seite, items, className, ariaLabel, viewBox, svgRef, freieKacheln, ausgewaehltId, frischId, wachstumVon, figuren }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const grenzen = weltGrenzen(seite)
  const kacheln = baueKacheln(seite)
  const zaun = baueZaun(seite)

  // Items außerhalb des Landes (z. B. veralteter Stand) werden nicht gezeichnet.
  const sichtbar = items.filter((i) => istImLand(i.x, i.y, seite))

  // Jedes verwendete Sprite einmal in defs, danach nur noch per use.
  const spriteIds = new Map<string, string>()
  const sprites = new Map<string, BetriebSprite>()
  for (const i of sichtbar) {
    const s = getBetriebSprite(departmentCode, i.iconKey)
    if (!spriteIds.has(s.key)) {
      spriteIds.set(s.key, `${uid}s${spriteIds.size}`)
      sprites.set(s.key, s)
    }
  }
  const bodenIds = new Map<string, string>()
  for (const k of kacheln) {
    const key = `${k.art}${k.variante}`
    if (!bodenIds.has(key)) bodenIds.set(key, `${uid}b${bodenIds.size}`)
  }

  type Objekt = { z: number; node: React.ReactNode }
  const objekte: Objekt[] = []

  for (const z of zaun) {
    const m = kachelMitte(z.gx, z.gy)
    objekte.push({
      z: tiefe(z.gx, z.gy) - 0.3,
      node: (
        <use
          key={`z${z.gx},${z.gy},${z.seite}`}
          href={`#${uid}z${z.seite}`}
          x={f1(m.x - TILE_W / 2)}
          y={f1(m.y - TILE_H / 2 - 14)}
          data-zaun={z.seite}
        />
      ),
    })
  }

  for (const i of sichtbar) {
    const s = getBetriebSprite(departmentCode, i.iconKey)
    const m = grundMitte(i.x, i.y)
    const rarity = i.rarity && i.rarity !== 'standard' ? i.rarity : null
    const gx = i.x + 1
    const gy = i.y + 1
    objekte.push({
      z: tiefe(gx, gy) + 0.1,
      node: (
        <g key={`i${i.id}`} data-item={i.id} className={frischId === i.id ? 'betrieb-plop' : undefined}>
          <title>{i.name}</title>
          {ausgewaehltId === i.id && (
            <polygon
              data-ausgewaehlt=""
              points={rautePunkte(m.x, m.y, 2)}
              fill="rgba(255,255,255,0.18)"
              stroke="#FFFFFF"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              strokeLinejoin="round"
            />
          )}
          {rarity && (
            <polygon
              data-rarity={rarity}
              points={`${f1(m.x)},${f1(m.y - TILE_H / 2 + 4)} ${f1(m.x + TILE_W / 2 - 8)},${f1(m.y)} ${f1(m.x)},${f1(m.y + TILE_H / 2 - 4)} ${f1(m.x - TILE_W / 2 + 8)},${f1(m.y)}`}
              fill={RARITY_FARBE[rarity].fill}
              stroke={RARITY_FARBE[rarity].stroke}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          <use
            href={`#${spriteIds.get(s.key)}`}
            x={f1(m.x - (s.w * s.skala) / 2)}
            y={f1(m.y + s.bottom * s.skala - s.h * s.skala)}
          />
        </g>
      ),
    })
  }
  // Figuren (PROJ-37): jedes Bild einmal in defs, Position per Transform (weiche Überblendung).
  const figurIds = new Map<string, { id: string; bild: ReturnType<typeof figurBild> }>()
  for (const f of figuren ?? []) {
    const key = `${f.art}|${f.blick}|${f.phase}`
    if (!figurIds.has(key)) figurIds.set(key, { id: `${uid}f${figurIds.size}`, bild: figurBild(f.art, f.blick, f.phase) })
  }
  for (const f of figuren ?? []) {
    const eintrag = figurIds.get(`${f.art}|${f.blick}|${f.phase}`)!
    const m = kachelMitte(f.x + 1, f.y + 1)
    objekte.push({
      z: tiefe(f.x + 1, f.y + 1) + 0.15,
      node: (
        <g
          key={`g${f.id}`}
          data-figur={f.id}
          data-tier={f.tier ? '' : undefined}
          style={{ transform: `translate(${f1(m.x)}px, ${f1(m.y)}px)`, transition: f.laeuft ? 'transform 150ms linear' : undefined }}
        >
          <use href={`#${eintrag.id}`} x={f1((-eintrag.bild.w * FIGUR_SKALA) / 2)} y={f1(-(eintrag.bild.h - eintrag.bild.fuss) * FIGUR_SKALA)} />
          {f.reaktion && (
            <text className="betrieb-herz" x={0} y={f1(-(eintrag.bild.h - eintrag.bild.fuss) * FIGUR_SKALA - 2)} textAnchor="middle" fontSize={16}>
              ❤
            </text>
          )}
        </g>
      ),
    })
  }
  objekte.sort((a, b) => a.z - b.z)

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox ?? `${f1(grenzen.minX)} ${f1(grenzen.minY)} ${f1(grenzen.breite)} ${f1(grenzen.hoehe)}`}
      className={className ?? 'block w-full h-auto'}
      role="img"
      aria-label={ariaLabel ?? `Isometrische Ansicht mit ${sichtbar.length} Gegenständen`}
    >
      <defs>
        {[...bodenIds.entries()].map(([key, id]) => {
          const art = key.startsWith('weg') ? 'weg' : 'wiese'
          const variante = Number(key.replace(/\D/g, ''))
          return <image key={id} id={id} href={bodenBild(departmentCode, art, variante)} width={TILE_W} height={TILE_H + 1} />
        })}
        <image id={`${uid}zx`} href={zaunWeissUrl('x')} width={TILE_W} height={TILE_H + 14} />
        <image id={`${uid}zy`} href={zaunWeissUrl('y')} width={TILE_W} height={TILE_H + 14} />
        {[...figurIds.values()].map(({ id, bild }) => (
          <image key={id} id={id} href={bild.url} width={f1(bild.w * FIGUR_SKALA)} height={f1(bild.h * FIGUR_SKALA)} />
        ))}
        {[...spriteIds.entries()].map(([key, id]) => {
          const sp = sprites.get(key)!
          return <image key={id} id={id} href={sp.url} width={f1(sp.w * sp.skala)} height={f1(sp.h * sp.skala)} />
        })}
      </defs>

      {kacheln.map((k) => {
        const m = kachelMitte(k.gx, k.gy)
        return (
          <use
            key={`k${k.gx},${k.gy}`}
            href={`#${bodenIds.get(`${k.art}${k.variante}`)}`}
            x={f1(m.x - TILE_W / 2)}
            y={f1(m.y - TILE_H / 2)}
            data-kachel=""
            className={wachstumVon != null && istNeueKachel(k.gx, k.gy, wachstumVon, seite) ? 'betrieb-wachse' : undefined}
          />
        )
      })}
      {freieKacheln?.map((k) => {
        const m = grundMitte(k.x, k.y)
        return (
          <polygon
            key={`f${k.x},${k.y}`}
            data-frei=""
            points={rautePunkte(m.x, m.y, 3)}
            fill="rgba(255,255,255,0.2)"
            stroke="#FFFFFF"
            strokeOpacity={0.75}
            strokeWidth={1.6}
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
        )
      })}
      {objekte.map((o) => o.node)}
    </svg>
  )
}
