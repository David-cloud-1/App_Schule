import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TypWechsel } from './typ-wechsel'
import { KapiteltestFormular } from './editor-formulare'
import { beispielBlock } from '@/lib/werkzeugkiste-katalog'
import type { Block } from '@/lib/werkzeugkiste-editor'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = () => {}

const eigeneFrage: Block = {
  type: 'multiple_choice',
  question: 'Hauptstadt von Bayern?',
  answers: [
    { text: 'München', correct: true, feedback: 'Genau' },
    { text: 'Nürnberg', correct: false },
  ],
}

function zeige(block: Block = eigeneFrage, erlaubt?: readonly string[]) {
  const onWechsel = vi.fn()
  const onOpenChange = vi.fn()
  const rueckgaengig = vi.fn()
  render(<TypWechsel offen onOpenChange={onOpenChange} block={block} onWechsel={onWechsel} erlaubt={erlaubt} rueckgaengig={rueckgaengig} />)
  return { onWechsel, onOpenChange, rueckgaengig }
}

const eintrag = (typ: string) => document.querySelector<HTMLButtonElement>(`[data-katalog-eintrag="${typ}"]`)!

beforeEach(() => {
  window.localStorage.clear()
  toast.success.mockClear()
})

describe('Typ wechseln (PROJ-95)', () => {
  it('Wechsel-Modus: Titel, nur verwandte Typen wählbar, aktueller Typ markiert, kein „Zuletzt verwendet“', () => {
    window.localStorage.setItem('wk-katalog-zuletzt', JSON.stringify(['crossword']))
    zeige()
    expect(screen.getByRole('heading', { name: 'Typ wechseln – aktuell: Auswahlfrage' })).toBeInTheDocument()
    expect(screen.queryByText('Zuletzt verwendet')).toBeNull()
    expect(eintrag('true_false')).not.toHaveAttribute('aria-disabled')
    expect(eintrag('single_choice_set')).not.toHaveAttribute('aria-disabled')
    expect(eintrag('multiple_choice')).toHaveAttribute('aria-disabled', 'true')
    expect(eintrag('multiple_choice').textContent).toContain('Aktueller Typ')
    expect(eintrag('crossword')).toHaveAttribute('aria-disabled', 'true')
    expect(eintrag('crossword').textContent).toContain('Nicht möglich')
  })

  it('ein gesperrter Typ löst nichts aus', () => {
    const { onWechsel } = zeige()
    fireEvent.click(eintrag('crossword'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onWechsel).not.toHaveBeenCalled()
  })

  it('zeigt vor dem Wechsel übernommen / verloren / prüfen und ändert erst mit „Wechseln“', () => {
    const { onWechsel, rueckgaengig } = zeige()
    fireEvent.click(eintrag('true_false'))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Von Auswahlfrage zu Richtig oder falsch wechseln?')
    expect(screen.getByRole('region', { name: 'Wird übernommen' })).toHaveTextContent('Fragetext')
    expect(screen.getByRole('region', { name: 'Geht verloren' })).toHaveTextContent('2 Antworten')
    expect(screen.getByRole('region', { name: 'Bitte prüfen' })).toHaveTextContent('voreingestellt')
    expect(onWechsel).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Wechseln' }))
    expect(onWechsel).toHaveBeenCalledTimes(1)
    expect(onWechsel.mock.calls[0][0]).toMatchObject({ type: 'true_false', question: 'Hauptstadt von Bayern?' })
    const [text, optionen] = toast.success.mock.calls[0]
    expect(text).toBe('Typ gewechselt zu Richtig oder falsch')
    optionen.action.onClick()
    expect(rueckgaengig).toHaveBeenCalled()
  })

  it('Abbrechen ändert nichts', () => {
    const { onWechsel } = zeige()
    fireEvent.click(eintrag('single_choice_set'))
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(onWechsel).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('verlustfreier Wechsel nennt das im Dialog', () => {
    const { onWechsel } = zeige({ type: 'reihenfolge', description: 'Ordne', items: ['A', 'B', 'C'] })
    fireEvent.click(eintrag('image_sequencing'))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Es geht nichts verloren.')
    expect(screen.queryByRole('region', { name: 'Geht verloren' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Wechseln' }))
    expect(onWechsel.mock.calls[0][0].type).toBe('image_sequencing')
  })

  it('unverändertes Beispiel: sofort das Beispiel des Zieltyps, ohne Dialog', () => {
    const { onWechsel } = zeige(beispielBlock('multiple_choice'))
    fireEvent.click(eintrag('true_false'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onWechsel).toHaveBeenCalledWith(beispielBlock('true_false'))
  })

  it('Kapiteltest: gefiltert auf erlaubte Typen, mit Hinweis', () => {
    zeige(eigeneFrage, ['multiple_choice', 'true_false', 'fill_blanks'])
    expect(screen.getByText(/Im Kapiteltest sind nur diese Fragetypen möglich/)).toBeInTheDocument()
    expect(eintrag('single_choice_set')).toBeNull()
    expect(eintrag('true_false')).not.toHaveAttribute('aria-disabled')
  })
})

describe('Kapiteltest-Formular', () => {
  it('hat keine Auswahlliste „Fragetyp“ mehr, aber „Typ wechseln“ je Frage (nicht bei Lückentext)', () => {
    const block: Block = { type: 'question_set', pass_percentage: 70, questions: [eigeneFrage, { type: 'fill_blanks', text: 'Ein *Test*.' }] }
    render(<KapiteltestFormular block={block} onChange={() => {}} />)
    expect(screen.queryByLabelText(/Fragetyp von/)).toBeNull()
    expect(screen.getAllByRole('button', { name: /Typ von Frage \d wechseln/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Typ von Frage 1 wechseln/ })).toBeInTheDocument()
  })
})
