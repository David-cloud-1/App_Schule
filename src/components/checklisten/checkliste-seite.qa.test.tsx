import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CheckListeSeite } from '@/components/checklisten/checkliste-seite'
import { sichtbareSchritte } from '@/lib/checklisten/liste'
import { reisekostenAbrechnen } from '@/lib/checklisten/listen/reisekosten-abrechnen'
import type { Durchlauf } from '@/lib/checklisten/katalog'

/**
 * QA PROJ-122 (2026-11-23): Zwei-Geräte-Abgleich, „Neu starten“ und Druck.
 * BUG-1 (Neuladen überschreibt Haken) und BUG-2 (Druck nach „Im Original ansehen“)
 * sind behoben; die Tests halten das fest.
 */

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
const ANKER = { 'antrag-original-beilegen': { quelle: 'klassenfahrt', block: 'b1' } }

function durchlauf(over: Partial<Durchlauf> = {}): Durchlauf {
  return { id: 'd1', checkliste: LISTE, variante: 'dienstreise', gestartet_am: '2026-11-20T08:00:00Z', archiviert_am: null, haken: [], ...over }
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

let fetchMock: ReturnType<typeof vi.fn>
const zeige = () => render(<CheckListeSeite listeId={LISTE} originale={ORIGINAL} anker={ANKER} />)
const gets = () => fetchMock.mock.calls.filter(([, init]) => !init?.method || init.method === 'GET')
function tabWiederSichtbar() {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('QA PROJ-122 – Zwei Geräte (visibilitychange)', () => {
  it('holt beim Zurückkehren in den Tab den Stand frisch, wenn nichts gespeichert wird', async () => {
    let serverHaken: string[] = []
    fetchMock.mockImplementation(async () => json({ offen: durchlauf({ haken: serverHaken }), fruehere: [] }))
    zeige()
    const erster = (await screen.findAllByRole('checkbox'))[0]
    expect(erster).toHaveAttribute('aria-checked', 'false')
    serverHaken = ['antrag-original-beilegen'] // auf dem anderen Gerät abgehakt
    tabWiederSichtbar()
    await waitFor(() => expect(erster).toHaveAttribute('aria-checked', 'true'))
  })

  it('lädt nicht neu, solange ein Haken gespeichert wird', async () => {
    let putFertig: (r: Response) => void = () => {}
    fetchMock.mockImplementation((_u: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? new Promise<Response>((r) => (putFertig = r))
        : Promise.resolve(json({ offen: durchlauf(), fruehere: [] })),
    )
    zeige()
    fireEvent.click((await screen.findAllByRole('checkbox'))[0])
    const vorher = gets().length
    tabWiederSichtbar()
    expect(gets().length).toBe(vorher)
    await act(async () => putFertig(json({ durchlaufId: 'd1' })))
  })

  // BUG-1: Ein Neuladen, das VOR dem Klick losging, überschreibt danach den gerade gesetzten Haken.
  it('behält einen Haken, der gesetzt wurde, während ein Neuladen unterwegs war', async () => {
    let getNr = 0
    let spaetesGet: (r: Response) => void = () => {}
    fetchMock.mockImplementation((_u: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return Promise.resolve(json({ durchlaufId: 'd1' }))
      getNr += 1
      if (getNr === 1) return Promise.resolve(json({ offen: durchlauf(), fruehere: [] }))
      // zweites GET: Stand von VOR dem Klick, kommt erst nach dem Speichern an
      return new Promise<Response>((r) => (spaetesGet = r))
    })
    zeige()
    const erster = (await screen.findAllByRole('checkbox'))[0]
    tabWiederSichtbar() // Neuladen startet
    fireEvent.click(erster) // Haken wird gesetzt und gespeichert
    await waitFor(() => expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(true))
    await act(async () => spaetesGet(json({ offen: durchlauf({ haken: [] }), fruehere: [] })))
    expect(erster).toHaveAttribute('aria-checked', 'true')
  })
})

describe('QA PROJ-122 – Neu starten', () => {
  it('zeigt nach „Neu starten“ keine alten Haken mehr und die Variantenwahl wieder', async () => {
    const alle = sichtbareSchritte(reisekostenAbrechnen, 'dienstreise').map((s) => s.id)
    let neu = false
    fetchMock.mockImplementation(async (_u: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        neu = true
        return json({ durchlaufId: 'd2' }, 201)
      }
      return neu
        ? json({ offen: durchlauf({ id: 'd2', variante: null, haken: [] }), fruehere: [{ id: 'd1', variante: 'dienstreise', gestartet_am: '2026-11-20T08:00:00Z', archiviert_am: '2026-11-23T08:00:00Z', anzahl_haken: alle.length }] })
        : json({ offen: durchlauf({ haken: alle }), fruehere: [] })
    })
    zeige()
    fireEvent.click(await screen.findByRole('button', { name: /Neu starten/ }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Neu starten' })).at(-1)!)
    expect(await screen.findByText(/Wähle oben den Fall aus/)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /Frühere Durchläufe \(1\)/ })).toBeInTheDocument()
  })
})

describe('QA PROJ-122 – Tastatur', () => {
  it('ist ein Knopf mit role=checkbox (Leertaste/Enter lösen nativ einen Klick aus)', async () => {
    fetchMock.mockImplementation(async () => json({ offen: durchlauf(), fruehere: [] }))
    zeige()
    const erster = (await screen.findAllByRole('checkbox'))[0]
    expect(erster.tagName).toBe('BUTTON')
    expect(erster).toHaveAttribute('type', 'button')
  })
})

describe('QA PROJ-122 – Druck', () => {
  // BUG-2: Nach „Im Original ansehen“ ist die Checkliste unterhalb von 1024 px (auch im Druck) versteckt,
  // das Original ist im Druck ausgeblendet – das Blatt bleibt leer.
  it('lässt die Checkliste auch nach „Im Original ansehen“ im Druck sichtbar', async () => {
    fetchMock.mockImplementation(async () => json({ offen: durchlauf(), fruehere: [] }))
    zeige()
    fireEvent.click((await screen.findAllByRole('button', { name: /Im Original ansehen/ }))[0])
    const liste = screen.getByRole('region', { name: 'Checkliste' })
    await waitFor(() => expect(liste.className).toMatch(/\bhidden\b/))
    expect(liste.className).toMatch(/print:block/)
  })
})
