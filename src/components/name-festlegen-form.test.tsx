import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { NameFestlegenForm } from './name-festlegen-form'

const signOut = vi.fn(async () => ({}))
vi.mock('@/lib/supabase-browser', () => ({ createClient: () => ({ auth: { signOut } }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }))

import { toast } from 'sonner'

const fetchMock = vi.fn()
const location = { href: '' }

function fill(first: string, last: string) {
  fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: first } })
  fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: last } })
  fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
}

const setup = (first = '', last = '') =>
  render(<NameFestlegenForm initialFirstName={first} initialLastName={last} theme="light" />)

describe('Pflicht-Seite „Wie heißt du?“ (PROJ-121)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    location.href = ''
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(window, 'location', { value: location, writable: true, configurable: true })
  })
  afterEach(() => vi.useRealTimers())

  it('zeigt Überschrift, Erklärung, beide Felder, Weiter und Abmelden', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Wie heißt du?' })).toBeInTheDocument()
    expect(screen.getByText('Dein Kollegium sieht dich mit diesem Namen.')).toBeInTheDocument()
    expect(screen.getByLabelText('Vorname')).toBeInTheDocument()
    expect(screen.getByLabelText('Nachname')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeInTheDocument()
  })

  it('füllt einen schon vorhandenen Teil vor', () => {
    setup('Erika', '')
    expect(screen.getByLabelText('Vorname')).toHaveValue('Erika')
  })

  it('zeigt leere Felder erst nach „Weiter“ mit Meldung am Feld und sendet nichts', () => {
    setup()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText('Bitte gib deinen Vornamen ein.')).toBeInTheDocument()
    expect(screen.getByText('Bitte gib deinen Nachnamen ein.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lehnt Ziffern und Tags am Feld ab', () => {
    setup()
    fill('Er1ka', '<b>Muster</b>')
    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sendet bereinigte Namen, dankt mit Namen und geht zur Start-Weiche', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ firstName: 'Erika', lastName: 'Muster' }) })
    setup()
    fill('  Erika ', 'Muster')
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/profile/name')
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ firstName: 'Erika', lastName: 'Muster' })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Danke, Erika!'))
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled()
    await act(async () => {
      vi.advanceTimersByTime(900)
    })
    expect(location.href).toBe('/start')
  })

  it('zeigt die Meldung des Servers am richtigen Feld', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Im Nachnamen sind nur Buchstaben erlaubt.', field: 'lastName' }),
    })
    setup()
    fill('Erika', 'Muster')
    expect(await screen.findByText('Im Nachnamen sind nur Buchstaben erlaubt.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weiter' })).not.toBeDisabled()
  })

  it('zeigt bei Netzwerkfehler einen Satz und lässt die Eingabe stehen', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    setup()
    fill('Erika', 'Muster')
    expect(await screen.findByText('Netzwerkfehler. Bitte versuche es erneut.')).toBeInTheDocument()
    expect(screen.getByLabelText('Vorname')).toHaveValue('Erika')
  })

  it('leitet bei 401 zum Login und bei 403 (keine Lehrer-Rolle mehr) zur Start-Weiche', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
    setup()
    fill('Erika', 'Muster')
    await waitFor(() => expect(location.href).toBe('/login'))
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    await waitFor(() => expect(location.href).toBe('/start'))
  })

  it('meldet über „Abmelden“ ab und geht zum Login', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }))
    await waitFor(() => expect(location.href).toBe('/login'))
    expect(signOut).toHaveBeenCalled()
  })
})
