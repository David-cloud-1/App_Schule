import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AreaSwitcher } from './area-switcher'

const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }))

const assign = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', { value: { assign }, writable: true })
})

function setup(current: 'main' | 'linked' = 'main') {
  return render(<AreaSwitcher current={current} mainName="Spedition" linkedName="Tourismus" />)
}

describe('AreaSwitcher (PROJ-29)', () => {
  it('markiert den aktiven Bereich', () => {
    setup('main')
    expect(screen.getByRole('radio', { name: 'Spedition' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Tourismus' })).toHaveAttribute('aria-checked', 'false')
  })

  it('weist im Testkonto auf fehlende Admin-Rechte und den Rückweg hin', () => {
    setup('linked')
    expect(screen.getByText(/ohne Admin-Rechte/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Tourismus' })).toHaveAttribute('aria-checked', 'true')
  })

  it('ruft beim Klick auf den anderen Bereich die Schnittstelle auf und lädt neu', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    setup('main')
    fireEvent.click(screen.getByRole('radio', { name: 'Tourismus' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/profile'))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/switch-area',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ target: 'linked' }) }),
    )
  })

  it('tut beim Klick auf den aktiven Bereich nichts', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    setup('main')
    fireEvent.click(screen.getByRole('radio', { name: 'Spedition' }))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('zeigt bei Fehler eine Meldung und lädt nicht neu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    setup('main')
    fireEvent.click(screen.getByRole('radio', { name: 'Tourismus' }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(assign).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: 'Tourismus' })).not.toBeDisabled()
  })
})
