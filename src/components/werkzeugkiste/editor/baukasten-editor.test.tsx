import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { mockViewport, renderInWorkspace } from '@/components/admin/workspace-test-utils'
import type { EditorDaten, Struktur } from '@/lib/werkzeugkiste-editor'

const api = vi.hoisted(() => ({
  ladeEditor: vi.fn(),
  speichereEntwurf: vi.fn(),
  verwirfEntwurf: vi.fn(),
  baueEntwurfVorschau: vi.fn(),
  veroeffentlicheEntwurf: vi.fn(),
  blockAlsRohfassung: vi.fn(),
  rohfassungLesen: vi.fn(),
}))
vi.mock('@/lib/werkzeugkiste-api', async (original) => ({
  ...(await original<typeof import('@/lib/werkzeugkiste-api')>()),
  ...api,
}))
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { BaukastenEditor } from './baukasten-editor'
import { mitSprungSkript } from './use-editor-zustand'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

const ID = '11111111-1111-4111-8111-111111111111'
const STRUKTUR: Struktur = {
  cover: { title: 'Haftung im Frachtrecht' },
  chapters: [
    {
      title: 'Grundlagen',
      elements: [
        { type: 'text', content: '<h2>Grundlagen</h2><p>Der Frachtführer haftet.</p>' },
        { type: 'fill_blanks', text: 'Der *Frachtführer* haftet.' },
      ],
    },
    { title: 'Haftungsgrenzen', elements: [] },
  ],
  final_chapter: { title: 'Lernzielkontrolle' },
}
const DATEN: EditorDaten = {
  id: ID,
  titel: 'Mein Material',
  werkzeug: 'skript',
  struktur: STRUKTUR,
  stand: null,
  befunde: null,
  oeffentlich: true,
  imRegal: false,
}

function oeffneMenu(name: RegExp) {
  fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockViewport(1440)
  api.ladeEditor.mockResolvedValue(DATEN)
  api.speichereEntwurf.mockImplementation(async () => ({ stand: `stand-${api.speichereEntwurf.mock.calls.length}` }))
  api.baueEntwurfVorschau.mockResolvedValue({
    adresse: 'https://speicher.test/entwurf.html',
    befunde: [{ text: 'Kapitel 1 – Keine richtige Antwort', schwere: 'hoch', stellen: [{ kapitel: 0, element: 1 }] }],
    groesse: 1000,
    stand: null,
  })
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><body><p>Seite</p></body></html>')))
})

describe('Baukasten-Editor', () => {
  it('zeigt Deckblatt, Themen und Blöcke in Klartext und die Hinweise der Prüfstelle', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    expect(await screen.findByRole('heading', { name: 'Mein Material' })).toBeInTheDocument()
    const gliederung = screen.getByRole('region', { name: 'Gliederung' })
    expect(within(gliederung).getByText('Haftung im Frachtrecht')).toBeInTheDocument()
    expect(within(gliederung).getByText('Grundlagen', { selector: 'span' })).toBeInTheDocument()
    expect(within(gliederung).getByText('Lehrtext')).toBeInTheDocument()
    expect(within(gliederung).getByText('Lückentext')).toBeInTheDocument()
    expect(within(gliederung).getByText('Der Frachtführer haftet.', { selector: '.truncate' })).toBeInTheDocument()
    expect(within(gliederung).getByText('Noch keine Blöcke')).toBeInTheDocument()
    // Hinweis hängt am Lückentext (Thema 1, Block 2)
    expect(await screen.findByText(/Hinweise der Prüfstelle \(1\)/)).toBeInTheDocument()
    expect(screen.getAllByTitle(/Hinweis der Prüfstelle zu Lückentext/)).toHaveLength(1)
  })

  it('zeigt die echte Seite abgeschottet in der Vorschau', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = await screen.findByTitle('Vorschau der Seite')
    expect(rahmen).toHaveAttribute('sandbox', 'allow-scripts')
    expect(rahmen.getAttribute('srcdoc')).toContain('<p>Seite</p>')
    expect(rahmen.getAttribute('srcdoc')).toContain('addEventListener("message"')
  })

  it('löscht einen Block, speichert automatisch und macht es rückgängig', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByText('Lückentext')
    oeffneMenu(/Weitere Aktionen für Lückentext/)
    fireEvent.click(await screen.findByRole('menuitem', { name: /Löschen/ }))
    expect(screen.queryByText('Lückentext')).not.toBeInTheDocument()

    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalledTimes(1), { timeout: 3000 })
    const [id, gespeichert, stand] = api.speichereEntwurf.mock.calls[0]
    expect(id).toBe(ID)
    expect(stand).toBeNull()
    expect(gespeichert.chapters[0].elements).toHaveLength(1)
    expect(await screen.findByText('Entwurf gespeichert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Rückgängig/ }))
    expect(screen.getByText('Lückentext')).toBeInTheDocument()
    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalledTimes(2), { timeout: 3000 })
    // Der zweite Speichervorgang kennt den Stand des ersten
    expect(api.speichereEntwurf.mock.calls[1][2]).toBe('stand-1')
    expect(api.speichereEntwurf.mock.calls[1][1].chapters[0].elements).toHaveLength(2)
  })

  it('verschiebt einen Block ohne Maus über das Menü', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByText('Lückentext')
    oeffneMenu(/Weitere Aktionen für Lehrtext/)
    fireEvent.click(await screen.findByRole('menuitem', { name: /Nach unten/ }))
    const namen = screen.getAllByText(/^(Lehrtext|Lückentext)$/).map((e) => e.textContent)
    expect(namen).toEqual(['Lückentext', 'Lehrtext'])
  })

  it('ändert das Deckblatt und fasst das Tippen zu einem Rückgängig-Schritt zusammen', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    fireEvent.click(await screen.findByRole('button', { name: /Deckblatt/ }))
    const titel = screen.getByLabelText('Titel')
    fireEvent.change(titel, { target: { value: 'Haftung im Frachtrecht!' } })
    fireEvent.change(titel, { target: { value: 'Haftung im Frachtrecht!!' } })
    fireEvent.click(screen.getByRole('button', { name: /Rückgängig/ }))
    expect(screen.getByLabelText('Titel')).toHaveValue('Haftung im Frachtrecht')
  })

  it('zeigt einen Konflikt mit einem anderen Fenster und speichert dann nicht mehr', async () => {
    api.speichereEntwurf.mockRejectedValue(new WerkzeugFehler('Dieses Material wurde in einem anderen Fenster geändert.', 409))
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByText('Lückentext')
    fireEvent.click(screen.getByRole('button', { name: /Thema hinzufügen/ }))
    expect(await screen.findByText(/in einem anderen Fenster geändert/, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Veröffentlichen' })).toBeDisabled()
  })

  it('veröffentlicht nach Bestätigung mit dem gespeicherten Stand', async () => {
    api.ladeEditor.mockResolvedValue({ ...DATEN, stand: 'stand-alt' })
    api.veroeffentlicheEntwurf.mockResolvedValue({ befunde: [] })
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByText('Lückentext')
    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichen' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/öffentlichen Link/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Veröffentlichen' }))
    await waitFor(() => expect(api.veroeffentlicheEntwurf).toHaveBeenCalledWith(ID, 'stand-alt'))
  })

  it('ohne Änderungen gibt es nichts zu veröffentlichen', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByText('Lückentext')
    expect(screen.getByRole('button', { name: 'Veröffentlichen' })).toBeDisabled()
  })

  it('zeigt einen verständlichen Fehler, wenn das Material nicht geht', async () => {
    api.ladeEditor.mockRejectedValue(new WerkzeugFehler('Dieses Material lässt sich im Baukasten nicht bearbeiten.', 400))
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    expect(await screen.findByText('Dieses Material lässt sich im Baukasten nicht bearbeiten.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument()
  })

  it('schaltet auf dem Handy zwischen Gliederung und Vorschau um', async () => {
    mockViewport(390)
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    expect(await screen.findByRole('radiogroup', { name: 'Ansicht' })).toBeInTheDocument()
  })
})

describe('Bearbeiten im Formular und im Text-Editor (Paket 2)', () => {
  it('ändert einen Lückentext im Formular und speichert die Änderung', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    fireEvent.click((await screen.findByText('Lückentext')).closest('button')!)
    const feld = await screen.findByLabelText(/^Text/)
    fireEvent.change(feld, { target: { value: 'Der *Spediteur* haftet.' } })
    expect(screen.getByText('Spediteur')).toBeInTheDocument()
    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalled(), { timeout: 3000 })
    expect(api.speichereEntwurf.mock.calls.at(-1)![1].chapters[0].elements[1]).toEqual({
      type: 'fill_blanks',
      text: 'Der *Spediteur* haftet.',
    })
    // Umschalter zur Rohfassung ist da
    expect(screen.getByRole('radiogroup', { name: 'Bearbeiten als' })).toBeInTheDocument()
  })

  it('öffnet einen Lehrtext im gestalteten Text-Editor', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    fireEvent.click((await screen.findByText('Lehrtext')).closest('button')!)
    expect(await screen.findByRole('toolbar', { name: 'Textgestaltung' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Ansicht des Textblocks' })).toBeInTheDocument()
  })

  it('bearbeitet die Lernzielkontrolle im Formular', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    fireEvent.click(await screen.findByRole('button', { name: /^Lernzielkontrolle/ }))
    expect(await screen.findByText('Abschlusstest')).toBeInTheDocument()
    expect(screen.getByText('Gesamtzusammenfassung')).toBeInTheDocument()
  })
})

describe('Sprung-Skript', () => {
  it('kommt vor </body> und nimmt nur Buchstaben, Ziffern, - und _ an', () => {
    const html = mitSprungSkript('<html><body><p>x</p></body></html>')
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('</body>'))
    expect(html).toContain('replace(/[^a-z0-9_-]/gi,"")')
    expect(mitSprungSkript('<p>ohne body</p>')).toContain('<script>')
  })
})
