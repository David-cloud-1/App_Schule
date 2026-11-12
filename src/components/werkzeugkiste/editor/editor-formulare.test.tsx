import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  AbschlussFormular,
  AuswahlFormular,
  FORMULARE,
  KapiteltestFormular,
  LueckenFormular,
  RichtigFalschFormular,
  ZusammenfassungFormular,
  luecken,
} from './editor-formulare'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
// Radix Select braucht diese Browser-Funktionen, die jsdom nicht kennt
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = () => {}

const letzter = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)!

describe('Lücken erkennen', () => {
  it('liest alle vier Schreibweisen', () => {
    expect(luecken('fill_blanks', 'Der *Frachtführer* haftet nach *§ 425/§425* HGB.')).toEqual(['Frachtführer', '§ 425 oder §425'])
    expect(luecken('advanced_fill_blanks', 'Der *Spediteur* (Beruf) und *CMR*.')).toEqual(['Spediteur (Tipp: Beruf)', 'CMR'])
    expect(luecken('drag_words', '*Gefährdungshaftung:§ 425 HGB* gilt.')).toEqual(['Gefährdungshaftung (Tipp: § 425 HGB)'])
    expect(luecken('mark_words', 'Im Protokoll stehen *CMR* und *AWB*.')).toEqual(['CMR', 'AWB'])
    expect(luecken('fill_blanks', 'ohne Lücke')).toEqual([])
  })
})

describe('Formulare', () => {
  it('kennen 13 Typen', () => {
    expect(Object.keys(FORMULARE).sort()).toEqual(
      [
        'accordion', 'advanced_fill_blanks', 'calculation_exercise', 'dialog_cards', 'drag_words', 'fill_blanks',
        'mark_words', 'multiple_choice', 'question_set', 'single_choice', 'single_choice_set', 'summary', 'true_false',
      ].sort(),
    )
  })

  it('Auswahlfrage: Text ändern, genau eine richtige Antwort, unbekannte Felder bleiben', () => {
    const onChange = vi.fn()
    const block = {
      type: 'multiple_choice',
      question: 'Wer haftet?',
      eigenesFeld: 'bleibt',
      answers: [
        { text: 'Spediteur', correct: true, feedback: 'a' },
        { text: 'Frachtführer', correct: false, feedback: 'b' },
      ],
    }
    render(<AuswahlFormular block={block} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/^Frage/), { target: { value: 'Wer haftet hier?' } })
    expect(letzter(onChange)).toEqual([{ ...block, question: 'Wer haftet hier?' }, 'question'])

    fireEvent.click(screen.getByRole('radio', { name: 'Antwort 2 ist richtig' }))
    const [neu] = letzter(onChange)
    expect(neu.answers.map((a: { correct: boolean }) => a.correct)).toEqual([false, true])
    expect(neu.eigenesFeld).toBe('bleibt')

    // Mindestens zwei Antworten: Entfernen ist gesperrt
    expect(screen.getByRole('button', { name: 'Antwort 1 entfernen' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Antwort hinzufügen/ }))
    expect(letzter(onChange)[0].answers).toHaveLength(3)
  })

  it('Richtig/Falsch umschalten', () => {
    const onChange = vi.fn()
    render(<RichtigFalschFormular block={{ type: 'true_false', question: 'X', correct: true }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'falsch' }))
    expect(letzter(onChange)).toEqual([{ type: 'true_false', question: 'X', correct: false }, 'correct'])
  })

  it('Lückentext zeigt die erkannten Lücken', () => {
    render(<LueckenFormular block={{ type: 'fill_blanks', text: 'Der *Frachtführer* haftet.' }} onChange={vi.fn()} />)
    expect(screen.getByText('1 Lücke:')).toBeInTheDocument()
    expect(screen.getByText('Frachtführer')).toBeInTheDocument()
  })

  it('Lückentext ohne Lücken weist darauf hin', () => {
    render(<LueckenFormular block={{ type: 'drag_words', text: 'Nichts markiert.' }} onChange={vi.fn()} />)
    expect(screen.getByText(/Noch keine Lücken/)).toBeInTheDocument()
  })

  it('Zusammenfassung: Fragen im Kapitel, Aussagen in der Lernzielkontrolle', () => {
    const { unmount } = render(
      <ZusammenfassungFormular block={{ type: 'summary', questions: [{ correct: 'A', distractors: ['B', 'C'] }] }} onChange={vi.fn()} />,
    )
    expect(screen.getByDisplayValue('A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('C')).toBeInTheDocument()
    unmount()
    render(<ZusammenfassungFormular block={{ type: 'summary', statements: ['Eins'] }} onChange={vi.fn()} />)
    expect(screen.getByText('Kernaussagen')).toBeInTheDocument()
  })

  it('Kapiteltest: Bestehensgrenze bleibt zwischen 0 und 100', () => {
    const onChange = vi.fn()
    render(
      <KapiteltestFormular
        block={{ type: 'question_set', pass_percentage: 70, questions: [{ type: 'true_false', question: 'A', correct: true }] }}
        onChange={onChange}
      />,
    )
    fireEvent.change(screen.getByLabelText('Bestehensgrenze in Prozent'), { target: { value: '150' } })
    expect(letzter(onChange)[0].pass_percentage).toBe(100)
    // Die Frage im Test bekommt ihr eigenes Formular
    expect(screen.getByLabelText(/^Aussage/)).toHaveValue('A')
  })

  it('Lernzielkontrolle: Titel, Abschlusstest und Kernaussagen', () => {
    const onChange = vi.fn()
    const abschluss = {
      title: 'Lernzielkontrolle',
      question_set: { pass_percentage: 70, questions: [{ type: 'true_false', question: 'Q', correct: true }] },
      summary: { statements: ['Kern 1'] },
    }
    render(<AbschlussFormular abschluss={abschluss} onChange={onChange} />)
    fireEvent.change(screen.getByDisplayValue('Kern 1'), { target: { value: 'Kern eins' } })
    expect(letzter(onChange)[0].summary).toEqual({ statements: ['Kern eins'] })
    fireEvent.change(screen.getByDisplayValue('Q'), { target: { value: 'Q2' } })
    const [neu, feld] = letzter(onChange)
    expect(neu.question_set.questions[0].question).toBe('Q2')
    // Keine Hilfsmarke `type` in der gespeicherten Lernzielkontrolle
    expect(neu.question_set).not.toHaveProperty('type')
    expect(feld).toBe('qs-questions')
    expect(within(screen.getByText('Abschlusstest').parentElement!).getByText('Fragen')).toBeInTheDocument()
  })
})
