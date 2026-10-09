import { itemsBisNaechstemLand, istImLand, landSeite } from './betrieb-land'
import { getEffectiveRarity, type HofRarity } from './hof-rarity'
import { istTierSchluessel } from './betrieb-figuren'

/**
 * Stand von „Mein Betrieb" (PROJ-34): welche Items gehören dem Azubi, welche
 * stehen auf einer Kachel, welche liegen im Lager, wie groß ist das Land.
 * Reine Berechnung aus den Datenbankzeilen, damit sie ohne Datenbank testbar
 * ist und Server und Browser nie unterschiedlich rechnen.
 */

export interface KaufZeile {
  purchased_at: string
  shop_items: {
    id: string
    name: string
    description: string
    icon: string | null
    category: string
    icon_key: string
    price: number
    rarity_override: string | null
  } | null
}

export interface PlatzierungsZeile {
  item_id: string
  x: number
  y: number
}

export interface BetriebItem {
  id: string
  name: string
  description: string
  category: string
  icon_key: string
  icon: string | null
  rarity: HofRarity
  /** null = liegt im Lager (oder läuft frei, siehe `lebewesen`) */
  x: number | null
  y: number | null
  /** Tiere werden nicht gesetzt: sie laufen frei im Gelände und liegen nie im Lager (PROJ-37). */
  lebewesen: boolean
}

export interface BetriebStand {
  /** Kantenlänge des Betriebsgrunds in Kacheln. */
  seite: number
  items: BetriebItem[]
  /** Käufe bis zur nächsten Landerweiterung; null = größtes Land erreicht. */
  bis_naechstes_land: number | null
}

export function baueBetriebStand(kaeufe: KaufZeile[], platzierungen: PlatzierungsZeile[]): BetriebStand {
  // Jeder Kauf zählt für das Land – auch von Items, die der Admin später deaktiviert hat.
  const gueltig = kaeufe.filter((k): k is KaufZeile & { shop_items: NonNullable<KaufZeile['shop_items']> } => k.shop_items != null)
  const seite = landSeite(gueltig.length)
  const platz = new Map(platzierungen.map((p) => [p.item_id, p]))

  const items = [...gueltig]
    .sort((a, b) => a.purchased_at.localeCompare(b.purchased_at))
    .map(({ shop_items: it }): BetriebItem => {
      const tier = istTierSchluessel(it.icon_key)
      const p = tier ? undefined : platz.get(it.id)
      const steht = p != null && istImLand(p.x, p.y, seite)
      return {
        id: it.id,
        name: it.name,
        description: it.description,
        category: it.category,
        icon_key: it.icon_key,
        icon: it.icon,
        rarity: getEffectiveRarity(it.price, it.rarity_override),
        x: steht ? p.x : null,
        y: steht ? p.y : null,
        lebewesen: tier,
      }
    })

  return { seite, items, bis_naechstes_land: itemsBisNaechstemLand(gueltig.length) }
}
