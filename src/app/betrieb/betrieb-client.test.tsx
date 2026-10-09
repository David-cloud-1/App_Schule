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
    await screen.findByRole('heading', { name: 'Mein Betrieb' })
    expect(screen.getByText('Im Lager (1)')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pokal aus dem Lager wählen' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lagerhalle aus dem Lager wählen' })).toBeNull()
  })

  it('offers a text alternative for screen readers with status per item', async () => {
    antworten(STAND)
    renderClient()
    await screen.findByRole('heading', { name: 'Mein Betrieb' })
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
    await screen.findByRole('heading', { name: 'Mein Betrieb' })
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
    renderClient('TOUR')
    expect(await screen.findByText(/Hier entsteht bald/)).toBeTruthy()
    expect(document.querySelectorAll('svg[role="img"]').length).toBe(0)
  })
})
