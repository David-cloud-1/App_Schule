import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ChecklistenUebersicht } from '@/components/checklisten/checklisten-uebersicht'
import { sichtbareSchritte } from '@/lib/checklisten/liste'
import { reisekostenAbrechnen } from '@/lib/checklisten/listen/reisekosten-abrechnen'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/checklisten' }))

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Übersicht der Checklisten (PROJ-122)', () => {
  it('zeigt beide Pilot-Listen mit „Für wen“ und Stand der Leitlinie', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ offen: [] }), { status: 200 }))
    render(<ChecklistenUebersicht />)
    expect(await screen.findByRole('link', { name: /Dienstreise beantragen/ })).toHaveAttribute('href', '/admin/checklisten/dienstreise-beantragen')
    expect(screen.getByRole('link', { name: /Reisekosten abrechnen/ })).toBeInTheDocument()
    expect(screen.getAllByText('Lehrkraft').length).toBe(2)
    expect(screen.getAllByText(/Stand 07\.05\.2025/).length).toBe(2)
    expect(screen.getByText(/Verbindlich ist das PDF der Schulleitung/)).toBeInTheDocument()
  })

  it('zeigt den Fortschritt angefangener Listen („3 von 6“)', async () => {
    const schritte = sichtbareSchritte(reisekostenAbrechnen, 'dienstreise')
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          offen: [
            { id: 'd', checkliste: 'reisekosten-abrechnen', variante: 'dienstreise', gestartet_am: '2026-11-20T08:00:00Z', archiviert_am: null, haken: schritte.slice(0, 2).map((s) => s.id) },
          ],
        }),
        { status: 200 },
      ),
    )
    render(<ChecklistenUebersicht />)
    expect(await screen.findByText(`Angefangen: 2 von ${schritte.length}`)).toBeInTheDocument()
  })

  it('bietet bei einem Fehler „Erneut versuchen“ an', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'))
    render(<ChecklistenUebersicht />)
    expect(await screen.findByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument()
  })
})
