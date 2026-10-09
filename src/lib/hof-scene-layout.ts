import type { HofCategory } from './hof-icons'
import type { HofRarity } from './hof-rarity'

/**
 * Layout der Hof-Illustration (PROJ-33) — reine Berechnung ohne React, damit
 * sie sich testen lässt. Die Szene ist ein einziges SVG mit fester Breite
 * (viewBox) und skaliert per CSS mit der Bildschirmbreite. Positionen werden
 * nie gespeichert, sondern bei jedem Rendern aus Kategorie und Reihenfolge
 * der gekauften Items berechnet.
 */

/** Ein gekauftes Item, wie es die Hof-Galerie aus /api/shop/items bekommt. */
export interface OwnedHofItem {
  id: string
  name: string
  description: string
  category: HofCategory | ''
  icon_key: string
  icon?: string | null
  /** Berechnet vom Server (PROJ-32); fehlt der Wert, gilt Standard. */
  rarity?: HofRarity
}

export const SCENE_WIDTH = 360
export const ITEM_SIZE = 72
export const SLOT_PITCH = 88
export const SLOTS_PER_ROW = 4
export const ROW_HEIGHT = 98
const SLOTS_LEFT = (SCENE_WIDTH - (SLOTS_PER_ROW - 1) * SLOT_PITCH - ITEM_SIZE) / 2

/** Zonen von oben nach unten. */
export const ZONE_ORDER: HofCategory[] = ['gebaeude_deko', 'fahrzeuge', 'ladung_ausstattung', 'abzeichen_trophaeen']

/** Freier Platz oberhalb der ersten Reihe je Zone (Himmel/Kulisse bzw. Beschriftung). */
export const ZONE_TOP_PAD: Record<HofCategory, number> = {
  gebaeude_deko: 64,
  fahrzeuge: 34,
  ladung_ausstattung: 34,
  abzeichen_trophaeen: 34,
}
export const ZONE_BOTTOM_PAD = 8

export interface Slot {
  /** Obere linke Ecke der Item-Fläche, relativ zur Zone. */
  x: number
  y: number
}

export interface PlacedItem<T> extends Slot {
  item: T
}

export interface ZoneLayout<T> {
  category: HofCategory
  /** Obere Kante der Zone in der Szene. */
  y: number
  height: number
  rows: number
  placed: PlacedItem<T>[]
  /** Noch freie Plätze (dezente Platzhalter). */
  empty: Slot[]
  /** Oberkante jeder Reihe relativ zur Zone (für Regalbretter, Fahrspuren …). */
  rowTops: number[]
}

export interface SceneLayout<T> {
  width: number
  height: number
  zones: ZoneLayout<T>[]
}

function slotAt(index: number, topPad: number): Slot {
  const row = Math.floor(index / SLOTS_PER_ROW)
  const col = index % SLOTS_PER_ROW
  return { x: SLOTS_LEFT + col * SLOT_PITCH, y: topPad + row * ROW_HEIGHT }
}

/**
 * Verteilt die Items nach Kategorie auf Plätze. Jede Zone hat mindestens eine
 * volle Reihe; wächst die Zahl der Items über eine Reihe hinaus, kommen
 * weitere Reihen dazu und die Szene wird höher — nichts wird abgeschnitten.
 */
export function computeSceneLayout<T extends { category: string }>(items: T[]): SceneLayout<T> {
  let y = 0
  const zones: ZoneLayout<T>[] = ZONE_ORDER.map((category) => {
    const own = items.filter((i) => i.category === category)
    const topPad = ZONE_TOP_PAD[category]
    const rows = Math.max(1, Math.ceil(own.length / SLOTS_PER_ROW))
    const totalSlots = rows * SLOTS_PER_ROW

    const placed = own.map((item, i) => ({ item, ...slotAt(i, topPad) }))
    const empty: Slot[] = []
    for (let i = own.length; i < totalSlots; i++) empty.push(slotAt(i, topPad))
    const rowTops = Array.from({ length: rows }, (_, r) => topPad + r * ROW_HEIGHT)

    const height = topPad + rows * ROW_HEIGHT + ZONE_BOTTOM_PAD
    const zone: ZoneLayout<T> = { category, y, height, rows, placed, empty, rowTops }
    y += height
    return zone
  })

  return { width: SCENE_WIDTH, height: y, zones }
}
