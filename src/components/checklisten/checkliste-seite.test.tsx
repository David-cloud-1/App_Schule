import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { CheckListeSeite } from '@/components/checklisten/checkliste-seite'
import { sichtbareSchritte } from '@/lib/checklisten/liste'
import { reisekostenAbrechnen } from '@/lib/checklisten/listen/reisekosten-abrechnen'
import type { Durchlauf } from '@/lib/checklisten/katalog'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/checklisten/reisekosten-abrechnen' }))

const LISTE = 'reisekosten-abrechnen'
const ORIGINAL = [
  {
    schluessel: 'klassenfahrt',
    titel: 'Voraussetzungen Klassenfahrt',
    bereich: '2.1',
    stand: null,
    geaendert: false,
    bloecke: [{ id: 'b1', art: 'absatz' as const, text: 'Private Ausgaben der Lehrkraft werden nicht erstattet.' }],
  },
]
const ANKER = { privat: { quelle: 'klassenfahrt', block: 'b1' }, 'antrag-stellen': { quelle: 'klassenfahrt', block: 'b1' } }

function durchlauf(over: Partial<Durchlauf> = {}): Durchlauf {
  return { id: 'd1', checkliste: LISTE, variante: 'dienstreise', gestartet_am: '2026-11-20T08:00:00Z', archiviert_am: null, haken: [], ...over }
}

let fetchMock: ReturnType<typeof vi.fn>
function antworte(offen: Durchlauf | null, fruehere: unknown[] = []) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (!init?.method || init.method === 'GET') return new Response(JSON.stringify({ offen, fruehere }), { status: 200 })
    return new Response(JSON.stringify({ durchlaufId: 'd1' }), { status: 200 })
  })
}
const schreibende = () => fetchMock.mock.calls.filter(([, init]) => init?.method && init.method !== 'GET')

function zeige() {
  return render(<CheckListeSeite listeId={LISTE} originale={ORIGINAL} anker={ANKER} />)
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.mocked(toast.error).mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Checkliste (PROJ-122)', () => {
  it('zeigt vor der Variantenwahl nur die Auswahl, keine Schritte', async () => {
    antworte(null)
    zeige()
    expect(await screen.findByText('Wofür rechnest du ab?')).toBeInTheDocument()
    expect(screen.getByText(/Wähle oben den Fall aus/)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('zeigt nach der Wahl die passenden Schritte und speichert die Variante', async () => {
    antworte(null)
    zeige()
    fireEvent.click(await screen.findByRole('radio', { name: 'Klassenfahrt' }))
    await waitFor(() => expect(schreibende()).toHaveLength(1))
    expect(schreibende()[0][0]).toBe(`/api/admin/checklisten/${LISTE}/variante`)
    expect(JSON.parse(schreibende()[0][1].body)).toEqual({ variante: 'klassenfahrt' })
    expect(screen.getAllByRole('checkbox').length).toBe(sichtbareSchritte(reisekostenAbrechnen, 'klassenfahrt').length)
  })

  it('hakt sofort ab, sendet den gewünschten Zustand und zeigt den Fortschritt', async () => {
    antworte(durchlauf())
    zeige()
    const erster = (await screen.findAllByRole('checkbox'))[0]
    expect(erster).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(erster)
    expect(erster).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    await waitFor(() => expect(schreibende()).toHaveLength(1))
    expect(JSON.parse(schreibende()[0][1].body)).toMatchObject({ schritt: 'antrag-original-beilegen', erledigt: true })
  })

  it('beschriftet jeden Haken mit Nummer, Satz und Zustand', async () => {
    antworte(durchlauf({ haken: ['antrag-original-beilegen'] }))
    zeige()
    expect(
      await screen.findByRole('checkbox', {
        name: 'Schritt 1: Das genehmigte Original des Dienstreiseantrags beilegen, erledigt',
      }),
    ).toBeInTheDocument()
  })

  it('ignoriert einen Doppelklick während des Speicherns', async () => {
    antworte(durchlauf())
    zeige()
    const erster = (await screen.findAllByRole('checkbox'))[0]
    fireEvent.click(erster)
    fireEvent.click(erster)
    await waitFor(() => expect(schreibende()).toHaveLength(1))
  })

  it('setzt den Haken zurück und meldet es verständlich, wenn das Speichern scheitert', async () => {
    antworte(durchlauf())
    fetchMock.mockImplementation(async (_u: string, init?: RequestInit) =>
      !init?.method
        ? new Response(JSON.stringify({ offen: durchlauf(), fruehere: [] }), { status: 200 })
        : Promise.reject(new TypeError('offline')),
    )
    zeige()
    const erster = (await screen.findAllByRole('checkbox'))[0]
    fireEvent.click(erster)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Keine Verbindung. Das wurde nicht gespeichert.'))
    expect(erster).toHaveAttribute('aria-checked', 'false')
  })

  it('führt die Frist von sechs Monaten und kennzeichnet sie bei Dienstreisen als Annahme', async () => {
    antworte(durchlauf({ variante: 'dienstreise' }))
    zeige()
    expect(await screen.findByText(/innerhalb von sechs Monaten nach der Reise/)).toBeInTheDocument()
    expect(screen.getAllByText(/Annahme/).length).toBeGreaterThan(0)
  })

  it('zeigt Abschluss, Neu starten fragt nach und legt erst nach Bestätigung einen neuen Durchlauf an', async () => {
    const alle = sichtbareSchritte(reisekostenAbrechnen, 'dienstreise').map((s) => s.id)
    antworte(durchlauf({ haken: alle }))
    zeige()
    expect(await screen.findByText('Alles erledigt')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Neu starten/ }))
    expect(await screen.findByText('Neuen Durchlauf beginnen?')).toBeInTheDocument()
    expect(schreibende()).toHaveLength(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Neu starten' }).at(-1)!)
    await waitFor(() => expect(schreibende()).toHaveLength(1))
    expect(schreibende()[0][0]).toBe(`/api/admin/checklisten/${LISTE}/neu`)
  })

  it('zeigt frühere Durchläufe nur zum Lesen', async () => {
    antworte(durchlauf(), [
      { id: 'a', variante: 'klassenfahrt', gestartet_am: '2026-10-01T08:00:00Z', archiviert_am: '2026-10-12T08:00:00Z', anzahl_haken: 5 },
    ])
    zeige()
    fireEvent.click(await screen.findByRole('button', { name: /Frühere Durchläufe \(1\)/ }))
    expect(await screen.findByText(/5 Schritte abgehakt/)).toBeInTheDocument()
  })

  it('springt mit „Im Original ansehen“ zum Original', async () => {
    antworte(durchlauf())
    zeige()
    fireEvent.click((await screen.findAllByRole('button', { name: /Im Original ansehen/ }))[0])
    await waitFor(() => expect(document.getElementById('original-klassenfahrt-b1')).toHaveClass('ring-2'))
  })

  it('warnt, wenn sich die Leitlinie seit dem Schreiben der Liste geändert hat', async () => {
    antworte(durchlauf())
    render(<CheckListeSeite listeId={LISTE} originale={[{ ...ORIGINAL[0], geaendert: true }]} anker={ANKER} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/wurde geändert.*Bitte im Original prüfen/)
  })

  it('zeigt einen Fehlerzustand mit „Erneut versuchen“, wenn das Laden scheitert', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    zeige()
    expect(await screen.findByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument()
  })
})
