import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DepartmentProvider } from '@/components/department-provider'
import { NEUTRAL_BRANDING } from '@/lib/departments'
import type { BetriebStand } from '@/lib/betrieb-stand'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }))
import { toast } from 'sonner'
import { BetriebClient } from './betrieb-client'

const item = (id: string, over: Partial<BetriebStand['items'][number]> = {}): BetriebStand['items'][number] => ({
  id,
  name: `Item ${id}`,
  description: '',
  category: 'fahrzeuge',
  icon_key: 'pokal',
  icon: null,
  rarity: 'standard',
  x: null,
  y: null,
  lebewesen: false,
  ...over,
})

const STAND: BetriebStand = {
  seite: 4,
  bis_naechstes_land: 2,
  items: [item('a', { name: 'Pokal' }), item('b', { name: 'Lagerhalle', icon_key: 'lagerhalle', x: 1, y: 1 })],
}

function renderClient(code = 'SPED') {
  return render(
    <DepartmentProvider value={{ department: { ...NEUTRAL_BRANDING, code, hofShortName: 'Betrieb' }, examParts: [] }}>
      <BetriebClient />
    </DepartmentProvider>,
  )
}

let fetchMock: ReturnType<typeof vi.fn>
function antworten(stand: BetriebStand | null, schreib: { ok: boolean; code?: string } = { ok: true }) {
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/betrieb') {
      return stand ? ({ ok: true, json: async () => stand } as Response) : ({ ok: false, json: async () => ({}) } as Response)
    }
    if (init?.method === 'PUT' || init?.method === 'DELETE') {
      return { ok: schreib.ok, json: async () => ({ code: schreib.code }) } as Response
    }
    return { ok: false, json: async () => ({}) } as Response
  })
  vi.stubGlobal('fetch', fetchMock)
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('Seite „Mein Betrieb" (PROJ-34)', () => {
  it('shows the title from the department data, the land size and the items in the world', async () => {
    antworten(STAND)
    renderClient()
    expect(await screen.findByRole('heading', { name: 'Mein Betrieb' })).toBeTruthy()
    expect(screen.getByText(/Land 4 × 4/)).toBeTruthy()
    expect(screen.getByText(/noch 2 Käufe bis zur Erweiterung/)).toBeTruthy()
    expect(document.querySelectorAll('[data-item]').length).toBe(1)
  })

  it('lists stored items in the storage bar and placed items only in the world', async () => {
    antworten(STAND)
    renderClient()
    await screen.findByText(/Land 4 × 4/)
    expect(screen.getByText('Im Lager (1)')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pokal aus dem Lager wählen' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lagerhalle aus dem Lager wählen' })).toBeNull()
  })

  it('offers a text alternative for screen readers with status per item', async () => {
    antworten(STAND)
    renderClient()
    await screen.findByText(/Land 4 × 4/)
    expect(screen.getByText(/Pokal – im Lager/)).toBeTruthy()
    expect(screen.getByText(/Lagerhalle – steht auf Reihe 2, Spalte 2/)).toBeTruthy()
  })

  it('selecting a stored item marks all free tiles and shows the instruction', async () => {
    antworten(STAND)
    renderClient()
    fireEvent.click(await screen.findByRole('button', { name: 'Pokal aus dem Lager wählen' }))
    expect(screen.getByText(/tippe eine freie Kachel/)).toBeTruthy()
    // 16 Kacheln, davon 1 belegt
    expect(document.querySelectorAll('[data-frei]').length).toBe(15)
    expect(screen.getByRole('button', { name: 'Pokal aus dem Lager wählen' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('deselects on a second tap and via the close button', async () => {
    antworten(STAND)
    renderClient()
    const knopf = await screen.findByRole('button', { name: 'Pokal aus dem Lager wählen' })
    fireEvent.click(knopf)
    fireEvent.click(knopf)
    expect(document.querySelectorAll('[data-frei]').length).toBe(0)
    fireEvent.click(knopf)
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl aufheben' }))
    expect(document.querySelectorAll('[data-frei]').length).toBe(0)
  })

  it('places a stored item via the list alternative and sends the right request', async () => {
    antworten(STAND)
    renderClient()
    fireEvent.click(await screen.findByRole('button', { name: 'Pokal aus dem Lager wählen' }))
    fireEvent.click(screen.getByText('Per Liste setzen'))
    fireEvent.change(screen.getByLabelText('Freie Kachel wählen'), { target: { value: '2,3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Setzen' }))
    await waitFor(() => expect(document.querySelectorAll('[data-item]').length).toBe(2))
    const put = fetchMock.mock.calls.find((c) => c[1]?.method === 'PUT')!
    expect(put[0]).toBe('/api/betrieb/platzierung')
    expect(JSON.parse(put[1].body)).toEqual({ item_id: 'a', x: 2, y: 3 })
    expect(screen.queryByText('Im Lager (1)')).toBeNull()
  })

  it('does not offer the tile of another item in the list', async () => {
    antworten(STAND)
    renderClient()
    fireEvent.click(await screen.findByRole('button', { name: 'Pokal aus dem Lager wählen' }))
    fireEvent.click(screen.getByText('Per Liste setzen'))
    expect(screen.queryByRole('option', { name: 'Reihe 2, Spalte 2' })).toBeNull()
    expect(screen.getByRole('option', { name: 'Reihe 1, Spalte 1' })).toBeTruthy()
  })

  it('rolls back and shows a readable message when the tile was taken meanwhile', async () => {
    antworten(STAND, { ok: false, code: 'tile_taken' })
    renderClient()
    fireEvent.click(await screen.findByRole('button', { name: 'Pokal aus dem Lager wählen' }))
    fireEvent.click(screen.getByText('Per Liste setzen'))
    fireEvent.change(screen.getByLabelText('Freie Kachel wählen'), { target: { value: '0,0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Setzen' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Auf dieser Kachel steht schon etwas.'))
    // zurück im Lager (Stand wurde neu geladen)
    await waitFor(() => expect(screen.getByText('Im Lager (1)')).toBeTruthy())
  })

  it('shows a friendly message on network errors', async () => {
    antworten(STAND)
    renderClient()
    fireEvent.click(await screen.findByRole('button', { name: 'Pokal aus dem Lager wählen' }))
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') throw new Error('offline')
      return { ok: true, json: async () => STAND } as Response
    })
    fireEvent.click(screen.getByText('Per Liste setzen'))
    fireEvent.change(screen.getByLabelText('Freie Kachel wählen'), { target: { value: '0,0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Setzen' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Keine Verbindung. Versuch es gleich noch einmal.'))
  })

  it('has zoom and centre controls with accessible names', async () => {
    antworten(STAND)
    renderClient()
    await screen.findByText(/Land 4 × 4/)
    for (const name of ['Hineinzoomen', 'Herauszoomen', 'Zentrieren']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('shows an invitation with a shop link when nothing has been bought', async () => {
    antworten({ seite: 4, items: [], bis_naechstes_land: 3 })
    renderClient()
    expect(await screen.findByText(/Noch nichts gekauft/)).toBeTruthy()
    // Kopfzeile und Einladungstext verlinken beide den Shop
    expect(screen.getAllByRole('link', { name: 'Zum Shop' }).length).toBe(2)
  })

  it('shows a retry option when loading fails, and reloads on click', async () => {
    antworten(null)
    renderClient()
    const retry = await screen.findByRole('button', { name: 'Erneut versuchen' })
    antworten(STAND)
    fireEvent.click(retry)
    expect(await screen.findByText(/Land 4 × 4/)).toBeTruthy()
  })

  it('shows a notice instead of the world for a department without sprites yet', async () => {
    antworten(STAND)
    renderClient('UNBEKANNT')
    expect(await screen.findByText(/Hier entsteht bald/)).toBeTruthy()
    expect(document.querySelectorAll('svg[role="img"]').length).toBe(0)
  })

  it('plays the placement animation on the item that was just placed, then removes it', async () => {
    antworten(STAND)
    renderClient()
    fireEvent.click(await screen.findByRole('button', { name: 'Pokal aus dem Lager wählen' }))
    fireEvent.click(screen.getByText('Per Liste setzen'))
    fireEvent.change(screen.getByLabelText('Freie Kachel wählen'), { target: { value: '2,3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Setzen' }))
    await waitFor(() => expect(document.querySelector('[data-item="a"]')?.getAttribute('class')).toContain('betrieb-plop'))
    await waitFor(() => expect(document.querySelector('[data-item="a"]')?.getAttribute('class')).toBeNull(), { timeout: 2000 })
  })

  it('selects and highlights a freshly bought item from ?neu=… and lets it hop', async () => {
    window.history.replaceState({}, '', '/betrieb?neu=a')
    antworten(STAND)
    renderClient()
    const chip = await screen.findByRole('button', { name: 'Pokal aus dem Lager wählen' })
    await waitFor(() => expect(chip.getAttribute('aria-pressed')).toBe('true'))
    expect(chip.className).toContain('betrieb-huepf')
    expect(document.querySelectorAll('[data-frei]').length).toBe(15)
    window.history.replaceState({}, '', '/')
  })

  it('ignores ?neu=… for an item that is not in storage (already placed or unknown)', async () => {
    window.history.replaceState({}, '', '/betrieb?neu=b')
    antworten(STAND)
    renderClient()
    await screen.findByText(/Land 4 × 4/)
    expect(document.querySelectorAll('[data-frei]').length).toBe(0)
    window.history.replaceState({}, '', '/')
  })

  it('announces and animates a land that has grown since the last visit', async () => {
    localStorage.setItem('betrieb-land-SPED', '4')
    antworten({ ...STAND, seite: 5 })
    renderClient()
    await screen.findByText(/Land 5 × 5/)
    // Effekte laufen nach dem Rendern: auf das Ergebnis warten statt auf den Text
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Dein Land ist gewachsen!'))
    expect(document.querySelectorAll('.betrieb-wachse').length).toBe(25 - 16)
    expect(localStorage.getItem('betrieb-land-SPED')).toBe('5')
  })

  it('stays quiet on the first visit and when the land did not grow', async () => {
    localStorage.clear()
    antworten(STAND)
    renderClient()
    await screen.findByText(/Land 4 × 4/)
    await waitFor(() => expect(localStorage.getItem('betrieb-land-SPED')).toBe('4'))
    expect(toast).not.toHaveBeenCalledWith('Dein Land ist gewachsen!')
    expect(document.querySelectorAll('.betrieb-wachse').length).toBe(0)
  })

  describe('Figuren (PROJ-37)', () => {
    const MIT_HOTEL: BetriebStand = {
      seite: 6,
      bis_naechstes_land: 2,
      items: [item('h', { name: 'Strandhotel', icon_key: 'hotel', x: 3, y: 3 }), item('f', { name: 'Flamingo', icon_key: 'flamingo', lebewesen: true })],
    }
    const positionen = () => [...document.querySelectorAll('[data-figur]')].map((g) => `${g.getAttribute('data-figur')}:${g.getAttribute('style')}`)

    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    })

    it('shows animals and guests: the flamingo plus the hotel guests, but no storage entry for the animal', async () => {
      antworten(MIT_HOTEL)
      renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      await waitFor(() => expect(document.querySelectorAll('[data-figur]').length).toBe(3)) // Flamingo + 2 Hotelgäste
      expect(document.querySelectorAll('[data-tier]').length).toBe(1)
      expect(screen.queryByText(/Im Lager/)).toBeNull()
      expect(screen.queryByRole('button', { name: 'Flamingo aus dem Lager wählen' })).toBeNull()
      expect(screen.getByText(/Flamingo – läuft frei herum/)).toBeTruthy()
      expect(screen.getByText(/Deine Tiere laufen frei herum/)).toBeTruthy()
    })

    it('shows no guests when the hotel is in storage, and no storage slot for animals either', async () => {
      antworten({ ...MIT_HOTEL, items: [item('h', { name: 'Strandhotel', icon_key: 'hotel' }), item('f', { name: 'Flamingo', icon_key: 'flamingo', lebewesen: true })] })
      renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      await waitFor(() => expect(document.querySelectorAll('[data-figur]').length).toBe(1))
      expect(screen.getByText('Im Lager (1)')).toBeTruthy()
    })

    it('lets the figures walk over time (positions change)', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      antworten(MIT_HOTEL)
      renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      await waitFor(() => expect(document.querySelectorAll('[data-figur]').length).toBe(3))
      const vorher = positionen()
      await vi.advanceTimersByTimeAsync(12000)
      expect(positionen()).not.toEqual(vorher)
      expect(document.querySelectorAll('[data-figur]').length).toBe(3)
    })

    it('keeps the figures off occupied tiles while walking', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      antworten(MIT_HOTEL)
      renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      for (let i = 0; i < 40; i++) {
        await vi.advanceTimersByTimeAsync(500)
        for (const g of document.querySelectorAll('[data-figur]')) {
          const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(g.getAttribute('style') ?? '')!
          // Rückrechnung Welt -> Gitter: gx - gy = x/49.5, gx + gy = y/25
          const a = Number(m[1]) / 49.5
          const b = Number(m[2]) / 25
          const gx = (a + b) / 2 - 1
          const gy = (b - a) / 2 - 1
          // das Hotel steht auf (3,3): keine Figur steht jemals darauf
          expect(Math.round(gx) === 3 && Math.round(gy) === 3).toBe(false)
        }
      }
    })

    it('pauses while the tab is hidden and does not jump when it comes back', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      antworten(MIT_HOTEL)
      renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      await waitFor(() => expect(document.querySelectorAll('[data-figur]').length).toBe(3))
      await vi.advanceTimersByTimeAsync(2000)
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      const versteckt = positionen()
      await vi.advanceTimersByTimeAsync(20000)
      expect(positionen()).toEqual(versteckt)
    })

    it('keeps everything still when the device asks to reduce motion, but still shows the figures', async () => {
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }))
      vi.useFakeTimers({ shouldAdvanceTime: true })
      antworten(MIT_HOTEL)
      renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      await waitFor(() => expect(document.querySelectorAll('[data-figur]').length).toBe(3))
      const vorher = positionen()
      await vi.advanceTimersByTimeAsync(15000)
      expect(positionen()).toEqual(vorher)
    })

    it('starts the figures at the same places on every load (deterministic seeds)', async () => {
      antworten(MIT_HOTEL)
      const a = renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      await waitFor(() => expect(document.querySelectorAll('[data-figur]').length).toBe(3))
      const erste = positionen().sort()
      a.unmount()
      renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      await waitFor(() => expect(document.querySelectorAll('[data-figur]').length).toBe(3))
      expect(positionen().sort()).toEqual(erste)
    })

    it('does not restart its timer on every render (one loop, not one per tick)', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const spy = vi.spyOn(globalThis, 'setInterval')
      antworten(MIT_HOTEL)
      renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      await vi.advanceTimersByTimeAsync(8000)
      // Eine Schleife für die Figuren (plus ggf. Nachlade-Runden); nicht ~64 (ein Neustart je Takt)
      expect(spy.mock.calls.length).toBeLessThanOrEqual(6)
      spy.mockRestore()
    })

    it('stops the loop when the page is left (no timers keep running)', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      antworten(MIT_HOTEL)
      const { unmount } = renderClient('TOUR')
      await screen.findByText(/Land 6 × 6/)
      await vi.advanceTimersByTimeAsync(1000)
      unmount()
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
