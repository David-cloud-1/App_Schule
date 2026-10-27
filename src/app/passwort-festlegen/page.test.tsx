import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PasswortFestlegenPage from './page'

vi.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({ auth: { signOut: vi.fn(async () => ({})) } }),
}))

function fill(password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Passwort wiederholen'), { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: 'Speichern und weiter' }))
}

describe('Pflicht-Seite „Neues Passwort festlegen“ (PROJ-58)', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('prüft Länge und Wiederholung, bevor etwas gesendet wird', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<PasswortFestlegenPage />)
    fill('kurz')
    expect(await screen.findByText('Mindestens 8 Zeichen')).toBeInTheDocument()
    fill('LangGenug-22', 'Anders-33')
    expect(await screen.findByText('Passwörter stimmen nicht überein')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('zeigt die Meldung der Schnittstelle, z. B. bei wiederverwendetem Passwort', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bitte wähle ein anderes Passwort als das, das du bekommen hast.' }),
      })),
    )
    render(<PasswortFestlegenPage />)
    fill('Hafen-Kran-Birke-47')
    expect(await screen.findByRole('alert')).toHaveTextContent('anderes Passwort')
  })

  it('sendet an die eigene Passwort-Schnittstelle', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }))
    vi.stubGlobal('fetch', fetchMock)
    render(<PasswortFestlegenPage />)
    fill('MeinNeues-99')
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/account/password',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ password: 'MeinNeues-99' }) }),
      ),
    )
  })
})
