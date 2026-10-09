import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BetriebWelt, type PlatziertesItem } from './betrieb-welt'
import { gitterGroesse, weltGrenzen } from '@/lib/betrieb-welt'

const item = (over: Partial<PlatziertesItem> & { id: string }): PlatziertesItem => ({
  name: 'Item',
  iconKey: 'pokal',
  x: 0,
  y: 0,
  ...over,
})

describe('BetriebWelt (PROJ-34)', () => {
  it('draws every grid tile including the margin, once each', () => {
    const { container } = render(<BetriebWelt departmentCode="SPED" seite={4} items={[]} />)
    expect(container.querySelectorAll('[data-kachel]').length).toBe(gitterGroesse(4) ** 2)
  })

  it('fences exactly the two back edges', () => {
    const { container } = render(<BetriebWelt departmentCode="SPED" seite={5} items={[]} />)
    expect(container.querySelectorAll('[data-zaun="x"]').length).toBe(5)
    expect(container.querySelectorAll('[data-zaun="y"]').length).toBe(5)
  })

  it('sets the view box from the world bounds', () => {
    const { container } = render(<BetriebWelt departmentCode="SPED" seite={6} items={[]} />)
    const g = weltGrenzen(6)
    const vb = container.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number)
    expect(vb[0]).toBeCloseTo(g.minX, 0)
    expect(vb[1]).toBeCloseTo(g.minY, 0)
    expect(vb[2]).toBeCloseTo(g.breite, 0)
    expect(vb[3]).toBeCloseTo(g.hoehe, 0)
  })

  it('draws each placed item with its name as tooltip', () => {
    const { container } = render(
      <BetriebWelt
        departmentCode="SPED"
        seite={4}
        items={[item({ id: 'a', name: 'Pokal', x: 1, y: 1 }), item({ id: 'b', name: 'Lagerhalle', iconKey: 'lagerhalle', x: 2, y: 0 })]}
      />,
    )
    expect(container.querySelectorAll('[data-item]').length).toBe(2)
    expect([...container.querySelectorAll('title')].map((t) => t.textContent).sort()).toEqual(['Lagerhalle', 'Pokal'])
  })

  it('defines each sprite only once even when many items share it', () => {
    const items = Array.from({ length: 8 }, (_, i) => item({ id: `p${i}`, x: i % 4, y: Math.floor(i / 4) }))
    const { container } = render(<BetriebWelt departmentCode="SPED" seite={4} items={items} />)
    expect(container.querySelectorAll('[data-item] use').length).toBe(8)
    const defs = [...container.querySelectorAll('defs image')].filter((i) => i.id.includes('s'))
    // 2 Zaunbilder + Bodenbilder + genau 1 Sprite
    const spriteDefs = defs.filter((i) => /s\d+$/.test(i.id))
    expect(spriteDefs.length).toBe(1)
  })

  it('shows a placeholder for items without a sprite instead of dropping them', () => {
    const { container } = render(
      <BetriebWelt departmentCode="TOUR" seite={4} items={[item({ id: 'x', iconKey: 'flugzeug', x: 1, y: 1 })]} />,
    )
    expect(container.querySelectorAll('[data-item]').length).toBe(1)
  })

  it('does not draw items outside the land (stale state) and does not crash', () => {
    const { container } = render(
      <BetriebWelt
        departmentCode="SPED"
        seite={4}
        items={[item({ id: 'in', x: 3, y: 3 }), item({ id: 'out1', x: 4, y: 0 }), item({ id: 'out2', x: -1, y: 2 })]}
      />,
    )
    expect(container.querySelectorAll('[data-item]').length).toBe(1)
  })

  it('draws rare and epic items with a coloured marker, standard without', () => {
    const { container } = render(
      <BetriebWelt
        departmentCode="SPED"
        seite={4}
        items={[
          item({ id: '1', rarity: 'selten', x: 0, y: 0 }),
          item({ id: '2', rarity: 'episch', x: 1, y: 0 }),
          item({ id: '3', rarity: 'standard', x: 2, y: 0 }),
          item({ id: '4', x: 3, y: 0 }),
        ]}
      />,
    )
    expect(container.querySelectorAll('[data-rarity="selten"]').length).toBe(1)
    expect(container.querySelectorAll('[data-rarity="episch"]').length).toBe(1)
    expect(container.querySelectorAll('polygon[data-rarity]').length).toBe(2)
  })

  it('draws items from back to front so nearer items cover farther ones', () => {
    const { container } = render(
      <BetriebWelt
        departmentCode="SPED"
        seite={4}
        items={[item({ id: 'vorn', x: 3, y: 3 }), item({ id: 'hinten', x: 0, y: 0 })]}
      />,
    )
    const reihenfolge = [...container.querySelectorAll('[data-item]')].map((e) => e.getAttribute('data-item'))
    expect(reihenfolge).toEqual(['hinten', 'vorn'])
  })

  it('draws the fence behind an item on the same back tile', () => {
    const { container } = render(<BetriebWelt departmentCode="SPED" seite={4} items={[item({ id: 'hinten', x: 0, y: 0 })]} />)
    const kinder = [...container.querySelectorAll('svg > *')]
    const zaunIndex = kinder.findIndex((e) => e.getAttribute('data-zaun') === 'y')
    const itemIndex = kinder.findIndex((e) => e.getAttribute('data-item') === 'hinten')
    expect(zaunIndex).toBeGreaterThan(-1)
    expect(zaunIndex).toBeLessThan(itemIndex)
  })

  it('has an accessible label and allows overriding it', () => {
    const a = render(<BetriebWelt departmentCode="SPED" seite={4} items={[item({ id: '1' })]} />)
    expect(a.container.querySelector('svg')!.getAttribute('role')).toBe('img')
    expect(a.container.querySelector('svg')!.getAttribute('aria-label')).toContain('1')
    a.unmount()
    const b = render(<BetriebWelt departmentCode="SPED" seite={4} items={[]} ariaLabel="Mein Betrieb" />)
    expect(b.container.querySelector('svg')!.getAttribute('aria-label')).toBe('Mein Betrieb')
  })

  it('keeps ids unique when two worlds are on one page (preview + main view)', () => {
    const a = render(<BetriebWelt departmentCode="SPED" seite={4} items={[item({ id: '1' })]} />)
    const b = render(<BetriebWelt departmentCode="SPED" seite={4} items={[item({ id: '1' })]} />)
    const ids = [...a.container.querySelectorAll('[id]'), ...b.container.querySelectorAll('[id]')].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses a given view box (camera) instead of the whole world', () => {
    const { container } = render(<BetriebWelt departmentCode="SPED" seite={4} items={[]} viewBox="10 20 300 200" />)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('10 20 300 200')
  })

  it('marks the given free tiles and the selected item', () => {
    const { container } = render(
      <BetriebWelt
        departmentCode="SPED"
        seite={4}
        items={[item({ id: 'a', x: 1, y: 1 })]}
        freieKacheln={[{ x: 0, y: 0 }, { x: 2, y: 2 }]}
        ausgewaehltId="a"
      />,
    )
    expect(container.querySelectorAll('[data-frei]').length).toBe(2)
    expect(container.querySelectorAll('[data-ausgewaehlt]').length).toBe(1)
  })

  it('draws no markers by default', () => {
    const { container } = render(<BetriebWelt departmentCode="SPED" seite={4} items={[item({ id: 'a' })]} />)
    expect(container.querySelectorAll('[data-frei]').length).toBe(0)
    expect(container.querySelectorAll('[data-ausgewaehlt]').length).toBe(0)
  })
})
