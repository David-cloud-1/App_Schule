import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { QuestionPicker, type PickerQuestion } from './question-picker'

const q = (over: Partial<PickerQuestion>): PickerQuestion => ({
  id: 'q1',
  question_text: 'Frage',
  difficulty: 'mittel',
  class_level: null,
  topic: null,
  subject_codes: [],
  ...over,
})

describe('QuestionPicker – PROJ-46', () => {
  it('leitet die Klassenstufen-Filteroptionen aus den geladenen Fragen ab, nicht aus einem Bereichs-Kontext', () => {
    const questions = [
      q({ id: 'a', class_level: 11 }),
      q({ id: 'b', class_level: 10 }),
      q({ id: 'c', class_level: null }),
    ]
    render(<QuestionPicker questions={questions} selectedIds={new Set()} onChange={() => {}} />)
    const select = screen.getByLabelText('Klasse')
    // nur die tatsächlich vorkommenden Stufen, aufsteigend sortiert
    expect(within(select).queryByText('Klasse 12')).not.toBeInTheDocument()
    fireEvent.click(select)
    expect(screen.getByRole('option', { name: 'Klasse 10' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Klasse 11' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Klasse 12' })).not.toBeInTheDocument()
  })

  it('zeigt das Schild „Meine Frage“ nur bei privaten Fragen, nie bei Pool-Fragen', () => {
    const questions = [q({ id: 'pool', isPrivate: false }), q({ id: 'priv', isPrivate: true, question_text: 'Eigene Frage' })]
    render(<QuestionPicker questions={questions} selectedIds={new Set()} onChange={() => {}} />)
    expect(screen.getAllByText('Meine Frage')).toHaveLength(1)
  })

  it('bietet ohne canEditPool nur bei privaten Fragen „Bearbeiten“, bei Pool-Fragen „Ansehen“ — Löschen nur privat', () => {
    const questions = [q({ id: 'pool' }), q({ id: 'priv', isPrivate: true, question_text: 'Eigene Frage' })]
    const onOpenQuestion = vi.fn()
    const onDeletePrivate = vi.fn()
    render(
      <QuestionPicker
        questions={questions}
        selectedIds={new Set()}
        onChange={() => {}}
        onOpenQuestion={onOpenQuestion}
        onDeletePrivate={onDeletePrivate}
      />,
    )
    expect(screen.getAllByRole('button', { name: /bearbeiten/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /ansehen/ })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /bearbeiten/ }))
    expect(onOpenQuestion).toHaveBeenCalledWith(questions[1], true)

    fireEvent.click(screen.getByRole('button', { name: /ansehen/ }))
    expect(onOpenQuestion).toHaveBeenCalledWith(questions[0], false)

    expect(screen.getAllByRole('button', { name: /löschen/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /löschen/ }))
    expect(onDeletePrivate).toHaveBeenCalledWith(questions[1])
  })

  it('bietet mit canEditPool „Bearbeiten“ auch für Pool-Fragen an (Bereichs-/Super-Admin)', () => {
    const questions = [q({ id: 'pool' }), q({ id: 'priv', isPrivate: true })]
    const onOpenQuestion = vi.fn()
    render(
      <QuestionPicker
        questions={questions}
        selectedIds={new Set()}
        onChange={() => {}}
        onOpenQuestion={onOpenQuestion}
        canEditPool
      />,
    )
    expect(screen.getAllByRole('button', { name: /bearbeiten/ })).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: /bearbeiten/ })[0])
    expect(onOpenQuestion).toHaveBeenCalledWith(questions[0], true)
  })

  it('zeigt keine Knöpfe, wenn keine Callbacks übergeben werden (Lehrkraft darf Pool-Fragen nur auswählen)', () => {
    const questions = [q({ id: 'pool' }), q({ id: 'priv', isPrivate: true })]
    render(<QuestionPicker questions={questions} selectedIds={new Set()} onChange={() => {}} />)
    expect(screen.queryByRole('button', { name: /bearbeiten/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ansehen/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /löschen/ })).not.toBeInTheDocument()
  })

  it('wählt/deselektiert eine Frage per Checkbox', () => {
    const onChange = vi.fn()
    const questions = [q({ id: 'a' })]
    render(<QuestionPicker questions={questions} selectedIds={new Set()} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(new Set(['a']))
  })
})
