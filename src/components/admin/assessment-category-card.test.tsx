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
    if (url === '/api/admin/subjects') return { ok: true, json: async () => ({ subjects: [{ id: 's1', name: 'KSK', code: 'KSK' }] }) }
    if (url === '/api/admin/assessments') return { ok: true, json: async () => ({ assessments: [{ className: 'SP11a', schoolYear: '2025/26' }] }) }
    return { ok: categoryResponse.ok, json: async () => categoryResponse.body ?? {} }
  }))
  return calls
}

const props = { assessmentId: 'a1', schoolYear: '2026/27', schoolClass: null, subjectId: null }

describe('AssessmentCategoryCard', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('hat den Speichern-Knopf ohne Änderung deaktiviert', async () => {
    mockFetch()
    render(<AssessmentCategoryCard {...props} onSaved={() => {}} />)
    expect(screen.getByRole('button', { name: /Ablage speichern/ })).toBeDisabled()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })

  it('schickt nur die Ablage-Felder an den Category-Endpunkt und lädt danach neu', async () => {
    const calls = mockFetch()
    const onSaved = vi.fn()
    render(<AssessmentCategoryCard {...props} onSaved={onSaved} />)

    fireEvent.change(screen.getByLabelText(/Klasse/), { target: { value: '  SP11b ' } })
    const button = screen.getByRole('button', { name: /Ablage speichern/ })
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

    fireEvent.change(screen.getByLabelText(/Klasse/), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /Ablage speichern/ }))

    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/category'))).toBe(true))
    const patch = calls.find((c) => c.url.endsWith('/category'))!
    expect(JSON.parse(patch.init!.body as string).className).toBeNull()
  })

  it('zeigt den Fehler des Servers und lädt nicht neu', async () => {
    mockFetch({ ok: false, body: { error: 'Dieses Fach gibt es in diesem Bereich nicht.' } })
    const onSaved = vi.fn()
    render(<AssessmentCategoryCard {...props} onSaved={onSaved} />)

    fireEvent.change(screen.getByLabelText(/Klasse/), { target: { value: 'SP12' } })
    fireEvent.click(screen.getByRole('button', { name: /Ablage speichern/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Dieses Fach gibt es in diesem Bereich nicht.'))
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('bietet bereits verwendete Klassen als Vorschlag an', async () => {
    mockFetch()
    const { container } = render(<AssessmentCategoryCard {...props} onSaved={() => {}} />)
    await waitFor(() => expect(container.querySelector('datalist option[value="SP11a"]')).not.toBeNull())
  })
})
