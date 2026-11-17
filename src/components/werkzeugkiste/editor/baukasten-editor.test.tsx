import { beforeEach, describe, expect, it, vi } from 'vitest'
import { katalogZeile, waehleImKatalog } from './katalog-test-hilfe'
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
  ladeMaterialBilder: vi.fn(),
  ladeMaterialBild: vi.fn(),
}))
vi.mock('@/lib/werkzeugkiste-api', async (original) => ({
  ...(await original<typeof import('@/lib/werkzeugkiste-api')>()),
  ...api,
}))
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { BaukastenEditor } from './baukasten-editor'
import { mitSprungSkript } from './use-editor-zustand'
import { auswahlAusMarke } from './vorschau-skript'

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
  // hidden: Bei offener Schublade ist die Gliederung eingeklappt (PROJ-97), ihre Menüs bleiben im Aufbau
  fireEvent.keyDown(screen.getByRole('button', { name, hidden: true }), { key: 'Enter' })
}

/** Fensterbreite genau nachbilden (min-width und max-width), anders als `mockViewport` auch für 1280 px */
function mockBreite(px: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: px })
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const min = /min-width:\s*(\d+)/.exec(query)
    const max = /max-width:\s*(\d+)/.exec(query)
    return {
      matches: min ? px >= Number(min[1]) : max ? px <= Number(max[1]) : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }
  })
}

/** Nachricht „aus dem Vorschau-Rahmen“ an die App */
function ausSeite(data: unknown, rahmen: HTMLIFrameElement) {
  fireEvent(window, new MessageEvent('message', { data, source: rahmen.contentWindow }))
}

/**
 * PROJ-114, Schritt 3: Eine Aufgabe aus der Gliederung geht in der Seite auf. Die Schublade bleibt der Ausweg,
 * wenn die Seite sie nicht öffnen kann („Abbruch“) – darüber erreichen diese Tests das Formular einer Aufgabe.
 */
async function schubladeUeberAusweg(name: string, marke: string) {
  const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
  await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
  ausSeite({ wkBereit: true }, rahmen)
  const gliederung = screen.getByRole('region', { name: 'Gliederung', hidden: true })
  fireEvent.click(within(gliederung).getByText(name).closest('button')!)
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  ausSeite({ wkAufgabeAbbruch: marke }, rahmen)
  return screen.findByRole('complementary', { name })
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
  api.ladeMaterialBilder.mockResolvedValue({ bilder: [], mehr: false })
  window.localStorage.clear()
  // Die Gliederung startet eingeklappt (PROJ-96); die bisherigen Tests arbeiten in der offenen Liste
  window.localStorage.setItem('wk-editor-gliederung', 'offen')
})

describe('Baukasten-Editor', () => {
  it('zeigt Deckblatt, Themen und Blöcke in Klartext und die Verbesserungsvorschläge', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    expect(await screen.findByRole('heading', { name: 'Mein Material' })).toBeInTheDocument()
    const gliederung = screen.getByRole('region', { name: 'Gliederung' })
    expect(within(gliederung).getByText('Haftung im Frachtrecht')).toBeInTheDocument()
    expect(within(gliederung).getByText('Grundlagen', { selector: 'span' })).toBeInTheDocument()
    expect(within(gliederung).getByText('Lehrtext')).toBeInTheDocument()
    expect(within(gliederung).getByText('Lückentext')).toBeInTheDocument()
    expect(within(gliederung).getByText('Der Frachtführer haftet.', { selector: '.truncate' })).toBeInTheDocument()
    expect(within(gliederung).getByText('Noch keine Elemente')).toBeInTheDocument()
    // Hinweis hängt am Lückentext (Thema 1, Block 2)
    expect(await screen.findByText(/Verbesserungsvorschläge \(1\)/)).toBeInTheDocument()
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

  it('ohne Zugriff: schreibgeschützt mit klarem Satz, kein endloses Wiederholen (QA BUG-4)', async () => {
    api.speichereEntwurf.mockRejectedValue(new WerkzeugFehler('Kein Zugriff', 403))
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByText('Lückentext')
    fireEvent.click(screen.getByRole('button', { name: /Thema hinzufügen/ }))
    expect(await screen.findByText(/keinen Zugriff mehr auf die Werkzeugkiste/, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Veröffentlichen' })).toBeDisabled()
    // Das neue Thema ist gewählt, die Schublade offen und die Gliederung eingeklappt (PROJ-97): im Aufbau bleibt sie stehen
    expect(document.querySelector('section[aria-label="Gliederung"]')).toHaveAttribute('inert')
    // Kein zweiter Versuch nach 5 Sekunden
    await new Promise((r) => setTimeout(r, 5600))
    expect(api.speichereEntwurf).toHaveBeenCalledTimes(1)
  }, 10_000)

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
    await schubladeUeberAusweg('Lückentext', 'k0-e1')
    const feld = await screen.findByLabelText(/^Text/)
    fireEvent.change(feld, { target: { value: 'Der *Spediteur* haftet.' } })
    expect(screen.getByText('Spediteur')).toBeInTheDocument()
    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalled(), { timeout: 3000 })
    expect(api.speichereEntwurf.mock.calls.at(-1)![1].chapters[0].elements[1]).toEqual({
      type: 'fill_blanks',
      text: 'Der *Spediteur* haftet.',
    })
    // Umschalter zur Quelltext ist da
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

describe('Block einfügen (PROJ-90)', () => {
  const letzteStruktur = () => api.speichereEntwurf.mock.calls.at(-1)![1] as Struktur

  it('„Element hinzufügen“ fügt am Ende des Themas mit Beispiel ein, wählt ihn und speichert', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Grundlagen“/ }))
    expect(screen.getByRole('heading', { name: 'Element hinzufügen' })).toBeInTheDocument()
    waehleImKatalog('true_false')
    // PROJ-114, Schritt 3: Die neue Aufgabe geht in der Seite auf (sobald die Seite sie zeigt), nicht in der Schublade
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalled(), { timeout: 3000 })
    expect(letzteStruktur().chapters[0].elements.map((b) => b.type)).toEqual(['text', 'fill_blanks', 'true_false'])
    expect(JSON.parse(window.localStorage.getItem('wk-katalog-zuletzt')!)).toEqual(['true_false'])
  })

  it('fügt in ein leeres Thema ein und meldet den Beispielinhalt als Hinweis', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Haftungsgrenzen“/ }))
    waehleImKatalog('crossword')
    // Mit dem neuen Block öffnet sich die Schublade, und die Gliederung klappt ein (PROJ-97), bleibt aber im Aufbau
    const gliederung = document.querySelector<HTMLElement>('section[aria-label="Gliederung"]')!
    expect(await within(gliederung).findByText('Kreuzworträtsel')).toBeInTheDocument()
    expect(within(gliederung).queryByText('Noch keine Elemente')).not.toBeInTheDocument()
    fireEvent.click(within(gliederung).getByRole('button', { name: /Verbesserungsvorschläge/, hidden: true }))
    expect(await within(gliederung).findByText(/Thema 2 – Kreuzworträtsel: Beispielinhalt noch nicht ersetzt/)).toBeInTheDocument()
  })

  it('PROJ-111: Die Schublade zeigt keine doppelten Aktionen (Darunter einfügen, Löschen, zweites „Fertig“); sie liegen in der Leiste und im ⋯-Menü', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const schublade = await schubladeUeberAusweg('Lückentext', 'k0-e1')
    expect(within(schublade).queryByRole('button', { name: /Element löschen/ })).not.toBeInTheDocument()
    expect(within(schublade).queryByRole('button', { name: /Element darunter einfügen/ })).not.toBeInTheDocument()
    expect(within(schublade).queryByRole('button', { name: 'Fertig' })).not.toBeInTheDocument()
    // Geschlossen wird mit dem X in der Kopfzeile
    fireEvent.click(within(schublade).getByRole('button', { name: 'Bearbeiten schließen' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('„Element darüber einfügen“ setzt den Block vor den gewählten; Rückgängig nimmt ihn zurück', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    oeffneMenu(/Weitere Aktionen für Lückentext/)
    fireEvent.click(await screen.findByRole('menuitem', { name: /Element darüber einfügen/ }))
    waehleImKatalog('memory_game')
    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalled(), { timeout: 3000 })
    expect(letzteStruktur().chapters[0].elements.map((b) => b.type)).toEqual(['text', 'memory_game', 'fill_blanks'])
    fireEvent.click(screen.getByRole('button', { name: /Rückgängig/ }))
    await waitFor(() => expect(letzteStruktur().chapters[0].elements.map((b) => b.type)).toEqual(['text', 'fill_blanks']), { timeout: 3000 })
  })

  it('Abbrechen im Katalog fügt nichts ein', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Grundlagen“/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Element hinzufügen' })).not.toBeInTheDocument())
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('Bild-Typ: erst Bildauswahl, dann Block mit dem gewählten Bild', async () => {
    api.ladeMaterialBilder.mockResolvedValue({
      bilder: [{ pfad: 'images/seite2.png', vorschau: 'data:image/jpeg;base64,AA', breite: 600, hoehe: 300 }],
      mehr: false,
    })
    api.ladeMaterialBild.mockResolvedValue({ pfad: 'images/seite2.png', bild: 'data:image/jpeg;base64,BB', breite: 600, hoehe: 300 })
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Grundlagen“/ }))
    await waitFor(() => expect(katalogZeile('image')).not.toBeNull())
    waehleImKatalog('image')
    fireEvent.click(await screen.findByRole('button', { name: /seite2\.png/ }))
    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalled(), { timeout: 3000 })
    expect(letzteStruktur().chapters[0].elements[2]).toMatchObject({ type: 'image', path: 'images/seite2.png' })
  })

  it('Bild-Block: „Bild bearbeiten“ öffnet das Bild-Fenster direkt beim Zuschneiden (PROJ-92)', async () => {
    api.ladeMaterialBilder.mockResolvedValue({
      bilder: [{ pfad: 'images/seite2.png', vorschau: 'data:image/jpeg;base64,AA', breite: 600, hoehe: 300 }],
      mehr: false,
      skript: true,
    })
    api.ladeMaterialBild.mockResolvedValue({ pfad: 'images/seite2.png', bild: 'data:image/jpeg;base64,QUJD', breite: 600, hoehe: 300 })
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Grundlagen“/ }))
    await waitFor(() => expect(katalogZeile('image')).not.toBeNull())
    waehleImKatalog('image')
    fireEvent.click(await screen.findByRole('button', { name: /seite2\.png/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Bild bearbeiten' }))
    expect(await screen.findByRole('heading', { name: 'Bild bearbeiten' })).toBeInTheDocument()
  })
})

describe('Vorschau als Hauptfläche (PROJ-96)', () => {
  /** Nachricht „aus dem Vorschau-Rahmen“ (oder von woanders) an die App schicken */
  function nachricht(data: unknown, rahmen: HTMLIFrameElement | null, source?: MessageEventSource | null) {
    fireEvent(window, new MessageEvent('message', { data, source: source === undefined ? rahmen?.contentWindow : source }))
  }

  it('startet mit eingeklappter Gliederung, und der Knopf blendet sie ein und merkt sich das', async () => {
    window.localStorage.clear()
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByTitle('Vorschau der Seite')
    expect(screen.queryByRole('region', { name: 'Gliederung' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Gliederung einblenden' }))
    expect(screen.getByRole('region', { name: 'Gliederung' })).toBeInTheDocument()
    expect(window.localStorage.getItem('wk-editor-gliederung')).toBe('offen')
    fireEvent.click(screen.getByRole('button', { name: 'Gliederung ausblenden' }))
    expect(screen.queryByRole('region', { name: 'Gliederung' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem('wk-editor-gliederung')).toBe('zu')
  })

  it('fällt ohne Browser-Speicher auf „eingeklappt“ zurück', async () => {
    const lesen = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('gesperrt')
    })
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByTitle('Vorschau der Seite')
    expect(screen.getByRole('button', { name: 'Gliederung einblenden' })).toBeInTheDocument()
    lesen.mockRestore()
  })

  it('öffnet die Schublade mit dem Formular (Ausweg für eine Aufgabe) und schließt sie mit Esc', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    const schublade = await schubladeUeberAusweg('Lückentext', 'k0-e1')
    expect(within(schublade).getByLabelText(/^Text/)).toBeInTheDocument()
    // Das Formular steht nicht mehr in der Gliederung
    expect(within(gliederung).queryByLabelText(/^Text/)).not.toBeInTheDocument()
    fireEvent.keyDown(within(schublade).getByLabelText(/^Text/), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('PROJ-118: „Bearbeiten“ am Lehrtext öffnet ihn in der Seite (eine Leiste), die Schublade bleibt zu; an der Lernzielkontrolle die Schublade', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkBearbeite: 'k0-e0' }, rahmen)
    await waitFor(
      () => expect(senden).toHaveBeenCalledWith({ wkSchreibStart: { marke: 'k0-e0', teil: 'text', html: STRUKTUR.chapters[0].elements[0].content } }, '*'),
      { timeout: 4000 },
    )
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    // „Als HTML bearbeiten“ aus der Leiste: erst der Endstand, dann die Schublade
    nachricht({ wkSchreibEnde: 'k0-e0', teil: 'text', html: STRUKTUR.chapters[0].elements[0].content }, rahmen)
    nachricht({ wkFormular: 'k0-e0' }, rahmen)
    expect(await screen.findByRole('complementary', { name: 'Lehrtext' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    // Ohne Bearbeitung in der Seite (Lernzielkontrolle): Schublade
    nachricht({ wkBearbeite: 'abschluss' }, rahmen)
    expect(await screen.findByRole('complementary', { name: 'Lernzielkontrolle' })).toBeInTheDocument()
  })

  it('PROJ-118: „Bearbeiten“ am Thema öffnet den Titel in der Seite; eine offene Schublade schließt dabei', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkFormular: 'k1' }, rahmen)
    await screen.findByRole('complementary', { name: 'Thema' })
    nachricht({ wkBearbeite: 'k1' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkSchreibStart: { marke: 'k1', teil: 'kapitel' } }, '*'))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('PROJ-118: Öffnet die Schublade für den Text, der gerade in der Seite offen ist, endet das Schreiben dort (nie zwei Leisten)', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibe: 'k0-e0', teil: 'text' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith(expect.objectContaining({ wkSchreibStart: expect.anything() }), '*'), { timeout: 4000 })
    const gliederung = screen.getByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lehrtext').closest('button')!)
    await screen.findByRole('complementary', { name: 'Lehrtext' })
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkSchreibBeende: true }, '*'))
  })

  it('„Als HTML bearbeiten“ beendet die Vollbreite und öffnet die Schublade (QA BUG-1)', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Vorschau über die ganze Breite' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    nachricht({ wkFormular: 'k0-e0' }, rahmen)
    expect(await screen.findByRole('complementary', { name: 'Lehrtext' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vorschau über die ganze Breite' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('verliert den Fokus beim Schließen der Schublade nicht (Zeile der Gliederung, sonst Vorschau; QA BUG-2)', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    // Lehrtext hat keinen Bauplan: Er öffnet weiter die Schublade
    const zeile = within(gliederung).getByText('Lehrtext').closest('button')!
    fireEvent.click(zeile)
    await screen.findByRole('complementary')
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
  })

  it('sagt nach einem fehlgeschlagenen Neubau, was zu tun ist, statt „wird aktualisiert“ (QA BUG-5)', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    // Ungespeicherte Änderung macht die Vorschau veraltet; der Neubau scheitert
    api.baueEntwurfVorschau.mockRejectedValue(new Error('Die Vorschau konnte nicht gebaut werden.'))
    fireEvent.click(screen.getByRole('button', { name: /Thema hinzufügen/ }))
    await screen.findByRole('complementary')
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    // Speichern, Wartezeit, Neubau scheitert: Erst dann steht die alte Seite dauerhaft „nicht aktuell“
    await screen.findByText('Vorschau gerade nicht aktuell', {}, { timeout: 8000 })
    nachricht({ wkWaehle: 'k2' }, rahmen) // das neue Thema kennt die alte Seite nicht
    expect(await screen.findByText(/Die Vorschau ist nicht aktuell\. Bitte/)).toBeInTheDocument()
    expect(screen.queryByText(/Bitte gleich noch einmal klicken/)).not.toBeInTheDocument()
  }, 15000)

  it('nimmt Nachrichten nur vom eigenen Rahmen und nur mit gültiger Marke an', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    nachricht({ wkWaehle: 'k0-e1' }, rahmen, window) // fremder Absender
    nachricht({ wkWaehle: 'k0-e1' }, rahmen, null)
    nachricht({ wkWaehle: 'k0-e1"]x' }, rahmen)
    nachricht({ wkWaehle: 'k0-e1; alert(1)' }, rahmen)
    nachricht({ wkWaehle: 7 }, rahmen)
    nachricht('k0-e1', rahmen)
    nachricht({ wkWaehle: 'k9-e9' }, rahmen) // gibt es nicht
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('PROJ-113: Ein Klick auf einen unveränderten Block geht auch bei veralteter Vorschau sofort', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Thema hinzufügen/ }))
    await screen.findByRole('complementary')
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    // Ohne „bereit“ der Seite gibt es kein Schreiben in der Seite, die Stelle geht aber trotzdem sofort
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkTaste: 'Enter' }, rahmen)
    expect(await screen.findByRole('complementary', { name: 'Lehrtext' })).toBeInTheDocument()
    expect(screen.queryByText(/Bitte gleich noch einmal klicken/)).not.toBeInTheDocument()
  })

  it('wählt nicht aus, solange die Vorschau veraltet ist, und sagt es', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    // Eine Änderung: Der Entwurf ist noch nicht gespeichert und die Seite noch nicht neu gebaut
    fireEvent.click(screen.getByRole('button', { name: /Thema hinzufügen/ }))
    await screen.findByRole('complementary')
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    nachricht({ wkWaehle: 'k2' }, rahmen) // das neue Thema kennt die gezeigte Seite noch nicht
    expect(await screen.findByText(/Bitte gleich noch einmal klicken/)).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('blendet Gliederung und Schublade aus, wenn die Vorschau die ganze Breite bekommt', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lehrtext').closest('button')!)
    await screen.findByRole('complementary')
    fireEvent.click(screen.getByRole('button', { name: 'Vorschau über die ganze Breite' }))
    expect(screen.queryByRole('region', { name: 'Gliederung' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeitung wieder einblenden' }))
    expect(await screen.findByRole('complementary')).toBeInTheDocument()
    // PROJ-114, Schritt 3: Die Gliederung folgt dem gemerkten Zustand, auch neben der offenen Schublade
    expect(screen.getByRole('region', { name: 'Gliederung' })).toBeInTheDocument()
  })

  it('schließt die Schublade, wenn der gewählte Block verschwindet (Löschen)', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lehrtext').closest('button')!)
    await screen.findByRole('complementary')
    oeffneMenu(/Weitere Aktionen für Lehrtext/)
    fireEvent.click(await screen.findByRole('menuitem', { name: /Löschen/ }))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('zeigt die Schublade auf dem Handy als Blatt von unten', async () => {
    mockViewport(390)
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('radiogroup', { name: 'Ansicht' })
    fireEvent.click(screen.getByRole('radio', { name: 'Gliederung' }))
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lehrtext').closest('button')!)
    const blatt = await screen.findByRole('dialog')
    expect(within(blatt).getByRole('toolbar', { name: 'Textgestaltung' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})

describe('Marken aus der Vorschau', () => {
  it('liest Themen, Blöcke und Lernzielkontrolle', () => {
    expect(auswahlAusMarke('k0')).toEqual({ art: 'thema', thema: 0 })
    expect(auswahlAusMarke('k12-e3')).toEqual({ art: 'block', thema: 12, block: 3 })
    expect(auswahlAusMarke('abschluss')).toEqual({ art: 'abschluss' })
    expect(auswahlAusMarke('abschluss-question_set')).toEqual({ art: 'abschluss' })
  })

  it('verwirft alles andere', () => {
    for (const m of ['', 'k', 'k-1', 'k1-e', 'K1', 'k1-e2-x', 'abschluss-', 'abschluss-A', 'k1" onload="x', '<b>', 5, null, undefined, {}, 'k' + '9'.repeat(60)])
      expect(auswahlAusMarke(m)).toBeNull()
  })
})

describe('Hinzufügen präsenter (PROJ-97)', () => {
  const letzteStruktur = () => api.speichereEntwurf.mock.calls.at(-1)![1] as Struktur
  const typen = (t: number) => letzteStruktur().chapters[t].elements.map((b) => b.type)
  const gespeichert = () => waehleAus(() => api.speichereEntwurf.mock.calls.length > 0)
  function waehleAus(f: () => boolean) {
    return waitFor(() => expect(f()).toBe(true), { timeout: 3000 })
  }
  function nachricht(data: unknown, rahmen: HTMLIFrameElement | null, source?: MessageEventSource | null) {
    fireEvent(window, new MessageEvent('message', { data, source: source === undefined ? rahmen?.contentWindow : source }))
  }
  const katalogOffen = () => screen.queryByRole('heading', { name: 'Element hinzufügen' })
  async function bereit() {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    return rahmen
  }
  const waehleTyp = (typ: string) => waehleImKatalog(typ)

  it('Leiste „Block“ ohne Auswahl: am Ende des letzten Themas', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    fireEvent.click(screen.getByRole('button', { name: 'Element' }))
    expect(await screen.findByRole('heading', { name: 'Element hinzufügen' })).toBeInTheDocument()
    waehleTyp('memory_game')
    await gespeichert()
    expect(typen(1)).toEqual(['memory_game'])
    expect(typen(0)).toEqual(['text', 'fill_blanks'])
  })

  it('Leiste „Thema“ hängt ein Thema an; das Themen-Menü fügt eines direkt darunter ein', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    oeffneMenu(/Weitere Aktionen für Thema „Grundlagen“/)
    fireEvent.click(await screen.findByRole('menuitem', { name: /Thema darunter einfügen/ }))
    await gespeichert()
    expect(letzteStruktur().chapters.map((t) => t.title)).toEqual(['Grundlagen', 'Neues Thema', 'Haftungsgrenzen'])
    // Das neue Thema ist gewählt, die Schublade offen
    expect(await screen.findByRole('complementary')).toBeInTheDocument()
  })

  it('„+“ in der schmalen Leiste fügt hinter dem gewählten Block ein', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lehrtext').closest('button')!)
    await screen.findByRole('complementary')
    // Die Gliederung bleibt neben der Schublade offen (Schritt 3); eingeklappt zeigt sie die schmale Leiste
    fireEvent.click(screen.getByRole('button', { name: 'Gliederung ausblenden' }))
    fireEvent.click(screen.getByRole('button', { name: 'Element hinzufügen' }))
    expect(await screen.findByRole('heading', { name: 'Element hinzufügen' })).toBeInTheDocument()
    waehleTyp('memory_game')
    await gespeichert()
    expect(typen(0)).toEqual(['text', 'memory_game', 'fill_blanks'])
  })

  it('Tastenkürzel Alt+Umschalt+B öffnet den Katalog, andere Kombinationen nicht', async () => {
    await bereit()
    fireEvent.keyDown(document.body, { key: 'B', code: 'KeyB', altKey: true })
    fireEvent.keyDown(document.body, { key: 'b', code: 'KeyB', ctrlKey: true, shiftKey: true })
    expect(katalogOffen()).not.toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: 'B', code: 'KeyB', altKey: true, shiftKey: true })
    expect(await screen.findByRole('heading', { name: 'Element hinzufügen' })).toBeInTheDocument()
  })

  it('Tastenkürzel wirkt nicht, solange der Fokus in einem Eingabefeld steht', async () => {
    await bereit()
    const feld = document.createElement('input')
    document.body.appendChild(feld)
    feld.focus()
    fireEvent.keyDown(feld, { key: 'B', code: 'KeyB', altKey: true, shiftKey: true })
    expect(katalogOffen()).not.toBeInTheDocument()
    feld.remove()
    fireEvent.keyDown(document.body, { key: 'B', code: 'KeyB', altKey: true, shiftKey: true })
    expect(await screen.findByRole('heading', { name: 'Element hinzufügen' })).toBeInTheDocument()
  })

  it('zeigt das Tastenkürzel am Leistenknopf', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    expect(screen.getByRole('button', { name: 'Element' }).getAttribute('title')).toMatch(/Alt\+Umschalt\+B|⌥⇧B/)
  })

  it('„+ Darunter“ in der Vorschau öffnet den Katalog, der Block kommt hinter den angeklickten', async () => {
    const rahmen = await bereit()
    nachricht({ wkEinfuegen: 'k0-e0' }, rahmen)
    expect(await screen.findByRole('heading', { name: 'Element hinzufügen' })).toBeInTheDocument()
    waehleTyp('memory_game')
    await gespeichert()
    expect(typen(0)).toEqual(['text', 'memory_game', 'fill_blanks'])
  })

  it('„+ Block“ an einem Thema in der Vorschau fügt am Anfang des Themas ein', async () => {
    const rahmen = await bereit()
    nachricht({ wkEinfuegen: 'k0' }, rahmen)
    expect(await screen.findByRole('heading', { name: 'Element hinzufügen' })).toBeInTheDocument()
    waehleTyp('memory_game')
    await gespeichert()
    expect(typen(0)).toEqual(['memory_game', 'text', 'fill_blanks'])
  })

  it('nimmt „+“-Nachrichten nur vom eigenen Rahmen, mit gültiger Marke und nicht für die Lernzielkontrolle an', async () => {
    const rahmen = await bereit()
    nachricht({ wkEinfuegen: 'k0-e0' }, rahmen, window) // fremder Absender
    nachricht({ wkEinfuegen: 'k0-e0' }, rahmen, null)
    nachricht({ wkEinfuegen: 'k0-e0"]x' }, rahmen)
    nachricht({ wkEinfuegen: 7 }, rahmen)
    nachricht({ wkEinfuegen: 'k9-e9' }, rahmen) // gibt es nicht
    nachricht({ wkEinfuegen: 'abschluss' }, rahmen) // Lernzielkontrolle hat kein „+“
    expect(katalogOffen()).not.toBeInTheDocument()
  })

  it('„Löschen“ in der Vorschau entfernt den Block; fremde Absender, Themen und Unbekanntes werden verworfen (PROJ-98)', async () => {
    const rahmen = await bereit()
    nachricht({ wkLoesche: 'k0-e1' }, rahmen, window) // fremder Absender
    nachricht({ wkLoesche: 'k0' }, rahmen) // Thema: nicht über die Vorschau
    nachricht({ wkLoesche: 'abschluss' }, rahmen)
    nachricht({ wkLoesche: 'k9-e9' }, rahmen)
    nachricht({ wkLoesche: 'k0-e1"]x' }, rahmen)
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
    nachricht({ wkLoesche: 'k0-e1' }, rahmen)
    await gespeichert()
    expect(typen(0)).toEqual(['text'])
  })

  it('lehnt „+“ ab, solange die Vorschau veraltet ist, und sagt es', async () => {
    const rahmen = await bereit()
    fireEvent.click(screen.getByRole('button', { name: /Thema hinzufügen/ }))
    await screen.findByRole('complementary')
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    nachricht({ wkEinfuegen: 'k2' }, rahmen)
    expect(await screen.findByText(/Bitte gleich noch einmal klicken/)).toBeInTheDocument()
    expect(katalogOffen()).not.toBeInTheDocument()
  })

  it('Schritt 3: Ab 1280 px bleibt die Gliederung bei offener Schublade offen; der gemerkte Zustand gilt immer', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lehrtext').closest('button')!)
    await screen.findByRole('complementary')
    expect(screen.getByRole('region', { name: 'Gliederung' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Gliederung' })).toBeInTheDocument()
    expect(window.localStorage.getItem('wk-editor-gliederung')).toBe('offen')
  })

  it('Schritt 3: Gemerkt „zu“ bleibt die Gliederung zu; „Gliederung einblenden“ öffnet sie dauerhaft, auch neben der Schublade', async () => {
    window.localStorage.setItem('wk-editor-gliederung', 'zu')
    const rahmen = await bereit()
    nachricht({ wkFormular: 'k0-e0' }, rahmen) // „Als HTML bearbeiten“ am Lehrtext in der Vorschau
    await screen.findByRole('complementary')
    expect(screen.queryByRole('region', { name: 'Gliederung' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Gliederung einblenden' }))
    expect(screen.getByRole('region', { name: 'Gliederung' })).toBeInTheDocument()
    expect(window.localStorage.getItem('wk-editor-gliederung')).toBe('offen')
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Gliederung' })).toBeInTheDocument()
  })

  it('Schritt 3: Unter 1280 px weicht die Gliederung der offenen Schublade und kommt danach zurück', async () => {
    mockBreite(1100)
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lehrtext').closest('button')!)
    await screen.findByRole('complementary')
    expect(screen.queryByRole('region', { name: 'Gliederung' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem('wk-editor-gliederung')).toBe('offen')
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Gliederung' })).toBeInTheDocument()
  })
})

describe('Direkt auf der Seite (PROJ-101)', () => {
  const letzteStruktur = () => api.speichereEntwurf.mock.calls.at(-1)![1] as Struktur
  const typen = (t: number) => letzteStruktur().chapters[t].elements.map((b) => b.type)
  const gespeichert = () => waitFor(() => expect(api.speichereEntwurf.mock.calls.length).toBeGreaterThan(0), { timeout: 3000 })
  function nachricht(data: unknown, rahmen: HTMLIFrameElement | null, source?: MessageEventSource | null) {
    fireEvent(window, new MessageEvent('message', { data, source: source === undefined ? rahmen?.contentWindow : source }))
  }
  async function bereit() {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
    return { rahmen, senden }
  }

  it('sagt der Seite beim „bereit“ Modus, Schreibschutz, Handy und leere Themen', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    expect(senden).toHaveBeenCalledWith({ wkZustand: { modus: 'bearbeiten', lesen: false, mobil: false, leer: [1], schublade: false, aufgaben: { 'k0-e1': 'fill_blanks' } } }, '*')
  })

  it('ein Klick in der Seite wählt den Block aus, ohne das Formular zu öffnen, und die Seite bekommt den Typ-Namen', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wk: 'k0-e0', name: 'Lehrtext', mehr: [], still: true }, '*'))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    // „Bearbeiten“ (oder Enter) öffnet das Formular, Esc schließt es, ein zweites Esc hebt die Auswahl auf
    nachricht({ wkTaste: 'Enter' }, rahmen)
    expect(await screen.findByRole('complementary', { name: 'Lehrtext' })).toBeInTheDocument()
    nachricht({ wkTaste: 'Escape' }, rahmen)
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    nachricht({ wkTaste: 'Escape' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith(expect.objectContaining({ wk: null, name: '' }), '*'))
  })

  it('ein Klick neben alle Blöcke hebt die Auswahl auf, auch bei geöffnetem Formular', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkFormular: 'k0-e0' }, rahmen)
    await screen.findByRole('complementary')
    nachricht({ wkAbwaehle: true }, rahmen)
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('wählt in der Vorschau einen anderen Block, wechselt das offene Formular mit', async () => {
    const { rahmen } = await bereit()
    // Formular einer Aufgabe (über den Ausweg der Seite), dann Klick auf den Lehrtext
    await schubladeUeberAusweg('Lückentext', 'k0-e1')
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    expect(await screen.findByRole('complementary', { name: 'Lehrtext' })).toBeInTheDocument()
  })

  it('Pfeil hoch/runter wechselt die Auswahl durch Themen und Blöcke', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkTaste: 'ArrowDown' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith(expect.objectContaining({ wk: 'k0-e1' }), '*'))
    nachricht({ wkTaste: 'ArrowDown' }, rahmen) // weiter zum nächsten Thema
    await waitFor(() => expect(senden).toHaveBeenCalledWith(expect.objectContaining({ wk: 'k1', name: 'Thema' }), '*'))
    nachricht({ wkTaste: 'ArrowUp' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith(expect.objectContaining({ wk: 'k0-e1' }), '*'))
  })

  it('Entf löscht den gewählten Block mit „Rückgängig“, Strg+D dupliziert ihn und wählt die Kopie', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkTaste: 'd', mod: true }, rahmen)
    await gespeichert()
    expect(typen(0)).toEqual(['text', 'text', 'fill_blanks'])
    await waitFor(() => expect(senden).toHaveBeenCalledWith(expect.objectContaining({ wk: 'k0-e1' }), '*'))
  })

  it('„Duplizieren“ und „Löschen“ aus der Leiste wirken auf den gemeldeten Block; Ungültiges wird verworfen', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkDupliziere: 'k0-e1' }, rahmen, window) // fremder Absender
    nachricht({ wkDupliziere: 'k0' }, rahmen) // Thema: nicht duplizierbar
    nachricht({ wkDupliziere: 'k9-e9' }, rahmen)
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
    nachricht({ wkDupliziere: 'k0-e1' }, rahmen)
    await gespeichert()
    expect(typen(0)).toEqual(['text', 'fill_blanks', 'fill_blanks'])
  })

  it('Schnellauswahl im leeren Thema fügt den Block ohne Katalog ein; unbekannte Typen werden verworfen', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkSchnell: 'k1', typ: 'drag_words' }, rahmen)
    nachricht({ wkSchnell: 'k1', typ: 'text' }, rahmen, window)
    expect(screen.queryByRole('heading', { name: 'Element hinzufügen' })).not.toBeInTheDocument()
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
    nachricht({ wkSchnell: 'k1', typ: 'fill_blanks' }, rahmen)
    await gespeichert()
    expect(typen(1)).toEqual(['fill_blanks'])
    expect(screen.queryByRole('heading', { name: 'Element hinzufügen' })).not.toBeInTheDocument()
    // PROJ-114, Schritt 3: Der neue Block geht in der Seite auf, sobald sie ihn zeigt (hier: gleiche Seite, schon bereit)
    nachricht({ wkBereit: true }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkAufgabeStart: expect.objectContaining({ marke: 'k1-e0' }) }, '*'), { timeout: 8000 })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
 }, 15000)

  it('„Löschen“ am Thema (Leiste) fragt per Dialog nach und löscht erst nach Bestätigung', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkLoesche: 'k1' }, rahmen)
    expect(await screen.findByText(/Thema „Haftungsgrenzen“ löschen\?/)).toBeInTheDocument()
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Thema löschen' }))
    await gespeichert()
    expect(letzteStruktur().chapters.map((t) => t.title)).toEqual(['Grundlagen'])
  })

  it('Tasten gelten auch, wenn die App den Fokus hat (nicht die Vorschau): Entf löscht den gewählten Block', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    fireEvent.keyDown(document.body, { key: 'Delete' })
    await gespeichert()
    expect(typen(0)).toEqual(['fill_blanks'])
  })

  it('Tasten in Eingabefeldern löschen nichts', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    const feld = document.createElement('input')
    document.body.appendChild(feld)
    fireEvent.keyDown(feld, { key: 'Backspace' })
    feld.remove()
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('„+ Thema“ am Ende der Seite hängt ein Thema an und öffnet sein Formular', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkThemaNeu: true }, rahmen)
    await gespeichert()
    expect(letzteStruktur().chapters.map((t) => t.title)).toEqual(['Grundlagen', 'Haftungsgrenzen', 'Neues Thema'])
    expect(await screen.findByRole('complementary', { name: 'Thema' })).toBeInTheDocument()
  })

  it('das „⋯“-Menü öffnet an der Klickstelle und verschiebt den Block; die Auswahl folgt ihm', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith(expect.objectContaining({ wk: 'k0-e0' }), '*'))
    nachricht({ wkMenue: 'k0-e0', x: 120, y: 80 }, rahmen)
    expect(await screen.findByRole('menuitem', { name: /Nach unten/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: /Nach unten/ }))
    await gespeichert()
    expect(typen(0)).toEqual(['fill_blanks', 'text'])
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith(expect.objectContaining({ wk: 'k0-e1' }), '*'))
  })

  it('Modus-Schalter: „Ausprobieren“ schließt das Formular, behält die Auswahl und sagt es der Seite; ⌘/Strg+E wechselt zurück', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkFormular: 'k0-e0' }, rahmen)
    await screen.findByRole('complementary')
    fireEvent.click(screen.getByRole('radio', { name: 'Ausprobieren' }))
    expect(senden).toHaveBeenCalledWith({ wkZustand: { modus: 'ausprobieren', lesen: false, mobil: false, leer: [1], schublade: false, aufgaben: { 'k0-e1': 'fill_blanks' } } }, '*')
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    // In der Seite ist Bearbeiten wirkungslos: Wünsche kommen dort gar nicht mehr an; über die Tasten geht es zurück
    nachricht({ wkTaste: 'e', mod: true }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith({ wkZustand: { modus: 'bearbeiten', lesen: false, mobil: false, leer: [1], schublade: false, aufgaben: { 'k0-e1': 'fill_blanks' } } }, '*'))
    fireEvent.keyDown(window, { key: 'e', ctrlKey: true })
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Ausprobieren' })).toHaveAttribute('data-state', 'on'))
    // Die Auswahl blieb gemerkt: ein Enter öffnet denselben Block – im Modus Bearbeiten; PROJ-118: der Lehrtext in der Seite
    fireEvent.keyDown(window, { key: 'e', ctrlKey: true })
    nachricht({ wkTaste: 'Enter' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith(expect.objectContaining({ wkSchreibStart: expect.objectContaining({ marke: 'k0-e0', teil: 'text' }) }), '*'), {
      timeout: 4000,
    })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('Rückgängig aus der Seite: Strg+Z mit dem Fokus in der Vorschau', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkLoesche: 'k0-e1' }, rahmen)
    await gespeichert()
    expect(typen(0)).toEqual(['text'])
    const gespeicherte = api.speichereEntwurf.mock.calls.length
    nachricht({ wkTaste: 'z', mod: true }, rahmen)
    // Der rückgängig gemachte Stand wird nach der Wartezeit wieder gespeichert
    await waitFor(() => expect(api.speichereEntwurf.mock.calls.length).toBeGreaterThan(gespeicherte), { timeout: 4000 })
    expect(typen(0)).toEqual(['text', 'fill_blanks'])
  })

  it('verwirft Wünsche mit ungültiger Marke und Tasten außerhalb der Vereinbarung', async () => {
    const { rahmen, senden } = await bereit()
    senden.mockClear()
    nachricht({ wkTaste: 'F5' }, rahmen)
    nachricht({ wkMenue: 'k0-e0', x: 'x', y: 1 }, rahmen)
    nachricht({ wkBearbeite: 'k0-e0"]x' }, rahmen)
    nachricht({ wkBearbeite: 'k0-e0' }, rahmen, window)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    expect(senden).not.toHaveBeenCalled()
  })
})

describe('Direkt in der Seite schreiben (PROJ-103)', () => {
  const letzteStruktur = () => api.speichereEntwurf.mock.calls.at(-1)![1] as Struktur
  const gespeichert = (n = 1) => waitFor(() => expect(api.speichereEntwurf.mock.calls.length).toBeGreaterThanOrEqual(n), { timeout: 4000 })
  function nachricht(data: unknown, rahmen: HTMLIFrameElement | null) {
    fireEvent(window, new MessageEvent('message', { data, source: rahmen?.contentWindow ?? null }))
  }
  async function bereit() {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
    return { rahmen, senden }
  }
  const ORIGINAL = '<h2>Grundlagen</h2><p>Der Frachtführer haftet.</p>'

  it('der Wunsch startet das Schreiben: erst das Schreibwerk, dann die gespeicherte Fassung', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibe: 'k0-e0', teil: 'text' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkSchreibStart: { marke: 'k0-e0', teil: 'text', html: ORIGINAL } }, '*'), { timeout: 4000 })
    expect(senden).toHaveBeenCalledWith({ wkSchreibwerk: expect.stringContaining('__wkSchreibwerk') }, '*')
    const reihenfolge = senden.mock.calls.map((c) => Object.keys(c[0] as object)[0])
    expect(reihenfolge.indexOf('wkSchreibwerk')).toBeLessThan(reihenfolge.indexOf('wkSchreibStart'))
    // Das Formular öffnet dabei nicht
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('Zwischenstand und Endstand: ein Rückgängig-Schritt, kein Neubau beim Schreiben, danach Neubau', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibe: 'k0-e0', teil: 'text' }, rahmen)
    const bauten = api.baueEntwurfVorschau.mock.calls.length
    nachricht({ wkSchreibZwischen: 'k0-e0', teil: 'text', html: '<h2>Grundlagen</h2><p>Neu 1</p>' }, rahmen)
    await gespeichert()
    // Gespeichert, aber solange geschrieben wird, baut die Vorschau nicht neu
    await new Promise((r) => setTimeout(r, 1800))
    expect(api.baueEntwurfVorschau.mock.calls.length).toBe(bauten)
    nachricht({ wkSchreibEnde: 'k0-e0', teil: 'text', html: '<h2>Grundlagen</h2><p>Neu 2</p>' }, rahmen)
    await waitFor(() => expect(String(letzteStruktur().chapters[0].elements[0].content)).toContain('Neu 2'), { timeout: 4000 })
    await waitFor(() => expect(api.baueEntwurfVorschau.mock.calls.length).toBeGreaterThan(bauten), { timeout: 5000 })
    // Beides war ein einziger Schritt im Verlauf
    fireEvent.click(screen.getByRole('button', { name: /Rückgängig/ }))
    await waitFor(() => expect(letzteStruktur().chapters[0].elements[0].content).toBe(ORIGINAL), { timeout: 4000 })
  }, 20000)

  it('unveränderter Endstand: nichts wird gespeichert, die Seite bekommt „vorbei“', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibe: 'k0-e0', teil: 'text' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith(expect.objectContaining({ wkSchreibStart: expect.anything() }), '*'), { timeout: 4000 })
    nachricht({ wkSchreibEnde: 'k0-e0', teil: 'text', html: ORIGINAL }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkSchreibVorbei: true }, '*'))
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('PROJ-118: „Fertig“ ohne Eingabe bei einem Text mit Kasten ändert nichts (kein Speichern, kein Rückgängig-Schritt)', async () => {
    const MIT_KASTEN = '<p>Einleitung</p>\n<div class="merke"><p>Merksatz</p></div>'
    const k0 = STRUKTUR.chapters[0]
    api.ladeEditor.mockResolvedValue({
      ...DATEN,
      struktur: { ...STRUKTUR, chapters: [{ ...k0, elements: [{ type: 'text', content: MIT_KASTEN }, k0.elements[1]] }, STRUKTUR.chapters[1]] },
    })
    const { rahmen, senden } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibe: 'k0-e0', teil: 'text' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith(expect.objectContaining({ wkSchreibStart: expect.anything() }), '*'), { timeout: 4000 })
    // Das Schreibwerk meldet bei „Fertig“ ohne Eingabe genau die gespeicherte Fassung zurück
    nachricht({ wkSchreibEnde: 'k0-e0', teil: 'text', html: MIT_KASTEN }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkSchreibVorbei: true }, '*'))
    await new Promise((r) => setTimeout(r, 1500))
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Rückgängig/ })).toBeDisabled()
  })

  it('PROJ-118: Einzeilige Texte: nur andere Leerzeichen gelten nicht als Änderung', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibe: 'k1', teil: 'kapitel' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkSchreibStart: { marke: 'k1', teil: 'kapitel' } }, '*'))
    nachricht({ wkSchreibEnde: 'k1', teil: 'kapitel', html: ' Haftungsgrenzen\n' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkSchreibVorbei: true }, '*'))
    await new Promise((r) => setTimeout(r, 1500))
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('Überschrift eines Themas und Deckblatt-Titel schreiben direkt (ohne Schreibwerk)', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibe: 'k1', teil: 'kapitel' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkSchreibStart: { marke: 'k1', teil: 'kapitel' } }, '*'))
    expect(senden).not.toHaveBeenCalledWith(expect.objectContaining({ wkSchreibwerk: expect.anything() }), '*')
    nachricht({ wkSchreibEnde: 'k1', teil: 'kapitel', html: '  Neue\n Grenzen ' }, rahmen)
    await gespeichert()
    expect(letzteStruktur().chapters[1].title).toBe('Neue Grenzen')
  })

  it('Aufgaben lassen sich nicht direkt schreiben (Aufgaben bleiben im Formular)', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibe: 'k0-e1', teil: 'text' }, rahmen)
    nachricht({ wkSchreibe: 'k0-e1', teil: 'unterschrift' }, rahmen)
    await new Promise((r) => setTimeout(r, 200))
    expect(senden).not.toHaveBeenCalledWith(expect.objectContaining({ wkSchreibStart: expect.anything() }), '*')
  })

  it('Schreiben ohne laufende Sitzung oder mit falscher Marke ändert nichts', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibEnde: 'k0-e0', teil: 'text', html: '<p>Fremd</p>' }, rahmen)
    nachricht({ wkSchreibZwischen: 'k1', teil: 'kapitel', html: 'Fremd' }, rahmen)
    await new Promise((r) => setTimeout(r, 1500))
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('ein Endstand mit verändertem geschützten Teil wird nicht übernommen', async () => {
    const insel = '<table style="border:1px solid red"><tr><td>A</td></tr></table>'
    api.ladeEditor.mockResolvedValue({
      ...DATEN,
      struktur: { ...STRUKTUR, chapters: [{ title: 'Grundlagen', elements: [{ type: 'text', content: `<p>Text</p>${insel}` }] }, STRUKTUR.chapters[1]] },
    })
    const { rahmen } = await bereit()
    nachricht({ wkBereit: true }, rahmen)
    nachricht({ wkSchreibe: 'k0-e0', teil: 'text' }, rahmen)
    await new Promise((r) => setTimeout(r, 300))
    nachricht({ wkSchreibEnde: 'k0-e0', teil: 'text', html: insel.replace('A', 'B') }, rahmen)
    await new Promise((r) => setTimeout(r, 1500))
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })
})

describe('Aufgabe an Ort und Stelle bearbeiten (PROJ-114)', () => {
  const MC_STRUKTUR: Struktur = {
    cover: { title: 'Haftung' },
    chapters: [
      {
        title: 'Grundlagen',
        elements: [
          { type: 'text', content: '<p>Lehrtext</p>' },
          {
            type: 'multiple_choice',
            question: 'Wer haftet?',
            quelle: 'Heft 2',
            answers: [
              { text: 'Frachtführer', correct: true, feedback: '' },
              { text: 'Absender', correct: false, feedback: '' },
              { text: 'Empfänger', correct: false, feedback: '' },
            ],
          },
        ],
      },
    ],
  }
  const letzteStruktur = () => api.speichereEntwurf.mock.calls.at(-1)![1] as Struktur
  const mcBlock = () => letzteStruktur().chapters[0].elements[1] as Record<string, unknown>
  function nachricht(data: unknown, rahmen: HTMLIFrameElement | null) {
    fireEvent(window, new MessageEvent('message', { data, source: rahmen?.contentWindow ?? null }))
  }
  async function bereit() {
    api.ladeEditor.mockResolvedValue({ ...DATEN, struktur: MC_STRUKTUR })
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
    nachricht({ wkBereit: true }, rahmen)
    return { rahmen, senden }
  }
  const neuerBlock = (answers: unknown[]) => ({ ...MC_STRUKTUR.chapters[0].elements[1], answers })

  it('Klick auf eine Antwort: erst das Aufgabenwerk, dann der Start mit gespeichertem Block und Eintrag; keine Schublade', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkAufgabe: 'k0-e1', eintrag: { art: 'eintrag', nr: 2 }, anzahl: 3 }, rahmen)
    await waitFor(() =>
      expect(senden).toHaveBeenCalledWith(
        { wkAufgabeStart: { marke: 'k0-e1', block: MC_STRUKTUR.chapters[0].elements[1], typName: expect.any(String), eintrag: { art: 'eintrag', nr: 2 } } },
        '*',
      ),
      { timeout: 4000 },
    )
    const reihenfolge = senden.mock.calls.map((c) => Object.keys(c[0] as object)[0])
    expect(reihenfolge.indexOf('wkAufgabenwerk')).toBeLessThan(reihenfolge.indexOf('wkAufgabeStart'))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('passt die gezählte Anzahl nicht, öffnet die Aufgabe ohne Eintrag', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkAufgabe: 'k0-e1', eintrag: { art: 'eintrag', nr: 2 }, anzahl: 4 }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkAufgabeStart: expect.objectContaining({ eintrag: null }) }, '*'), { timeout: 4000 })
  })

  it('Änderungen werden geprüft gespeichert, unbekannte Felder bleiben; kein Neubau, solange offen', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkAufgabe: 'k0-e1', eintrag: null, anzahl: null }, rahmen)
    const bauten = api.baueEntwurfVorschau.mock.calls.length
    nachricht(
      { wkAufgabeAenderung: 'k0-e1', gruppe: 'richtig', block: { ...neuerBlock([{ text: 'Frachtführer' }, { text: 'Absender', correct: true }, { text: 'Empfänger' }]), quelle: 'gefälscht' } },
      rahmen,
    )
    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalled(), { timeout: 4000 })
    expect(mcBlock().quelle).toBe('Heft 2')
    expect((mcBlock().answers as { correct: boolean }[]).map((a) => a.correct)).toEqual([false, true, false])
    await new Promise((r) => setTimeout(r, 1500))
    expect(api.baueEntwurfVorschau.mock.calls.length).toBe(bauten)
    nachricht({ wkAufgabeEnde: 'k0-e1' }, rahmen)
    await waitFor(() => expect(api.baueEntwurfVorschau.mock.calls.length).toBeGreaterThan(bauten), { timeout: 5000 })
  }, 15000)

  it('Löschen in der Seite: Toast mit Rückgängig; Rückgängig schickt den alten Stand in die Seite', async () => {
    const { toast } = await import('sonner')
    const { rahmen, senden } = await bereit()
    nachricht({ wkAufgabe: 'k0-e1', eintrag: null, anzahl: null }, rahmen)
    nachricht({ wkAufgabeAenderung: 'k0-e1', gruppe: 'loeschen-antwort', block: neuerBlock((MC_STRUKTUR.chapters[0].elements[1].answers as unknown[]).slice(0, 2)) }, rahmen)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Antwort gelöscht', expect.objectContaining({ action: expect.objectContaining({ label: 'Rückgängig' }) })))
    const aufruf = vi.mocked(toast.success).mock.calls.find((c) => c[0] === 'Antwort gelöscht')!
    senden.mockClear()
    ;(aufruf[1] as unknown as { action: { onClick: () => void } }).action.onClick()
    await waitFor(() =>
      expect(senden).toHaveBeenCalledWith({ wkAufgabeStand: expect.objectContaining({ answers: expect.arrayContaining([expect.objectContaining({ text: 'Empfänger' })]) }) }, '*'),
    )
  })

  it('fremde Marken, falsche Typen und zu lange Texte werden nicht gespeichert', async () => {
    const { toast } = await import('sonner')
    const { rahmen } = await bereit()
    nachricht({ wkAufgabeAenderung: 'k0-e1', gruppe: 'richtig', block: neuerBlock([]) }, rahmen)
    nachricht({ wkAufgabe: 'k0-e1', eintrag: null, anzahl: null }, rahmen)
    nachricht({ wkAufgabeAenderung: 'k0-e1', gruppe: 'x', block: { type: 'true_false', correct: true } }, rahmen)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 1200))
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('im Modus Ausprobieren schließt die Aufgabe', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkAufgabe: 'k0-e1', eintrag: null, anzahl: null }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith(expect.objectContaining({ wkAufgabeStart: expect.anything() }), '*'), { timeout: 4000 })
    fireEvent.click(screen.getByRole('radio', { name: 'Ausprobieren' }))
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkAufgabeBeende: true }, '*'))
  })

  it('⋯ „Element löschen“ beendet ohne Rückmeldung und löscht den Block', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkAufgabe: 'k0-e1', eintrag: null, anzahl: null }, rahmen)
    nachricht({ wkAufgabeAktion: 'k0-e1', aktion: 'loeschen' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkAufgabeVorbei: true }, '*'))
    await waitFor(() => expect(letzteStruktur().chapters[0].elements.map((e) => e.type)).toEqual(['text']), { timeout: 4000 })
  })
})

describe('Lückentext an Ort und Stelle (PROJ-114, Bauschritt 2)', () => {
  const letzteStruktur = () => api.speichereEntwurf.mock.calls.at(-1)![1] as Struktur
  function nachricht(data: unknown, rahmen: HTMLIFrameElement | null) {
    fireEvent(window, new MessageEvent('message', { data, source: rahmen?.contentWindow ?? null }))
  }

  it('Klick in der Seite öffnet den Lückentext an der Lücke, Änderungen landen in Sternchen-Schreibweise im Entwurf', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
    nachricht({ wkBereit: true }, rahmen)
    // Die Seite erfährt, welche Blöcke Aufgaben sind
    expect(senden).toHaveBeenCalledWith({ wkZustand: expect.objectContaining({ aufgaben: { 'k0-e1': 'fill_blanks' } }) }, '*')
    nachricht({ wkAufgabe: 'k0-e1', eintrag: { art: 'eintrag', nr: 0 }, anzahl: 1 }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenCalledWith({ wkAufgabeStart: expect.objectContaining({ eintrag: { art: 'eintrag', nr: 0 } }) }, '*'), { timeout: 4000 })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    nachricht({ wkAufgabeAenderung: 'k0-e1', gruppe: 'luecke-neu', block: { type: 'fill_blanks', text: 'Der *Frachtführer* *haftet*.' } }, rahmen)
    await waitFor(() => expect(letzteStruktur().chapters[0].elements[1]).toEqual({ type: 'fill_blanks', text: 'Der *Frachtführer* *haftet*.' }), { timeout: 4000 })
  })
})

describe('Ein Weg zum Bearbeiten (PROJ-114, Schritt 3)', () => {
  const letzteStruktur = () => api.speichereEntwurf.mock.calls.at(-1)![1] as Struktur
  const typen = (t: number) => letzteStruktur().chapters[t].elements.map((b) => b.type)
  const gestartet = (senden: { mock: { calls: unknown[][] } }, marke?: string) =>
    senden.mock.calls.some((c) => {
      const n = c[0] as { wkAufgabeStart?: { marke: string } }
      return !!n.wkAufgabeStart && (marke === undefined || n.wkAufgabeStart.marke === marke)
    })
  /** Wie im Browser: Jeder Neubau liefert eine andere Seite, die erst nach „bereit“ einen Start annimmt */
  async function bereit() {
    let nr = 0
    vi.stubGlobal('fetch', vi.fn(async () => new Response(`<html><body><p>Seite ${++nr}</p></body></html>`)))
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
    ausSeite({ wkBereit: true }, rahmen)
    return { rahmen, senden }
  }
  /** Warten, bis nach dem Speichern die neue Seite gebaut ist (noch ohne „bereit“) */
  async function neuGebaut(bauten: number) {
    await waitFor(() => expect(api.baueEntwurfVorschau.mock.calls.length).toBeGreaterThan(bauten), { timeout: 8000 })
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument(), { timeout: 8000 })
  }
  const gliederung = () => screen.getByRole('region', { name: 'Gliederung', hidden: true })

  it('neuer Block mit Bauplan: keine Schublade; erst nach Neubau und „bereit“ geht er in der Seite auf', async () => {
    const { rahmen, senden } = await bereit()
    const bauten = api.baueEntwurfVorschau.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Grundlagen“/ }))
    waehleImKatalog('memory_game')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    await neuGebaut(bauten)
    expect(typen(0)).toEqual(['text', 'fill_blanks', 'memory_game'])
    // Die neue Seite hat noch nicht „bereit“ gemeldet: Ein Start ginge verloren, also wartet die App
    expect(gestartet(senden)).toBe(false)
    ausSeite({ wkBereit: true }, rahmen)
    await waitFor(() => expect(gestartet(senden, 'k0-e2')).toBe(true))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  }, 20000)

  it('neuer Block ohne Bauplan (Tabelle) öffnet sofort die Schublade', async () => {
    const { senden } = await bereit()
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Grundlagen“/ }))
    waehleImKatalog('tabelle')
    expect(await screen.findByRole('complementary')).toBeInTheDocument()
    expect(gestartet(senden)).toBe(false)
  })

  it('scheitert der Neubau, öffnet der neue Block die Schublade (Ausweg)', async () => {
    const { senden } = await bereit()
    const bauten = api.baueEntwurfVorschau.mock.calls.length
    api.baueEntwurfVorschau.mockRejectedValue(new Error('Die Vorschau konnte nicht gebaut werden.'))
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Grundlagen“/ }))
    waehleImKatalog('memory_game')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    await waitFor(() => expect(api.baueEntwurfVorschau.mock.calls.length).toBeGreaterThan(bauten), { timeout: 8000 })
    expect(await screen.findByRole('complementary', {}, { timeout: 8000 })).toBeInTheDocument()
    expect(gestartet(senden)).toBe(false)
  }, 20000)

  it('meldet die Seite „Abbruch“ (Block dort nicht auffindbar), öffnet die Schublade', async () => {
    const { rahmen, senden } = await bereit()
    fireEvent.click(within(gliederung()).getByText('Lückentext').closest('button')!)
    await waitFor(() => expect(gestartet(senden, 'k0-e1')).toBe(true))
    ausSeite({ wkAufgabeAbbruch: 'k0-e1' }, rahmen)
    expect(await screen.findByRole('complementary', { name: 'Lückentext' })).toBeInTheDocument()
  })

  it('Rückgängig direkt nach dem Einfügen: Die Vormerkung verfällt, der Block, der jetzt dort steht, öffnet nicht', async () => {
    const { rahmen, senden } = await bereit()
    oeffneMenu(/Weitere Aktionen für Lückentext/)
    fireEvent.click(await screen.findByRole('menuitem', { name: /Element darüber einfügen/ }))
    waehleImKatalog('memory_game')
    // Neuer Block an k0-e1; Rückgängig stellt den Lückentext wieder an diese Stelle
    fireEvent.click(screen.getByRole('button', { name: /^Rückgängig/ }))
    // Die Seite ist bereit und zeigt an k0-e1 genau den Lückentext von jetzt: Ohne Fingerabdruck der Vormerkung ginge er auf
    await new Promise((r) => setTimeout(r, 1500))
    expect(gestartet(senden)).toBe(false)
    expect(senden).not.toHaveBeenCalledWith(expect.objectContaining({ wkAufgabenwerk: expect.anything() }), '*')
    void rahmen
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  }, 20000)

  it('andere Auswahl vor dem Neubau: Die Vormerkung verfällt', async () => {
    const { rahmen, senden } = await bereit()
    const bauten = api.baueEntwurfVorschau.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Grundlagen“/ }))
    waehleImKatalog('memory_game')
    fireEvent.click(within(gliederung()).getByText('Lehrtext').closest('button')!)
    expect(await screen.findByRole('complementary', { name: 'Lehrtext' })).toBeInTheDocument()
    await neuGebaut(bauten)
    ausSeite({ wkBereit: true }, rahmen)
    await new Promise((r) => setTimeout(r, 1500))
    expect(gestartet(senden)).toBe(false)
    expect(screen.getByRole('complementary', { name: 'Lehrtext' })).toBeInTheDocument()
  }, 20000)

  it('Wechsel zu „Ausprobieren“ vor dem Neubau: Die Vormerkung verfällt', async () => {
    const { rahmen, senden } = await bereit()
    const bauten = api.baueEntwurfVorschau.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: /Element hinzufügen in „Grundlagen“/ }))
    waehleImKatalog('memory_game')
    fireEvent.click(screen.getByRole('radio', { name: 'Ausprobieren' }))
    await neuGebaut(bauten)
    ausSeite({ wkBereit: true }, rahmen)
    fireEvent.click(screen.getByRole('radio', { name: 'Bearbeiten' }))
    await new Promise((r) => setTimeout(r, 1500))
    expect(gestartet(senden)).toBe(false)
  }, 20000)

  it('Klick in der Gliederung öffnet eine Aufgabe in der Seite; ein zweiter Klick ändert nichts', async () => {
    const { senden } = await bereit()
    fireEvent.click(within(gliederung()).getByText('Lückentext').closest('button')!)
    await waitFor(() => expect(gestartet(senden, 'k0-e1')).toBe(true))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    senden.mockClear()
    fireEvent.click(within(gliederung()).getByText('Lückentext').closest('button')!)
    await new Promise((r) => setTimeout(r, 100))
    expect(gestartet(senden)).toBe(false)
    expect(senden).not.toHaveBeenCalledWith({ wkAufgabeBeende: true }, '*')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('Klick in der Gliederung, bevor die Seite bereit ist: öffnet, sobald sie „bereit“ meldet', async () => {
    let nr = 0
    vi.stubGlobal('fetch', vi.fn(async () => new Response(`<html><body><p>Seite ${++nr}</p></body></html>`)))
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
    fireEvent.click(within(gliederung()).getByText('Lückentext').closest('button')!)
    await new Promise((r) => setTimeout(r, 100))
    expect(gestartet(senden)).toBe(false)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    ausSeite({ wkBereit: true }, rahmen)
    await waitFor(() => expect(gestartet(senden, 'k0-e1')).toBe(true))
  })

  it('Klick auf einen Hinweis der Prüfstelle öffnet die Aufgabe in der Seite', async () => {
    const { senden } = await bereit()
    fireEvent.click(within(gliederung()).getByRole('button', { name: /Verbesserungsvorschläge/ }))
    fireEvent.click(await within(gliederung()).findByText('Thema 1 – Keine richtige Antwort'))
    await waitFor(() => expect(gestartet(senden, 'k0-e1')).toBe(true))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('Hinweis zum Lehrtext oder Thema öffnet weiter die Schublade', async () => {
    api.baueEntwurfVorschau.mockResolvedValue({
      adresse: 'https://speicher.test/entwurf.html',
      befunde: [{ text: 'Thema 2 ist leer', schwere: 'mittel', stellen: [{ kapitel: 1 }] }],
      groesse: 1000,
      stand: null,
    })
    const { senden } = await bereit()
    fireEvent.click(within(gliederung()).getByRole('button', { name: /Verbesserungsvorschläge/ }))
    fireEvent.click(await within(gliederung()).findByText('Thema 2 ist leer'))
    expect(await screen.findByRole('complementary')).toBeInTheDocument()
    expect(gestartet(senden)).toBe(false)
  })

  it('Handy: Klick auf eine Aufgabe in der Gliederung zeigt die Seite statt des Blatts', async () => {
    mockViewport(390)
    const { senden } = await bereit()
    fireEvent.click(screen.getByRole('radio', { name: 'Gliederung' }))
    fireEvent.click(within(await screen.findByRole('region', { name: 'Gliederung' })).getByText('Lückentext').closest('button')!)
    await waitFor(() => expect(gestartet(senden, 'k0-e1')).toBe(true))
    expect(screen.getByRole('radio', { name: 'Vorschau' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
