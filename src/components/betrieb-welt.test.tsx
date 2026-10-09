import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BetriebWelt, type FigurAnzeige, type PlatziertesItem } from './betrieb-welt'
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
      <BetriebWelt departmentCode="SPED" seite={4} items={[item({ id: 'x', iconKey: 'gibt-es-nicht', x: 1, y: 1 })]} />,
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

  it('plays the placement animation only on the freshly placed item', () => {
    const { container } = render(
      <BetriebWelt departmentCode="SPED" seite={4} items={[item({ id: 'a', x: 0, y: 0 }), item({ id: 'b', x: 1, y: 0 })]} frischId="b" />,
    )
    expect(container.querySelector('[data-item="b"]')!.getAttribute('class')).toContain('betrieb-plop')
    expect(container.querySelector('[data-item="a"]')!.getAttribute('class')).toBeNull()
  })

  it('fades in only the newly grown land tiles', () => {
    const { container } = render(<BetriebWelt departmentCode="SPED" seite={5} items={[]} wachstumVon={4} />)
    expect(container.querySelectorAll('.betrieb-wachse').length).toBe(5 * 5 - 4 * 4)
    const ohne = render(<BetriebWelt departmentCode="SPED" seite={5} items={[]} />)
    expect(ohne.container.querySelectorAll('.betrieb-wachse').length).toBe(0)
  })

  it('uses a sand promenade instead of the dirt road for Tourismus (PROJ-35)', () => {
    const sped = render(<BetriebWelt departmentCode="SPED" seite={4} items={[]} />)
    const tour = render(<BetriebWelt departmentCode="TOUR" seite={4} items={[]} />)
    const hrefs = (c: HTMLElement) => new Set([...c.querySelectorAll('defs image')].map((i) => i.getAttribute('href')))
    const a = hrefs(sped.container)
    const b = hrefs(tour.container)
    // Wiese und Zaun gleich, die Randgestaltung vorne unterscheidet sich
    expect([...b].filter((h) => !a.has(h)).length).toBeGreaterThan(0)
    expect([...a].filter((h) => b.has(h)).length).toBeGreaterThan(0)
  })

  it('draws Tourismus items with their own sprites (no placeholder)', () => {
    const { container } = render(
      <BetriebWelt departmentCode="TOUR" seite={4} items={[item({ id: 'p', iconKey: 'pool', x: 1, y: 1 }), item({ id: 'h', iconKey: 'hotel', x: 2, y: 2 })]} />,
    )
    expect(container.querySelectorAll('[data-item]').length).toBe(2)
    const sprites = [...container.querySelectorAll('defs image')].filter((i) => /s\d+$/.test(i.id))
    expect(sprites.length).toBe(2)
  })

  describe('Figuren (PROJ-37)', () => {
    const fig = (over: Partial<FigurAnzeige> & { id: string }): FigurAnzeige => ({
      art: 'hund',
      x: 1,
      y: 1,
      blick: 'rechts',
      phase: 0,
      laeuft: false,
      tier: true,
      ...over,
    })

    it('draws no figures by default (preview stays still)', () => {
      const { container } = render(<BetriebWelt departmentCode="SPED" seite={4} items={[]} />)
      expect(container.querySelectorAll('[data-figur]').length).toBe(0)
    })

    it('draws each figure once and marks animals', () => {
      const { container } = render(
        <BetriebWelt departmentCode="SPED" seite={4} items={[]} figuren={[fig({ id: 'a' }), fig({ id: 'b', art: 'arbeiter', tier: false, x: 2, y: 2 })]} />,
      )
      expect(container.querySelectorAll('[data-figur]').length).toBe(2)
      expect(container.querySelectorAll('[data-tier]').length).toBe(1)
    })

    it('defines each figure picture only once, however many figures share it', () => {
      const viele = Array.from({ length: 6 }, (_, i) => fig({ id: `h${i}`, x: i % 4, y: Math.floor(i / 4) }))
      const { container } = render(<BetriebWelt departmentCode="SPED" seite={4} items={[]} figuren={viele} />)
      expect(container.querySelectorAll('[data-figur] use').length).toBe(6)
      const defs = [...container.querySelectorAll('defs image')].filter((i) => /f\d+$/.test(i.id))
      expect(defs.length).toBe(1)
    })

    it('draws a figure behind a building that stands in front of it, and in front of one behind it', () => {
      const { container } = render(
        <BetriebWelt
          departmentCode="SPED"
          seite={5}
          items={[item({ id: 'haus', iconKey: 'lagerhalle', x: 2, y: 2 })]}
          figuren={[fig({ id: 'hinten', x: 1, y: 1 }), fig({ id: 'vorn', x: 3, y: 3 })]}
        />,
      )
      const reihenfolge = [...container.querySelectorAll('svg > [data-item], svg > [data-figur]')].map((e) => e.getAttribute('data-item') ?? e.getAttribute('data-figur'))
      expect(reihenfolge).toEqual(['hinten', 'haus', 'vorn'])
    })

    it('places a figure between two tiles by interpolating its position', () => {
      const a = render(<BetriebWelt departmentCode="SPED" seite={4} items={[]} figuren={[fig({ id: 'x', x: 1, y: 1 })]} />)
      const b = render(<BetriebWelt departmentCode="SPED" seite={4} items={[]} figuren={[fig({ id: 'x', x: 2, y: 1 })]} />)
      const c = render(<BetriebWelt departmentCode="SPED" seite={4} items={[]} figuren={[fig({ id: 'x', x: 1.5, y: 1 })]} />)
      const tx = (el: HTMLElement) => Number(/translate\(([-\d.]+)px/.exec(el.querySelector<SVGGElement>('[data-figur]')!.getAttribute('style')!)![1])
      expect(Math.abs(tx(c.container) - (tx(a.container) + tx(b.container)) / 2)).toBeLessThan(0.2)
    })

    it('shows a heart only for the figure that was just tapped', () => {
      const { container } = render(
        <BetriebWelt departmentCode="SPED" seite={4} items={[]} figuren={[fig({ id: 'a', reaktion: true }), fig({ id: 'b', x: 2 })]} />,
      )
      expect(container.querySelectorAll('.betrieb-herz').length).toBe(1)
    })

    it('smooths walking with a short transition only while the figure walks', () => {
      const { container } = render(
        <BetriebWelt departmentCode="SPED" seite={4} items={[]} figuren={[fig({ id: 'geht', laeuft: true }), fig({ id: 'steht', x: 2 })]} />,
      )
      const style = (id: string) => container.querySelector(`[data-figur="${id}"]`)!.getAttribute('style')!
      expect(style('geht')).toContain('transition')
      expect(style('steht')).not.toContain('transition')
    })
  })
})
