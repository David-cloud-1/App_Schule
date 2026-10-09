import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DepartmentProvider } from '@/components/department-provider'
import { NEUTRAL_BRANDING } from '@/lib/departments'
import type { BetriebStand } from '@/lib/betrieb-stand'
import { BetriebVorschau } from './betrieb-vorschau'

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

function renderMit(code: string) {
  return render(
    <DepartmentProvider value={{ department: { ...NEUTRAL_BRANDING, code, hofName: 'Betrieb', hofShortName: 'Betrieb' }, examParts: [] }}>
      <BetriebVorschau />
    </DepartmentProvider>,
  )
}

function antworten(stand: BetriebStand | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => (stand ? ({ ok: true, json: async () => stand } as Response) : ({ ok: false, json: async () => ({}) } as Response))),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('Profil-Vorschau Mein Betrieb (PROJ-34)', () => {
  it('shows a static preview of the world with a link to the full page', async () => {
    antworten({ seite: 4, bis_naechstes_land: 1, items: [item('a', { x: 1, y: 1 }), item('b')] })
    renderMit('SPED')
    expect(await screen.findByText('Mein Betrieb')).toBeTruthy()
    const links = await screen.findAllByRole('link')
    expect(links.every((l) => l.getAttribute('href') === '/betrieb')).toBe(true)
    expect(document.querySelectorAll('[data-item]').length).toBe(1)
    expect(screen.getByText(/1 von 2 gesetzt – Items warten im Lager/)).toBeTruthy()
  })

  it('makes the preview non-interactive so a tap opens the page instead of selecting things', async () => {
    antworten({ seite: 4, bis_naechstes_land: 3, items: [item('a', { x: 0, y: 0 })] })
    renderMit('SPED')
    await screen.findByText(/1 von 1 gesetzt/)
    expect(document.querySelector('svg')!.getAttribute('class')).toContain('pointer-events-none')
  })

  it('invites to the shop when nothing was bought yet', async () => {
    antworten({ seite: 4, bis_naechstes_land: 3, items: [] })
    renderMit('SPED')
    expect(await screen.findByText(/Noch nichts für deinen Betrieb gekauft/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Zum Betrieb' }).getAttribute('href')).toBe('/shop')
  })

  it('offers a text alternative for screen readers', async () => {
    antworten({ seite: 4, bis_naechstes_land: 3, items: [item('a', { name: 'Pokal', x: 0, y: 0, rarity: 'episch' }), item('b', { name: 'Kiste' })] })
    renderMit('SPED')
    expect(await screen.findByText(/Pokal – steht im Betrieb – Episch/)).toBeTruthy()
    expect(screen.getByText(/Kiste – im Lager/)).toBeTruthy()
  })

  it('renders nothing when loading fails', async () => {
    antworten(null)
    const { container } = renderMit('SPED')
    await new Promise((r) => setTimeout(r, 20))
    expect(container.textContent).toBe('')
  })

  it('keeps the old flat gallery for departments without an isometric world (Tourismus until PROJ-35)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ items: [], owned_items: [] }) }) as Response))
    renderMit('TOUR')
    expect(await screen.findByText(/Mein Betrieb/)).toBeTruthy()
    // keine isometrische Welt
    expect(document.querySelectorAll('svg[role="img"]').length).toBe(0)
  })
})
