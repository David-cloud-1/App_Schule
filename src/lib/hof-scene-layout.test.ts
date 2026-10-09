import { describe, it, expect } from 'vitest'
import {
  ITEM_SIZE,
  SCENE_WIDTH,
  SLOTS_PER_ROW,
  ZONE_ORDER,
  computeSceneLayout,
} from './hof-scene-layout'

const mk = (n: number, category: string, prefix = category) =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, category }))

describe('computeSceneLayout (PROJ-33)', () => {
  it('returns all four zones in fixed order, each with at least one row of slots, even without items', () => {
    const layout = computeSceneLayout([])
    expect(layout.zones.map((z) => z.category)).toEqual(ZONE_ORDER)
    for (const z of layout.zones) {
      expect(z.rows).toBe(1)
      expect(z.placed).toHaveLength(0)
      expect(z.empty).toHaveLength(SLOTS_PER_ROW)
    }
  })

  it('places items in their category zone and keeps the remaining slots as free places', () => {
    const layout = computeSceneLayout([...mk(2, 'fahrzeuge'), ...mk(1, 'abzeichen_trophaeen')])
    const veh = layout.zones.find((z) => z.category === 'fahrzeuge')!
    const tro = layout.zones.find((z) => z.category === 'abzeichen_trophaeen')!
    expect(veh.placed).toHaveLength(2)
    expect(veh.empty).toHaveLength(SLOTS_PER_ROW - 2)
    expect(tro.placed).toHaveLength(1)
    expect(layout.zones.find((z) => z.category === 'gebaeude_deko')!.placed).toHaveLength(0)
  })

  it('grows by whole rows when a zone holds more items than fit in one row (20 vehicles)', () => {
    const layout = computeSceneLayout(mk(20, 'fahrzeuge'))
    const veh = layout.zones.find((z) => z.category === 'fahrzeuge')!
    expect(veh.rows).toBe(Math.ceil(20 / SLOTS_PER_ROW))
    expect(veh.placed).toHaveLength(20)
    expect(veh.empty).toHaveLength(veh.rows * SLOTS_PER_ROW - 20)
    expect(layout.height).toBeGreaterThan(computeSceneLayout([]).height)
  })

  it('adds no extra empty row when the last row is exactly full, and one when it overflows by one', () => {
    expect(computeSceneLayout(mk(SLOTS_PER_ROW, 'fahrzeuge')).zones[1].rows).toBe(1)
    const over = computeSceneLayout(mk(SLOTS_PER_ROW + 1, 'fahrzeuge')).zones[1]
    expect(over.rows).toBe(2)
    expect(over.empty).toHaveLength(SLOTS_PER_ROW - 1)
  })

  it('never lets an item leave the scene horizontally (no overflow at any count)', () => {
    const layout = computeSceneLayout(mk(37, 'ladung_ausstattung'))
    for (const z of layout.zones) {
      for (const p of [...z.placed, ...z.empty]) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x + ITEM_SIZE).toBeLessThanOrEqual(SCENE_WIDTH)
      }
    }
  })

  it('stacks zones without gaps or overlaps and sums up to the scene height', () => {
    const layout = computeSceneLayout([...mk(7, 'fahrzeuge'), ...mk(11, 'gebaeude_deko')])
    let y = 0
    for (const z of layout.zones) {
      expect(z.y).toBe(y)
      y += z.height
    }
    expect(layout.height).toBe(y)
  })

  it('keeps every item exactly once and ignores items with an unknown category', () => {
    const items = [...mk(3, 'fahrzeuge'), { id: 'x', category: 'unbekannt' }, { id: 'y', category: '' }]
    const placedIds = computeSceneLayout(items).zones.flatMap((z) => z.placed.map((p) => p.item.id))
    expect(placedIds.sort()).toEqual(['fahrzeuge-0', 'fahrzeuge-1', 'fahrzeuge-2'])
  })

  it('is deterministic: same input gives the same positions', () => {
    const items = mk(8, 'fahrzeuge')
    expect(computeSceneLayout(items)).toEqual(computeSceneLayout(items))
  })
})
