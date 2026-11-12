// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DiagrammFormular, TabelleFormular } from './editor-formulare-tabelle'
import { TabelleHerausloesen } from './tabelle-herausloesen'
import type { Block } from '@/lib/werkzeugkiste-editor'

vi.mock('sonner', () => ({ toast: { message: vi.fn(), error: vi.fn(), success: vi.fn() } }))

describe('TabelleFormular', () => {
  const block: Block = { type: 'tabelle', zeilen: [['A', 'B'], ['1', '2']], kopfzeile: true, stil: 'beides' }

  it('ändert eine Zelle und meldet das Feld', () => {
    const onChange = vi.fn()
    render(<TabelleFormular block={block} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Zeile 2, Spalte 2'), { target: { value: '9' } })
    expect(onChange).toHaveBeenCalledWith({ ...block, zeilen: [['A', 'B'], ['1', '9']] }, 'zelle-1-1')
  })

  it('fügt eine Zeile hinzu', () => {
    const onChange = vi.fn()
    render(<TabelleFormular block={block} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Zeile hinzufügen/ }))
    expect(onChange.mock.calls[0][0].zeilen).toEqual([['A', 'B'], ['1', '2'], ['', '']])
  })

  it('übernimmt eingefügte Excel-Zellen', () => {
    const onChange = vi.fn()
    render(<TabelleFormular block={block} onChange={onChange} />)
    fireEvent.paste(screen.getByLabelText('Zeile 1, Spalte 1'), { clipboardData: { getData: () => 'x\ty\nz\tw' } })
    expect(onChange.mock.calls[0][0].zeilen).toEqual([['x', 'y'], ['z', 'w']])
  })

  it('die letzte Zeile und Spalte lassen sich nicht entfernen', () => {
    render(<TabelleFormular block={{ type: 'tabelle', zeilen: [['a']] }} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Zeile 1 entfernen' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Spalte 1 entfernen' })).toBeDisabled()
  })

  it('schaltet die Kopfzeile um', () => {
    const onChange = vi.fn()
    render(<TabelleFormular block={block} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch', { name: /Kopfzeile/ }))
    expect(onChange.mock.calls[0][0].kopfzeile).toBe(false)
  })
})

describe('DiagrammFormular', () => {
  const block: Block = { type: 'diagramm', art: 'saeulen', beschriftungen: ['Q1'], reihen: [{ name: '2024', werte: ['x'] }] }

  it('markiert Nicht-Zahlen an der Zelle', () => {
    render(<DiagrammFormular block={block} onChange={vi.fn()} />)
    expect(screen.getByText('„x“ ist keine Zahl.')).toBeInTheDocument()
    expect(screen.getByLabelText('Beschriftung 2, Reihe 2')).toHaveAttribute('aria-invalid', 'true')
  })

  it('schreibt Datenänderungen zurück in beschriftungen und reihen', () => {
    const onChange = vi.fn()
    render(<DiagrammFormular block={block} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Beschriftung 2, Reihe 2'), { target: { value: '5,5' } })
    expect(onChange.mock.calls[0][0]).toMatchObject({ beschriftungen: ['Q1'], reihen: [{ name: '2024', werte: ['5,5'] }] })
  })

  it('zeigt beim Kreis den Hinweis zur ersten Reihe', () => {
    render(<DiagrammFormular block={{ ...block, art: 'kreis', reihen: [{ name: 'a', werte: ['1'] }, { name: 'b', werte: ['2'] }] }} onChange={vi.fn()} />)
    expect(screen.getByText('Das Kreisdiagramm zeigt nur die erste Reihe.')).toBeInTheDocument()
  })
})

describe('TabelleHerausloesen', () => {
  it('zeigt nichts ohne Tabelle', () => {
    const { container } = render(<TabelleHerausloesen html="<p>Hallo</p>" onHeraus={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('wandelt eine einfache Tabelle sofort um', () => {
    const onHeraus = vi.fn()
    render(<TabelleHerausloesen html="<table><tr><th>A</th></tr><tr><td>1</td></tr></table>" onHeraus={onHeraus} />)
    fireEvent.click(screen.getByRole('button', { name: /Tabelle herauslösen/ }))
    expect(onHeraus).toHaveBeenCalledTimes(1)
  })

  it('warnt vor Verlust und wartet auf Bestätigung', () => {
    const onHeraus = vi.fn()
    render(<TabelleHerausloesen html='<table><tr><td colspan="2">x</td></tr></table>' onHeraus={onHeraus} />)
    fireEvent.click(screen.getByRole('button', { name: /Tabelle herauslösen/ }))
    expect(onHeraus).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Verbundene Zellen')
    fireEvent.click(screen.getByRole('button', { name: 'Trotzdem umwandeln' }))
    expect(onHeraus).toHaveBeenCalledTimes(1)
  })
})
