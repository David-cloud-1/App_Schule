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
  ladeMaterialBilder: vi.fn(),
  ladeMaterialBild: vi.fn(),
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
  api.ladeMaterialBilder.mockResolvedValue({ bilder: [], mehr: false })
  window.localStorage.clear()
  // Die Gliederung startet eingeklappt (PROJ-96); die bisherigen Tests arbeiten in der offenen Liste
  window.localStorage.setItem('wk-editor-gliederung', 'offen')
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

  it('ohne Zugriff: schreibgeschützt mit klarem Satz, kein endloses Wiederholen (QA BUG-4)', async () => {
    api.speichereEntwurf.mockRejectedValue(new WerkzeugFehler('Kein Zugriff', 403))
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByText('Lückentext')
    fireEvent.click(screen.getByRole('button', { name: /Thema hinzufügen/ }))
    expect(await screen.findByText(/keinen Zugriff mehr auf die Werkzeugkiste/, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Veröffentlichen' })).toBeDisabled()
    expect(screen.getByRole('region', { name: 'Gliederung' })).toHaveAttribute('inert')
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

describe('Block einfügen (PROJ-90)', () => {
  const letzteStruktur = () => api.speichereEntwurf.mock.calls.at(-1)![1] as Struktur

  it('„Block hinzufügen“ fügt am Ende des Themas mit Beispiel ein, öffnet ihn und speichert', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    fireEvent.click(screen.getByRole('button', { name: /Block hinzufügen in „Grundlagen“/ }))
    expect(screen.getByRole('heading', { name: 'Block hinzufügen' })).toBeInTheDocument()
    fireEvent.click(document.querySelector('[data-katalog-eintrag="true_false"]')!)
    // Formular des neuen Blocks ist offen
    expect(await screen.findByLabelText(/^Aussage/)).toHaveValue('Eine Woche hat sieben Tage. (Ersetze diese Aussage durch deine eigene.)')
    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalled(), { timeout: 3000 })
    expect(letzteStruktur().chapters[0].elements.map((b) => b.type)).toEqual(['text', 'fill_blanks', 'true_false'])
    expect(JSON.parse(window.localStorage.getItem('wk-katalog-zuletzt')!)).toEqual(['true_false'])
  })

  it('fügt in ein leeres Thema ein und meldet den Beispielinhalt als Hinweis', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    fireEvent.click(screen.getByRole('button', { name: /Block hinzufügen in „Haftungsgrenzen“/ }))
    fireEvent.click(document.querySelector('[data-katalog-eintrag="crossword"]')!)
    const gliederung = screen.getByRole('region', { name: 'Gliederung' })
    expect(await within(gliederung).findByText('Kreuzworträtsel')).toBeInTheDocument()
    expect(within(gliederung).queryByText('Noch keine Blöcke')).not.toBeInTheDocument()
    fireEvent.click(within(gliederung).getByRole('button', { name: /Hinweise der Prüfstelle/ }))
    expect(await within(gliederung).findByText(/Thema 2 – Kreuzworträtsel: Beispielinhalt noch nicht ersetzt/)).toBeInTheDocument()
  })

  it('„Block darüber einfügen“ setzt den Block vor den gewählten; Rückgängig nimmt ihn zurück', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    oeffneMenu(/Weitere Aktionen für Lückentext/)
    fireEvent.click(await screen.findByRole('menuitem', { name: /Block darüber einfügen/ }))
    fireEvent.click(document.querySelector('[data-katalog-eintrag="memory_game"]')!)
    await waitFor(() => expect(api.speichereEntwurf).toHaveBeenCalled(), { timeout: 3000 })
    expect(letzteStruktur().chapters[0].elements.map((b) => b.type)).toEqual(['text', 'memory_game', 'fill_blanks'])
    fireEvent.click(screen.getByRole('button', { name: /Rückgängig/ }))
    await waitFor(() => expect(letzteStruktur().chapters[0].elements.map((b) => b.type)).toEqual(['text', 'fill_blanks']), { timeout: 3000 })
  })

  it('Abbrechen im Katalog fügt nichts ein', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('heading', { name: 'Mein Material' })
    fireEvent.click(screen.getByRole('button', { name: /Block hinzufügen in „Grundlagen“/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Block hinzufügen' })).not.toBeInTheDocument())
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
    fireEvent.click(screen.getByRole('button', { name: /Block hinzufügen in „Grundlagen“/ }))
    await waitFor(() => expect(document.querySelector('[data-katalog-eintrag="image"]')).not.toHaveAttribute('aria-disabled'))
    fireEvent.click(document.querySelector('[data-katalog-eintrag="image"]')!)
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
    fireEvent.click(screen.getByRole('button', { name: /Block hinzufügen in „Grundlagen“/ }))
    await waitFor(() => expect(document.querySelector('[data-katalog-eintrag="image"]')).not.toHaveAttribute('aria-disabled'))
    fireEvent.click(document.querySelector('[data-katalog-eintrag="image"]')!)
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

  it('öffnet die Schublade mit dem Formular, wenn man in der Gliederung einen Block wählt, und schließt sie mit Esc', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    fireEvent.click(within(gliederung).getByText('Lückentext').closest('button')!)
    const schublade = await screen.findByRole('complementary', { name: 'Lückentext' })
    expect(within(schublade).getByLabelText(/^Text/)).toBeInTheDocument()
    // Das Formular steht nicht mehr in der Gliederung
    expect(within(gliederung).queryByLabelText(/^Text/)).not.toBeInTheDocument()
    fireEvent.keyDown(within(schublade).getByLabelText(/^Text/), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('wählt per „Bearbeiten“-Klick aus der Vorschau den Block aus – wenn die Vorschau aktuell ist', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    nachricht({ wkWaehle: 'k0-e1' }, rahmen)
    const schublade = await screen.findByRole('complementary', { name: 'Lückentext' })
    expect(within(schublade).getByLabelText(/^Text/)).toBeInTheDocument()
  })

  it('beendet die Vollbreite und öffnet die Schublade, wenn man in der Vorschau „Bearbeiten“ klickt (QA BUG-1)', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Vorschau über die ganze Breite' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    nachricht({ wkWaehle: 'k0-e1' }, rahmen)
    expect(await screen.findByRole('complementary', { name: 'Lückentext' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vorschau über die ganze Breite' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('verliert den Fokus beim Schließen der Schublade nicht (Zeile der Gliederung, sonst Vorschau; QA BUG-2)', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    const zeile = within(gliederung).getByText('Lückentext').closest('button')!
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
    nachricht({ wkWaehle: 'k0-e1' }, rahmen)
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

  it('wählt nicht aus, solange die Vorschau veraltet ist, und sagt es', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
    await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
    // Eine Änderung: Der Entwurf ist noch nicht gespeichert und die Seite noch nicht neu gebaut
    fireEvent.click(screen.getByRole('button', { name: /Thema hinzufügen/ }))
    await screen.findByRole('complementary')
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten schließen' }))
    nachricht({ wkWaehle: 'k0-e1' }, rahmen)
    expect(await screen.findByText(/Bitte gleich noch einmal klicken/)).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('blendet Gliederung und Schublade aus, wenn die Vorschau die ganze Breite bekommt', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lückentext').closest('button')!)
    await screen.findByRole('complementary')
    fireEvent.click(screen.getByRole('button', { name: 'Vorschau über die ganze Breite' }))
    expect(screen.queryByRole('region', { name: 'Gliederung' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeitung wieder einblenden' }))
    expect(screen.getByRole('region', { name: 'Gliederung' })).toBeInTheDocument()
    expect(await screen.findByRole('complementary')).toBeInTheDocument()
  })

  it('schließt die Schublade, wenn der gewählte Block verschwindet (Löschen)', async () => {
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lückentext').closest('button')!)
    await screen.findByRole('complementary')
    oeffneMenu(/Weitere Aktionen für Lückentext/)
    fireEvent.click(await screen.findByRole('menuitem', { name: /Löschen/ }))
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('zeigt die Schublade auf dem Handy als Blatt von unten', async () => {
    mockViewport(390)
    renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
    await screen.findByRole('radiogroup', { name: 'Ansicht' })
    fireEvent.click(screen.getByRole('radio', { name: 'Gliederung' }))
    const gliederung = await screen.findByRole('region', { name: 'Gliederung' })
    fireEvent.click(within(gliederung).getByText('Lückentext').closest('button')!)
    const blatt = await screen.findByRole('dialog')
    expect(within(blatt).getByLabelText(/^Text/)).toBeInTheDocument()
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

  it('das Hilfsskript hat Knöpfe, prüft den Absender und läuft nur in der Vorschau', () => {
    const html = mitSprungSkript('<html><body><p>x</p></body></html>')
    expect(html).toContain('wk-k')
    expect(html).toContain('e.source!==parent')
    expect(html).toContain('wkWaehle')
    expect(html).toContain('@media print{.wk-k{display:none!important}')
    expect(html).not.toContain('allow-same-origin')
  })
})

describe('Hilfsskript in der Seite (PROJ-96)', () => {
  function laufenLassen() {
    document.body.innerHTML =
      '<h2 data-wk="k0">Thema</h2><div data-wk="k0-e0"><p>Block A</p></div><div data-wk="k0-e1"><p>Block B</p></div>' +
      '<div data-wk="abschluss"><div data-wk="abschluss-summary">Teil</div></div><div data-wk="k1;x">Fremd</div>'
    const code = mitSprungSkript('<body></body>').match(/<script>([\s\S]*)<\/script>/)![1]
    Element.prototype.scrollIntoView = vi.fn()
    const gesendet = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    new Function(code)()
    return gesendet
  }

  it('setzt an Themen, Blöcken und der Lernzielkontrolle einen Knopf – an sonst nichts', () => {
    const gesendet = laufenLassen()
    const knoepfe = [...document.querySelectorAll('.wk-k')].map((k) => k.getAttribute('data-wk-knopf'))
    expect(knoepfe).toEqual(['k0', 'k0-e0', 'k0-e1', 'abschluss'])
    expect(document.querySelector('[data-wk="abschluss-summary"] .wk-k')).toBeNull()
    expect(gesendet).toHaveBeenCalledWith({ wkBereit: true }, '*')
  })

  it('meldet den Klick auf einen Knopf mit der Marke und lässt sonstige Klicks in Ruhe', () => {
    const gesendet = laufenLassen()
    const seitenKlick = vi.fn()
    document.querySelector('[data-wk="k0-e1"] p')!.addEventListener('click', seitenKlick)
    ;(document.querySelector('[data-wk-knopf="k0-e1"]') as HTMLElement).click()
    expect(gesendet).toHaveBeenCalledWith({ wkWaehle: 'k0-e1' }, '*')
    const davor = gesendet.mock.calls.length
    document.querySelector<HTMLElement>('[data-wk="k0-e1"] p')!.click()
    expect(seitenKlick).toHaveBeenCalledTimes(1)
    expect(gesendet.mock.calls.length).toBe(davor) // ein Klick in die Aufgabe meldet nichts
  })

  it('hebt die gewählte Stelle hervor, nimmt aber nur Nachrichten vom Elternfenster an', () => {
    laufenLassen()
    fireEvent(window, new MessageEvent('message', { data: { wk: 'k0-e1' }, source: window }))
    expect(document.querySelector('.wk-aktiv')?.getAttribute('data-wk')).toBe('k0-e1')
    fireEvent(window, new MessageEvent('message', { data: { wk: 'k0-e0' }, source: null }))
    expect(document.querySelector('.wk-aktiv')?.getAttribute('data-wk')).toBe('k0-e1')
    fireEvent(window, new MessageEvent('message', { data: { wk: null }, source: window }))
    expect(document.querySelector('.wk-aktiv')).toBeNull()
  })
})
