import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AssessmentSuggestDialog } from './assessment-suggest-dialog'
import type { PickerQuestion } from './question-picker'
import type { Candidate } from '@/lib/assessment-suggest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const questions: PickerQuestion[] = [
  { id: 'a', question_text: 'Frage A', difficulty: 'mittel', class_level: 11, topic: 'Thema 1', subject_codes: ['BGP'] },
  { id: 'b', question_text: 'Frage B', difficulty: 'mittel', class_level: 11, topic: 'Thema 2', subject_codes: ['BGP'] },
]

function cand(id: string, level: Candidate['level'], over: Partial<Candidate> = {}): Candidate {
  return {
    id,
    question_text: `Frage ${id}`,
    topic: 'Thema 1',
    class_level: 11,
    subject_codes: ['BGP'],
    isPrivate: false,
    attempts: 30,
    correct: 20,
    openReports: 0,
    blocked: false,
    level,
    rate: 67,
    rated: true,
    ...over,
  }
}

const fetchMock = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

function answer(json: unknown, ok = true) {
  fetchMock.mockResolvedValueOnce({ ok, json: async () => json })
}

function renderDialog(over: Partial<React.ComponentProps<typeof AssessmentSuggestDialog>> = {}) {
  const onApply = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <AssessmentSuggestDialog
      open
      onOpenChange={onOpenChange}
      departmentId="d1"
      questions={questions}
      selectedIds={new Set()}
      onApply={onApply}
      {...over}
    />,
  )
  return { onApply, onOpenChange }
}

const result = (items: Candidate[], extra: Record<string, unknown> = {}) => ({
  items,
  shortages: [],
  emptyTopics: [],
  poolSize: items.length,
  statsAvailable: true,
  ...extra,
})

describe('AssessmentSuggestDialog', () => {
  it('prüft die Anzahl und sperrt „Vorschlag erstellen“ bei ungültigen Werten', () => {
    renderDialog()
    const button = screen.getByRole('button', { name: /Vorschlag erstellen/ })
    expect(button).toBeEnabled()
    fireEvent.change(screen.getByLabelText(/Anzahl Fragen/), { target: { value: '4' } })
    expect(button).toBeDisabled()
    expect(screen.getByText(/ganze Zahl von 5 bis 60/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Anzahl Fragen/), { target: { value: '61' } })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Anzahl Fragen/), { target: { value: '12' } })
    expect(button).toBeEnabled()
  })

  it('schickt die Angaben an den Server, zeigt die Vorschau und übernimmt (ersetzen ohne bisherige Auswahl)', async () => {
    const { onApply, onOpenChange } = renderDialog()
    answer(result([cand('a', 'leicht'), cand('b', 'schwer', { rate: 20 })]))
    fireEvent.click(screen.getByRole('button', { name: /Vorschlag erstellen/ }))

    await screen.findByText('Frage a')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({
      action: 'suggest',
      departmentId: 'd1',
      count: 20,
      mix: { leicht: 30, mittel: 50, schwer: 20 },
      exclude: { blocked: true, reported: true, recent: 3 },
      keepIds: [],
      alreadyChosenIds: [],
    })
    expect(screen.getByText(/2 Fragen · etwa 2 Min\./)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))
    expect(onApply).toHaveBeenCalledWith(['a', 'b'], 'replace')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('ergänzt standardmäßig, wenn schon Fragen gewählt sind, und schickt sie als Ausschluss mit', async () => {
    const { onApply } = renderDialog({ selectedIds: new Set(['x']) })
    answer(result([cand('a', 'mittel')]))
    fireEvent.click(screen.getByRole('button', { name: /Vorschlag erstellen/ }))
    await screen.findByText('Frage a')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).alreadyChosenIds).toEqual(['x'])
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))
    expect(onApply).toHaveBeenCalledWith(['a'], 'add')
  })

  it('würfelt neu und behält fixierte Fragen', async () => {
    renderDialog()
    answer(result([cand('a', 'leicht'), cand('b', 'mittel')]))
    fireEvent.click(screen.getByRole('button', { name: /Vorschlag erstellen/ }))
    await screen.findByText('Frage a')

    const locks = screen.getAllByRole('button', { name: /fixieren/i })
    fireEvent.click(locks[0])

    answer(result([cand('a', 'leicht'), cand('c', 'mittel')]))
    fireEvent.click(screen.getByRole('button', { name: /Neu würfeln/ }))
    await screen.findByText('Frage c')
    const body = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(body.keepIds).toEqual(['a'])
    expect(body.preferNotIds).toEqual(['b'])
    expect(screen.queryByText('Frage b')).not.toBeInTheDocument()
  })

  it('entfernt eine Frage aus dem Vorschlag', async () => {
    const { onApply } = renderDialog()
    answer(result([cand('a', 'leicht'), cand('b', 'mittel')]))
    fireEvent.click(screen.getByRole('button', { name: /Vorschlag erstellen/ }))
    await screen.findByText('Frage a')
    fireEvent.click(screen.getAllByRole('button', { name: 'Frage entfernen' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))
    expect(onApply).toHaveBeenCalledWith(['b'], 'replace')
  })

  it('tauscht eine Frage gegen eine Alternative', async () => {
    const { onApply } = renderDialog()
    answer(result([cand('a', 'leicht')]))
    fireEvent.click(screen.getByRole('button', { name: /Vorschlag erstellen/ }))
    await screen.findByText('Frage a')

    answer({ alternatives: [cand('z', 'leicht')] })
    fireEvent.click(screen.getByRole('button', { name: 'Frage tauschen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Nehmen' }))
    await waitFor(() => expect(screen.getByText('Frage z')).toBeInTheDocument())
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ action: 'alternatives', questionId: 'a', excludeIds: ['a'] })

    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))
    expect(onApply).toHaveBeenCalledWith(['z'], 'replace')
  })

  it('nennt Fehlbeträge und Fragen mit zu wenigen Antworten', async () => {
    renderDialog()
    answer(
      result([cand('a', 'mittel', { rated: false, rate: null, attempts: 3 })], {
        shortages: [{ level: 'schwer', missing: 3 }],
        emptyTopics: ['Thema 9'],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: /Vorschlag erstellen/ }))
    await screen.findByText('Frage a')
    expect(screen.getByText(/Zu wenige schwere Fragen: es fehlen 3/)).toBeInTheDocument()
    expect(screen.getByText(/Zum Thema „Thema 9“ gibt es keine passenden Fragen/)).toBeInTheDocument()
    expect(screen.getByText(/1 Frage hat noch zu wenige Antworten/)).toBeInTheDocument()
  })

  it('zeigt bei leerem Ergebnis den Leerzustand mit Link zum Import', async () => {
    const onOpenImport = vi.fn()
    renderDialog({ onOpenImport })
    answer(result([], { poolSize: 0 }))
    fireEvent.click(screen.getByRole('button', { name: /Vorschlag erstellen/ }))
    await screen.findByText(/keine passenden Fragen/)
    expect(screen.getByRole('button', { name: 'Übernehmen' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Fragen aus Aufgabenblatt erzeugen/ }))
    expect(onOpenImport).toHaveBeenCalled()
  })

  it('zeigt Serverfehler verständlich und bleibt im Formular', async () => {
    renderDialog()
    answer({ error: 'Das hat nicht geklappt. Bitte versuche es erneut.' }, false)
    fireEvent.click(screen.getByRole('button', { name: /Vorschlag erstellen/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Das hat nicht geklappt')
    expect(screen.getByRole('button', { name: /Vorschlag erstellen/ })).toBeEnabled()
  })
})
