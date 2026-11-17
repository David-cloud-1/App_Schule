import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { trefferIndex } from '@/components/werkzeugkiste/editor/bild-beschriften'
import { MarkenSvg, markenHoehe } from '@/components/werkzeugkiste/editor/marken-svg'
import { bereinigeMarken } from '@/lib/werkzeugkiste-bild-block'

describe('Markierungen: Treffer unter dem Zeiger (PROJ-106)', () => {
  const marken = bereinigeMarken([
    { art: 'rechteck', x: 10, y: 10, x2: 40, y2: 40 },
    { art: 'nummer', x: 70, y: 70 },
    { art: 'pfeil', x: 50, y: 10, x2: 90, y2: 10 },
    { art: 'text', x: 5, y: 85, text: 'Auflieger' },
  ])
  const hoehe = markenHoehe(4, 3)

  it('findet die Markierung unter dem Zeiger, sonst -1', () => {
    expect(trefferIndex(marken, 25, 25, hoehe)).toBe(0)
    expect(trefferIndex(marken, 70, 70, hoehe)).toBe(1)
    expect(trefferIndex(marken, 70, 10.5, hoehe)).toBe(2)
    expect(trefferIndex(marken, 10, 87, hoehe)).toBe(3)
    expect(trefferIndex(marken, 60, 40, hoehe)).toBe(-1)
  })

  it('die oberste (zuletzt gezeichnete) Markierung gewinnt; ausgeblendete zählen nicht', () => {
    const doppelt = bereinigeMarken([
      { art: 'marker', x: 0, y: 0, x2: 50, y2: 50 },
      { art: 'kreis', x: 0, y: 0, x2: 50, y2: 50 },
    ])
    expect(trefferIndex(doppelt, 25, 25, hoehe)).toBe(1)
    const aus = bereinigeMarken([{ art: 'nummer', x: 50, y: 50, aus: true }])
    expect(trefferIndex(aus, 50, 50, hoehe)).toBe(-1)
  })
})

describe('MarkenSvg', () => {
  it('zeichnet alle sichtbaren Markierungen mit fortlaufenden Nummern und lässt ausgeblendete weg', () => {
    const marken = bereinigeMarken([
      { art: 'nummer', x: 10, y: 10 },
      { art: 'nummer', x: 20, y: 20, aus: true },
      { art: 'nummer', x: 30, y: 30 },
      { art: 'text', x: 5, y: 5, text: '<b>x</b>' },
    ])
    const { container } = render(<MarkenSvg marken={marken} bildBreite={40} bildHoehe={20} />)
    const zahlen = [...container.querySelectorAll('text')].map((t) => t.textContent)
    expect(zahlen).toEqual(['1', '2', '<b>x</b>'])
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 1000 500')
    // Text bleibt Text, nie Markup
    expect(container.querySelector('b')).toBeNull()
  })

  it('markiert die gewählte Markierung mit einem Auswahlrahmen', () => {
    const marken = bereinigeMarken([{ art: 'kreis', x: 10, y: 10, x2: 30, y2: 30 }])
    const { container } = render(<MarkenSvg marken={marken} bildBreite={4} bildHoehe={3} auswahl={0} />)
    expect(container.querySelector('rect[stroke-dasharray]')).not.toBeNull()
  })
})
