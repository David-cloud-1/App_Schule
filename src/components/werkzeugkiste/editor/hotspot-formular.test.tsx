import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HotspotFormular } from './editor-formulare-katalog'

vi.mock('@/components/werkzeugkiste/editor/material-bilder', () => ({
  useGrossesBild: () => 'data:image/png;base64,AA==',
  useMaterialBilder: () => ({ materialId: 'x', stand: 0, bilder: [], mehr: false, anfordern: () => {}, gross: () => Promise.reject(new Error('x')), skript: null, verwendet: new Set(), seitenGroesse: 0, eigenesHinzufuegen: () => {} }),
  bildName: (p: string) => p,
}))
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.setPointerCapture = () => {}

const BLOCK = {
  type: 'hotspot',
  path: 'images/a.png',
  alt: 'Ein LKW',
  description: 'Wo ist das Aggregat?',
  eigenesFeld: 'bleibt',
  bereiche: [{ art: 'kreis', x: 10, y: 10, x2: 30, y2: 30, richtig: true, label: 'Aggregat', feedback: 'Genau' }],
}

const letzter = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)!

describe('Formular „Stelle im Bild finden“ (PROJ-107)', () => {
  it('zeigt Aufgabe, Alternativtext und die Bereiche samt Rückmeldung', () => {
    render(<HotspotFormular block={BLOCK} onChange={vi.fn()} />)
    expect((screen.getByLabelText(/^Aufgabe/) as HTMLInputElement).value).toBe('Wo ist das Aggregat?')
    expect((screen.getByLabelText(/^Beschreibung 1/) as HTMLInputElement).value).toBe('Aggregat')
    expect((screen.getByLabelText(/^Rückmeldung 1/) as HTMLTextAreaElement | HTMLInputElement).value).toBe('Genau')
    expect(screen.getByRole('switch', { name: 'Bereich 1 ist richtig' })).toBeChecked()
  })

  it('warnt, solange kein Bereich als richtig gesetzt ist', () => {
    const block = { ...BLOCK, bereiche: [{ ...BLOCK.bereiche[0], richtig: false }] }
    render(<HotspotFormular block={block} onChange={vi.fn()} />)
    expect(screen.getByRole('status').textContent).toContain('Mindestens ein Bereich')
  })

  it('„Richtig“ umschalten und Rückmeldung ändern, unbekannte Felder bleiben', () => {
    const onChange = vi.fn()
    render(<HotspotFormular block={BLOCK} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Bereich 1 ist richtig' }))
    let [neu] = letzter(onChange)
    expect(neu.bereiche[0].richtig).toBe(false)
    expect(neu.eigenesFeld).toBe('bleibt')
    fireEvent.change(screen.getByLabelText(/^Rückmeldung 1/), { target: { value: 'Sehr gut' } })
    ;[neu] = letzter(onChange)
    expect(neu.bereiche[0].feedback).toBe('Sehr gut')
  })

  it('fügt einen Bereich hinzu; der erste ist richtig, weitere sind es nicht', () => {
    const onChange = vi.fn()
    render(<HotspotFormular block={{ ...BLOCK, bereiche: [] }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Bereich hinzufügen/ }))
    expect(letzter(onChange)[0].bereiche).toHaveLength(1)
    expect(letzter(onChange)[0].bereiche[0].richtig).toBe(true)
  })

  it('zeichnet den gewählten Bereich durch Ziehen auf dem Bild (Rahmen in Prozent, in jeder Richtung)', () => {
    const onChange = vi.fn()
    render(<HotspotFormular block={BLOCK} onChange={onChange} />)
    const flaeche = screen.getByTestId('bereich-flaeche')
    flaeche.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0, toJSON() {} }) as DOMRect
    fireEvent.pointerDown(flaeche, { clientX: 200, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(flaeche, { clientX: 100, clientY: 20, pointerId: 1 })
    const [neu, feld] = letzter(onChange)
    expect(feld).toBe('rahmen')
    expect(neu.bereiche[0]).toMatchObject({ x: 25, y: 10, x2: 50, y2: 50 })
    fireEvent.pointerUp(flaeche, { pointerId: 1 })
    onChange.mockClear()
    fireEvent.pointerMove(flaeche, { clientX: 300, clientY: 100, pointerId: 1 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ohne Bild: Hinweis statt Zeichenfläche', () => {
    render(<HotspotFormular block={{ ...BLOCK, path: '' }} onChange={vi.fn()} />)
    expect(screen.getByText('Wähle zuerst ein Bild.')).toBeTruthy()
  })
})
