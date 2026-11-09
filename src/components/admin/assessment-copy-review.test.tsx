import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AssessmentCopyReview } from './assessment-copy-review'
import type { CopyReviewRow } from '@/lib/assessment-copy-types'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function row(n: number, over: Partial<CopyReviewRow> = {}): CopyReviewRow {
  return {
    id: `q${n}`,
    position: n,
    text: `Fragetext ${n}`,
    topic: 'Thema A',
    available: true,
    blocked: false,
    light: 'green',
    reasons: [],
    correctRate: 70,
    discrimination: 0.3,
    changed: false,
    ...over,
  }
}

const review = (rows: CopyReviewRow[], extra: Record<string, unknown> = {}) => ({
  isCopy: true,
  sourceId: 's1',
  sourceTitle: 'Klausur Original',
  analysisAvailable: true,
  participants: 20,
  unavailableCount: rows.filter((r) => !r.available).length,
  rows,
  ...extra,
})

const replacement = (id: string) => ({ id, text: `Ersatz ${id}`, topic: 'Thema A', level: 'mittel', correctRate: 55, rated: true, isPrivate: false })

const fetchMock = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})
const answer = (json: unknown, ok = true, status = 200) => fetchMock.mockResolvedValueOnce({ ok, status, json: async () => json })

const rows = [
  row(1),
  row(2, { light: 'red', reasons: ['too_hard'], correctRate: 12 }),
  row(3, { available: false, text: null, light: 'none', correctRate: null, discrimination: null }),
  row(4, { changed: true, light: 'yellow', reasons: ['too_easy'] }),
]

describe('AssessmentCopyReview', () => {
  it('zeigt nichts, wenn der Nachweis keine Kopie ist', async () => {
    answer({ isCopy: false })
    const { container } = render(<AssessmentCopyReview assessmentId="a1" onChanged={vi.fn()} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('zeigt Original, Ampel, Platzhalter und Änderungs-Chip', async () => {
    answer(review(rows))
    render(<AssessmentCopyReview assessmentId="a1" onChanged={vi.fn()} />)
    expect(await screen.findByText('Klausur Original')).toBeTruthy()
    expect(screen.getByText('Frage nicht mehr verfügbar')).toBeTruthy()
    expect(screen.getByText(/Prüfen · 12 % richtig/)).toBeTruthy()
    expect(screen.getByText('Frage geändert seit dem letzten Nachweis')).toBeTruthy()
    expect(screen.getByText(/nicht mehr verfügbar. Der/)).toBeTruthy()
    expect(screen.getByLabelText('Platzhalter entfernen')).toBeTruthy()
  })

  it('blendet ohne Auswertung die Ampel aus und erklärt, dass Ersetzen von Hand geht', async () => {
    answer(review([row(1, { light: 'none', correctRate: null, discrimination: null })], { analysisAvailable: false, participants: 0 }))
    render(<AssessmentCopyReview assessmentId="a1" onChanged={vi.fn()} />)
    expect(await screen.findByText(/nicht ausgewertet/)).toBeTruthy()
    expect(screen.queryByText('Unauffällig')).toBeNull()
  })

  it('filtert auf auffällige Fragen', async () => {
    answer(review(rows))
    render(<AssessmentCopyReview assessmentId="a1" onChanged={vi.fn()} />)
    await screen.findByText('Fragetext 1')
    fireEvent.click(screen.getByLabelText(/Nur auffällige/))
    expect(screen.queryByText('Fragetext 1')).toBeNull()
    expect(screen.getByText('Fragetext 2')).toBeTruthy()
  })

  it('ersetzt eine Frage über die Ersatzliste', async () => {
    const onChanged = vi.fn()
    answer(review(rows))
    render(<AssessmentCopyReview assessmentId="a1" onChanged={onChanged} />)
    await screen.findByText('Fragetext 2')
    answer({ alternatives: [replacement('n1')], topicKnown: true })
    fireEvent.click(screen.getAllByRole('button', { name: /Ersetzen/ })[1])
    expect(await screen.findByText('Ersatz n1')).toBeTruthy()
    answer({ success: true })
    answer(review(rows))
    fireEvent.click(screen.getByRole('button', { name: /Diese nehmen/ }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    const applyCall = fetchMock.mock.calls.find((c) => String(c[1]?.body).includes('"apply"'))!
    expect(JSON.parse(applyCall[1].body)).toEqual({ action: 'apply', swaps: [{ from: 'q2', to: 'n1' }], removes: [] })
  })

  it('weist auf fehlenden Ersatz hin', async () => {
    answer(review(rows))
    render(<AssessmentCopyReview assessmentId="a1" onChanged={vi.fn()} />)
    await screen.findByText('Fragetext 2')
    answer({ alternatives: [], topicKnown: true })
    fireEvent.click(screen.getAllByRole('button', { name: /Ersetzen/ })[1])
    expect(await screen.findByText(/Kein passender Ersatz/)).toBeTruthy()
  })

  it('zeigt bei „Alle auffälligen ersetzen“ erst die Vorschau und schreibt erst nach „Übernehmen“', async () => {
    const onChanged = vi.fn()
    answer(review(rows))
    render(<AssessmentCopyReview assessmentId="a1" onChanged={onChanged} />)
    await screen.findByText('Fragetext 2')
    answer({
      items: [
        { questionId: 'q2', replacement: replacement('n2') },
        { questionId: 'q3', replacement: null },
        { questionId: 'q4', replacement: replacement('n4') },
      ],
    })
    fireEvent.click(screen.getByRole('button', { name: /Alle auffälligen ersetzen/ }))
    expect(await screen.findByText(/Ersatz n2/)).toBeTruthy()
    expect(screen.getByText(/Kein Ersatz vorhanden/)).toBeTruthy()
    expect(fetchMock.mock.calls.some((c) => String(c[1]?.body).includes('"apply"'))).toBe(false)
    answer({ success: true })
    answer(review(rows))
    fireEvent.click(screen.getByRole('button', { name: /Übernehmen \(2\)/ }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    const applyCall = fetchMock.mock.calls.find((c) => String(c[1]?.body).includes('"apply"'))!
    expect(JSON.parse(applyCall[1].body).swaps).toEqual([
      { from: 'q2', to: 'n2' },
      { from: 'q4', to: 'n4' },
    ])
  })

  it('zeigt einen Fehlerzustand mit „Erneut versuchen“', async () => {
    answer({}, false, 500)
    render(<AssessmentCopyReview assessmentId="a1" onChanged={vi.fn()} />)
    expect(await screen.findByText(/nicht geladen werden/)).toBeTruthy()
  })
})
