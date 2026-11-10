import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AssessmentCategoryCard } from './assessment-category-card'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { toast } from 'sonner'

type FetchCall = { url: string; init?: RequestInit }

function mockFetch(categoryResponse: { ok: boolean; body?: unknown } = { ok: true, body: { success: true } }) {
  const calls: FetchCall[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return { ok: categoryResponse.ok, json: async () => categoryResponse.body ?? {} }
  }))
  return calls
}

const props = {
  assessmentId: 'a1',
  schoolYear: '2026/27',
  schoolClass: null,
  subjectId: null,
  subjects: [{ id: 's1', name: 'KSK', code: 'KSK' }],
  classSuggestions: ['SP11a'],
}

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Ablage ändern' }))
}

describe('AssessmentCategoryCard', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('hat den Speichern-Knopf ohne Änderung deaktiviert', async () => {
    mockFetch()
    render(<AssessmentCategoryCard {...props} onSaved={() => {}} />)
    openDialog()
    expect(screen.getByRole('button', { name: /^Speichern$/ })).toBeDisabled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('schickt nur die Ablage-Felder an den Category-Endpunkt und lädt danach neu', async () => {
    const calls = mockFetch()
    const onSaved = vi.fn()
    render(<AssessmentCategoryCard {...props} onSaved={onSaved} />)
    openDialog()

    fireEvent.change(screen.getByLabelText(/Klasse/), { target: { value: '  SP11b ' } })
    const button = screen.getByRole('button', { name: /^Speichern$/ })
    expect(button).toBeEnabled()
    fireEvent.click(button)

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    const patch = calls.find((c) => c.url === '/api/admin/assessments/a1/category')!
    expect(patch.init?.method).toBe('PATCH')
    expect(JSON.parse(patch.init!.body as string)).toEqual({ schoolYear: '2026/27', className: 'SP11b', subjectId: null })
    expect(toast.success).toHaveBeenCalled()
  })

  it('sendet eine geleerte Klasse als null', async () => {
    const calls = mockFetch()
    render(<AssessmentCategoryCard {...props} schoolClass="SP11a" onSaved={() => {}} />)
    openDialog()

    fireEvent.change(screen.getByLabelText(/Klasse/), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /^Speichern$/ }))

    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/category'))).toBe(true))
    const patch = calls.find((c) => c.url.endsWith('/category'))!
    expect(JSON.parse(patch.init!.body as string).className).toBeNull()
  })

  it('zeigt den Fehler des Servers und lädt nicht neu', async () => {
    mockFetch({ ok: false, body: { error: 'Dieses Fach gibt es in diesem Bereich nicht.' } })
    const onSaved = vi.fn()
    render(<AssessmentCategoryCard {...props} onSaved={onSaved} />)
    openDialog()

    fireEvent.change(screen.getByLabelText(/Klasse/), { target: { value: 'SP12' } })
    fireEvent.click(screen.getByRole('button', { name: /^Speichern$/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Dieses Fach gibt es in diesem Bereich nicht.'))
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('bietet die vom Server gelieferten Klassen als Vorschlag an (ohne eigene Abfrage)', () => {
    mockFetch()
    const { baseElement } = render(<AssessmentCategoryCard {...props} onSaved={() => {}} />)
    openDialog()
    expect(baseElement.querySelector('datalist option[value="SP11a"]')).not.toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('ruht nach dem Speichern, auch wenn der Server die Klasse anders schreibt (BUG-4)', async () => {
    mockFetch({ ok: true, body: { success: true, className: 'SP11a', subjectId: null, schoolYear: '2026/27' } })
    render(<AssessmentCategoryCard {...props} onSaved={() => {}} />)
    openDialog()

    const input = screen.getByLabelText(/Klasse/) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'sp11a' } })
    fireEvent.click(screen.getByRole('button', { name: /^Speichern$/ }))

    // Dialog schließt, die Zeile zeigt den vom Server gespeicherten Wert
    await waitFor(() => expect(screen.getByText(/SP11a/)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /^Speichern$/ })).toBeNull()
  })

  it('zeigt die Ablage als Zeile und nennt fehlende Werte', () => {
    mockFetch()
    render(<AssessmentCategoryCard {...props} onSaved={() => {}} />)
    expect(screen.getByText(/2026\/27 · Keine Klasse · Kein Fach/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Klasse/)).toBeNull()
  })

  it('bleibt bei einem Fehler offen und behält die Eingabe', async () => {
    mockFetch({ ok: false, body: { error: 'Nein' } })
    render(<AssessmentCategoryCard {...props} onSaved={() => {}} />)
    openDialog()
    fireEvent.change(screen.getByLabelText(/Klasse/), { target: { value: 'SP12' } })
    fireEvent.click(screen.getByRole('button', { name: /^Speichern$/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect((screen.getByLabelText(/Klasse/) as HTMLInputElement).value).toBe('SP12')
  })
})
