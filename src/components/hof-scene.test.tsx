import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HofScene } from './hof-scene'
import { getSceneTheme } from './hof-scene-themes'
import { SLOTS_PER_ROW, computeSceneLayout, type OwnedHofItem } from '@/lib/hof-scene-layout'

const item = (over: Partial<OwnedHofItem> & { id: string }): OwnedHofItem => ({
  name: 'Item',
  description: '',
  category: 'fahrzeuge',
  icon_key: '',
  ...over,
})

const viewBoxHeight = (container: HTMLElement) =>
  Number(container.querySelector('svg')!.getAttribute('viewBox')!.split(' ')[3])

describe('HofScene (PROJ-33)', () => {
  it('is one decorative svg, hidden from screen readers', () => {
    const { container } = render(<HofScene departmentCode="SPED" items={[item({ id: '1' })]} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 360 \d+$/)
    expect(svg.getAttribute('class')).toContain('w-full')
  })

  it('always shows all four zones with the department wording, also without items in a zone', () => {
    const { container } = render(<HofScene departmentCode="TOUR" items={[item({ id: '1', icon_key: 'flugzeug' })]} />)
    const text = container.textContent!
    for (const label of ['TRANSFER', 'GEBÄUDE & FREIZEIT', 'AUSSTATTUNG & DEKO', 'ABZEICHEN & TROPHÄEN']) {
      expect(text).toContain(label)
    }
    expect(text).not.toContain('FAHRZEUGE')
  })

  it('uses the Spedition wording for Spedition', () => {
    const { container } = render(<HofScene departmentCode="SPED" items={[item({ id: '1' })]} />)
    expect(container.textContent).toContain('FAHRZEUGE')
    expect(container.textContent).toContain('GEBÄUDE & HOF-DEKO')
    expect(container.textContent).not.toContain('TRANSFER')
  })

  it('draws each item with its illustration and a name tooltip', () => {
    const { container } = render(
      <HofScene departmentCode="SPED" items={[item({ id: '1', name: 'Roter Sattelschlepper', icon_key: 'sattelschlepper-rot' })]} />,
    )
    expect(screen.getByText('Roter Sattelschlepper').tagName.toLowerCase()).toBe('title')
    // Szene-SVG + genau ein verschachteltes Icon-SVG
    expect(container.querySelectorAll('svg').length).toBe(2)
  })

  it('shows free places as dashed placeholders that fill the rest of each row', () => {
    const { container } = render(<HofScene departmentCode="SPED" items={[item({ id: '1' }), item({ id: '2' })]} />)
    const free = container.querySelectorAll('rect[stroke-dasharray="4 4"]')
    // 4 Zonen mit je einer Reihe, davon 2 Plätze belegt
    expect(free.length).toBe(4 * SLOTS_PER_ROW - 2)
  })

  it('falls back to the legacy emoji, then to a generic box, when an illustration cannot be resolved', () => {
    const { container } = render(
      <HofScene
        departmentCode="SPED"
        items={[
          item({ id: '1', name: 'Alt', icon_key: 'gibt-es-nicht', icon: '🎒' }),
          item({ id: '2', name: 'Ohne', icon_key: '', icon: null }),
        ]}
      />,
    )
    const emojis = [...container.querySelectorAll('text')].map((t) => t.textContent)
    expect(emojis).toContain('🎒')
    expect(emojis).toContain('📦')
  })

  it('grows taller instead of cutting items off when a zone holds many (20 vehicles)', () => {
    const few = render(<HofScene departmentCode="TOUR" items={[item({ id: '1' })]} />)
    const hFew = viewBoxHeight(few.container)
    few.unmount()
    const many = render(
      <HofScene departmentCode="TOUR" items={Array.from({ length: 20 }, (_, i) => item({ id: `m${i}`, icon_key: 'reisebus' }))} />,
    )
    expect(viewBoxHeight(many.container)).toBeGreaterThan(hFew)
    expect(many.container.querySelectorAll('title').length).toBe(20)
  })

  it('shows rare and epic items with a ring and a text label, never colour only (PROJ-32)', () => {
    const { container } = render(
      <HofScene
        departmentCode="SPED"
        items={[
          item({ id: '1', rarity: 'selten' }),
          item({ id: '2', rarity: 'episch' }),
          item({ id: '3', rarity: 'standard' }),
          item({ id: '4' }),
        ]}
      />,
    )
    expect(container.querySelectorAll('[data-rarity="selten"]').length).toBe(1)
    expect(container.querySelectorAll('[data-rarity="episch"]').length).toBe(1)
    expect(container.textContent).toContain('SELTEN')
    expect(container.textContent).toContain('EPISCH')
  })

  it('gives only epic items the one-time shimmer, which is clipped to the item frame', () => {
    const { container } = render(
      <HofScene departmentCode="SPED" items={[item({ id: '1', rarity: 'selten' }), item({ id: '2', rarity: 'episch' })]} />,
    )
    expect(container.querySelectorAll('.hof-shimmer-svg').length).toBe(1)
    expect(container.querySelectorAll('clipPath').length).toBe(1)
  })

  it('keeps clip ids unique per item so two scenes on one page cannot collide', () => {
    const a = render(<HofScene departmentCode="SPED" items={[item({ id: 'a', rarity: 'episch' })]} />)
    const b = render(<HofScene departmentCode="SPED" items={[item({ id: 'a', rarity: 'episch' })]} />)
    const ids = [...a.container.querySelectorAll('clipPath'), ...b.container.querySelectorAll('clipPath')].map((c) => c.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('places every item in the zone of its current category (moved items follow)', () => {
    const items = [item({ id: '1', category: 'abzeichen_trophaeen' }), item({ id: '2', category: 'gebaeude_deko' })]
    const layout = computeSceneLayout(items)
    expect(layout.zones.find((z) => z.category === 'abzeichen_trophaeen')!.placed.map((p) => p.item.id)).toEqual(['1'])
    expect(layout.zones.find((z) => z.category === 'gebaeude_deko')!.placed.map((p) => p.item.id)).toEqual(['2'])
  })
})

describe('Szenen-Motive (PROJ-33)', () => {
  it('has its own theme per department and falls back to a neutral one for unknown departments', () => {
    expect(getSceneTheme('TOUR')).not.toBe(getSceneTheme('SPED'))
    expect(getSceneTheme('GIBT_ES_NICHT')).toBe(getSceneTheme('SPED'))
  })

  it('draws a shelf only in the trophy zone', () => {
    const theme = getSceneTheme('SPED')
    expect(theme.zones.abzeichen_trophaeen.shelf).toBe(true)
    expect(theme.zones.fahrzeuge.shelf).toBeFalsy()
  })
})
