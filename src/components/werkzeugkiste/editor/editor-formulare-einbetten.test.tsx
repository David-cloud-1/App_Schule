import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EinbettenFormular } from './editor-formulare-einbetten'
import type { Block } from '@/lib/werkzeugkiste-editor'

function zeige(block: Block) {
  const onChange = vi.fn()
  render(<EinbettenFormular block={block} onChange={onChange} />)
  return onChange
}

describe('EinbettenFormular (PROJ-109)', () => {
  it('erkennt YouTube und zeigt Darstellung und Zeiten', () => {
    zeige({ type: 'einbetten', url: 'https://youtu.be/abc', titel: 'Video ansehen' })
    expect(screen.getByText(/Erkannt: YouTube/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Einbetten \(nach Klick\)/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/Startzeit/)).toBeInTheDocument()
  })

  it('zeigt für fremde Anbieter nur den Hinweis und keine Wahl', () => {
    zeige({ type: 'einbetten', url: 'https://example.com/x' })
    expect(screen.getByText(/steht nicht auf der Liste/)).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Einbetten \(nach Klick\)/ })).toBeNull()
  })

  it('lehnt ungültige Links mit dem festen Satz ab', () => {
    zeige({ type: 'einbetten', url: 'javascript:alert(1)' })
    expect(screen.getByRole('alert')).toHaveTextContent('Dieser Link kann nicht eingebettet werden.')
  })

  it('erkennt eine Kahoot-PIN', () => {
    zeige({ type: 'einbetten', url: '123456' })
    expect(screen.getByText(/Kahoot-PIN 123456/)).toBeInTheDocument()
  })

  it('schlägt beim Einfügen eines Links einen Titel vor', () => {
    const onChange = zeige({ type: 'einbetten', url: '', titel: '' })
    fireEvent.change(screen.getByLabelText(/Link einfügen/), { target: { value: 'https://youtu.be/abc' } })
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ url: 'https://youtu.be/abc', titel: 'Video ansehen' }), 'url')
  })

  it('überschreibt einen selbst geschriebenen Titel nicht', () => {
    const onChange = zeige({ type: 'einbetten', url: '', titel: 'Mein Titel' })
    fireEvent.change(screen.getByLabelText(/Link einfügen/), { target: { value: 'https://youtu.be/abc' } })
    const letzter = onChange.mock.calls.at(-1)![0]
    expect(letzter.titel).toBe('Mein Titel')
  })
})
