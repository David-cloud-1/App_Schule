import { describe, it, expect } from 'vitest'
import { baueBetriebStand, type KaufZeile } from './betrieb-stand'
import { LAND_START, itemsBisNaechstemLand, landSeite } from './betrieb-land'

const kauf = (id: string, over: Partial<NonNullable<KaufZeile['shop_items']>> = {}, at = '2026-10-01T10:00:00Z'): KaufZeile => ({
  purchased_at: at,
  shop_items: {
    id,
    name: `Item ${id}`,
    description: 'd',
    icon: null,
    category: 'fahrzeuge',
    icon_key: 'pokal',
    price: 50,
    rarity_override: null,
    ...over,
  },
})

describe('Betriebs-Stand (PROJ-34)', () => {
  it('starts with the start land and everything in storage when nothing is placed', () => {
    const s = baueBetriebStand([kauf('a'), kauf('b')], [])
    expect(s.seite).toBe(LAND_START)
    expect(s.items).toHaveLength(2)
    expect(s.items.every((i) => i.x === null && i.y === null)).toBe(true)
  })

  it('marks placed items with their tile and leaves the rest in storage', () => {
    const s = baueBetriebStand([kauf('a'), kauf('b')], [{ item_id: 'a', x: 2, y: 1 }])
    expect(s.items.find((i) => i.id === 'a')).toMatchObject({ x: 2, y: 1 })
    expect(s.items.find((i) => i.id === 'b')).toMatchObject({ x: null, y: null })
  })

  it('grows the land with the number of purchases, counting deactivated ones too', () => {
    const viele = Array.from({ length: 7 }, (_, i) => kauf(`k${i}`))
    expect(baueBetriebStand(viele, []).seite).toBe(landSeite(7))
    expect(landSeite(7)).toBeGreaterThan(LAND_START)
  })

  it('ignores purchases whose catalogue row is missing (does not crash, does not count)', () => {
    const s = baueBetriebStand([kauf('a'), { purchased_at: '2026-10-01T11:00:00Z', shop_items: null }], [])
    expect(s.items).toHaveLength(1)
  })

  it('computes the rarity from the current price unless an admin value is set', () => {
    const s = baueBetriebStand(
      [kauf('a', { price: 300 }), kauf('b', { price: 40, rarity_override: 'episch' }), kauf('c', { price: 75 })],
      [],
    )
    expect(s.items.map((i) => i.rarity)).toEqual(['episch', 'episch', 'standard'])
  })

  it('treats a placement outside the land as storage instead of drawing it off-map', () => {
    const s = baueBetriebStand([kauf('a')], [{ item_id: 'a', x: 9, y: 9 }])
    expect(s.items[0]).toMatchObject({ x: null, y: null })
  })

  it('ignores placements of items the user does not own', () => {
    const s = baueBetriebStand([kauf('a')], [{ item_id: 'fremd', x: 0, y: 0 }])
    expect(s.items).toHaveLength(1)
    expect(s.items[0]).toMatchObject({ x: null })
  })

  it('orders items by purchase time and reports the purchases until the next land', () => {
    const s = baueBetriebStand([kauf('spaet', {}, '2026-10-03T00:00:00Z'), kauf('frueh', {}, '2026-10-01T00:00:00Z')], [])
    expect(s.items.map((i) => i.id)).toEqual(['frueh', 'spaet'])
    expect(s.bis_naechstes_land).toBe(itemsBisNaechstemLand(2))
  })

  it('reports no further growth at the maximum land', () => {
    const viele = Array.from({ length: 60 }, (_, i) => kauf(`k${i}`))
    expect(baueBetriebStand(viele, []).bis_naechstes_land).toBeNull()
  })

  it('marks animals as free-roaming: never stored, never placed, but they count for the land', () => {
    const s = baueBetriebStand([kauf('a'), kauf('hund', { icon_key: 'hofhund' }), kauf('krebs', { icon_key: 'krebs' })], [{ item_id: 'hund', x: 1, y: 1 }])
    const hund = s.items.find((i) => i.id === 'hund')!
    expect(hund.lebewesen).toBe(true)
    expect(hund.x).toBeNull() // auch ein (veralteter) Platzierungseintrag zählt nicht
    expect(s.items.find((i) => i.id === 'krebs')!.lebewesen).toBe(true)
    expect(s.items.find((i) => i.id === 'a')!.lebewesen).toBe(false)
    expect(s.seite).toBe(landSeite(3))
  })
})
