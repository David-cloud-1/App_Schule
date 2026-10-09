import { describe, it, expect } from 'vitest'
import { itemAnPunkt, spriteFlaeche, type TrefferItem } from './betrieb-treffer'
import { grundMitte } from './betrieb-welt'

const sprite = { w: 132, h: 100, bottom: 25, skala: 1.2 }
const item = (id: string, x: number, y: number): TrefferItem => ({ id, x, y, sprite })

describe('Treffererkennung (PROJ-34)', () => {
  it('finds an item when tapping its tile centre', () => {
    const m = grundMitte(2, 1)
    expect(itemAnPunkt([item('a', 2, 1)], m.x, m.y)).toBe('a')
  })

  it('finds a tall building when tapping its roof, above its own tile', () => {
    const m = grundMitte(2, 1)
    expect(itemAnPunkt([item('a', 2, 1)], m.x, m.y - 70)).toBe('a')
  })

  it('returns null on empty ground', () => {
    const m = grundMitte(0, 0)
    expect(itemAnPunkt([item('a', 3, 3)], m.x, m.y)).toBeNull()
    expect(itemAnPunkt([], 0, 0)).toBeNull()
  })

  it('ignores the transparent margin of a sprite', () => {
    const m = grundMitte(2, 1)
    const f = spriteFlaeche(item('a', 2, 1))
    expect(itemAnPunkt([item('a', 2, 1)], f.left - 5, m.y)).toBeNull()
    expect(itemAnPunkt([item('a', 2, 1)], f.right + 5, m.y)).toBeNull()
  })

  it('prefers the item in front when sprites overlap', () => {
    const hinten = item('hinten', 1, 1)
    const vorn = item('vorn', 2, 2)
    const m = grundMitte(2, 2)
    // Punkt liegt in beiden Sprite-Flächen; vorn gewinnt unabhängig von der Listenreihenfolge
    expect(itemAnPunkt([hinten, vorn], m.x, m.y - 40)).toBe('vorn')
    expect(itemAnPunkt([vorn, hinten], m.x, m.y - 40)).toBe('vorn')
  })
})
