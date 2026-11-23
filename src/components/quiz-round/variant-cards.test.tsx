import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TrueFalseCard } from './true-false-card'
import { EliminateOptions } from './eliminate-options'
import { ChoiceOptions } from './choice-options'

describe('TrueFalseCard', () => {
  it('antwortet über beide Knöpfe', () => {
    const onAnswer = vi.fn()
    render(<TrueFalseCard proposalText="Frachtbrief" onAnswer={onAnswer} pending={false} saidTrue={null} result={null} />)
    fireEvent.click(screen.getByRole('button', { name: /^Stimmt$/ }))
    fireEvent.click(screen.getByRole('button', { name: /Stimmt nicht/ }))
    expect(onAnswer).toHaveBeenNthCalledWith(1, true)
    expect(onAnswer).toHaveBeenNthCalledWith(2, false)
  })

  it('lässt sich mit den Pfeiltasten bedienen', () => {
    const onAnswer = vi.fn()
    render(<TrueFalseCard proposalText="Frachtbrief" onAnswer={onAnswer} pending={false} saidTrue={null} result={null} />)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(onAnswer).toHaveBeenCalledWith(false)
  })

  it('ignoriert Tasten, wenn die Tastatur aus ist (Dialog offen)', () => {
    const onAnswer = vi.fn()
    render(<TrueFalseCard proposalText="x" onAnswer={onAnswer} pending={false} saidTrue={null} result={null} keyboard={false} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onAnswer).not.toHaveBeenCalled()
  })

  it('sperrt nach der Antwort und zeigt, ob der Vorschlag stimmte', () => {
    const onAnswer = vi.fn()
    render(
      <TrueFalseCard
        proposalText="x"
        onAnswer={onAnswer}
        pending={false}
        saidTrue={true}
        result={{ correct: false, proposalWasCorrect: false }}
      />,
    )
    expect(screen.getByRole('button', { name: /^Stimmt$/ })).toBeDisabled()
    expect(screen.getByText('stimmt nicht')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onAnswer).not.toHaveBeenCalled()
  })

  it('wertet ein weites Wischen nach rechts als „Stimmt“', () => {
    const onAnswer = vi.fn()
    render(<TrueFalseCard proposalText="x" onAnswer={onAnswer} pending={false} saidTrue={null} result={null} />)
    const card = screen.getByTestId('tf-proposal')
    fireEvent.pointerDown(card, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(card, { clientX: 220, pointerId: 1 })
    fireEvent.pointerUp(card, { clientX: 220, pointerId: 1 })
    expect(onAnswer).toHaveBeenCalledWith(true)
  })
})

describe('EliminateOptions', () => {
  const options = [
    { id: 'a', option_text: 'Alpha' },
    { id: 'b', option_text: 'Beta' },
    { id: 'c', option_text: 'Gamma' },
    { id: 'd', option_text: 'Delta' },
  ]

  it('zeigt Herzen und meldet das Antippen', () => {
    const onTap = vi.fn()
    render(
      <EliminateOptions options={options} eliminatedIds={[]} keptIds={[]} heartsLeft={2} pendingId={null} correctOptionId={null} onTap={onTap} />,
    )
    expect(screen.getByRole('img', { name: '2 von 2 Herzen übrig' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Beta – rauswerfen' }))
    expect(onTap).toHaveBeenCalledWith('b')
  })

  it('sperrt Weggestrichenes und die behaltene richtige Option', () => {
    render(
      <EliminateOptions options={options} eliminatedIds={['b']} keptIds={['a']} heartsLeft={1} pendingId={null} correctOptionId={null} onTap={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Beta – rausgeworfen' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Alpha – die ist richtig, bleibt drin' })).toBeDisabled()
    expect(screen.getByRole('img', { name: '1 von 2 Herzen übrig' })).toBeInTheDocument()
  })

  it('nimmt während einer Prüfung keine weiteren Tipps an', () => {
    render(
      <EliminateOptions options={options} eliminatedIds={[]} keptIds={[]} heartsLeft={2} pendingId="c" correctOptionId={null} onTap={vi.fn()} />,
    )
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
  })
})

describe('ChoiceOptions', () => {
  const options = [
    { id: 'a', option_text: 'Alpha' },
    { id: 'b', option_text: 'Beta' },
  ]
  it('streicht Joker-Optionen und sperrt sie', () => {
    render(<ChoiceOptions options={options} selectedId={null} pending={false} correctOptionId={null} removedIds={['b']} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Beta (vom Joker gestrichen)' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeEnabled()
  })
  it('kennt vor der Server-Antwort keine Lösung', () => {
    const { container } = render(
      <ChoiceOptions options={options} selectedId="a" pending correctOptionId={null} onSelect={vi.fn()} />,
    )
    expect(screen.getByLabelText('wird geprüft')).toBeInTheDocument()
    expect(container.innerHTML).not.toContain('#58CC02')
  })
})
