import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { mockViewport, renderInWorkspace } from '@/components/admin/workspace-test-utils'
import type { EditorDaten, Struktur } from '@/lib/werkzeugkiste-editor'

const api = vi.hoisted(() => ({
  ladeEditor: vi.fn(),
  speichereEntwurf: vi.fn(),
  verwirfEntwurf: vi.fn(),
  baueEntwurfVorschau: vi.fn(),
  veroeffentlicheEntwurf: vi.fn(),
  ladeMaterialBilder: vi.fn(),
  ladeMaterialBild: vi.fn(),
  uebernehmeBilder: vi.fn(),
}))
vi.mock('@/lib/werkzeugkiste-api', async (original) => ({
  ...(await original<typeof import('@/lib/werkzeugkiste-api')>()),
  ...api,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

import { BaukastenEditor } from './baukasten-editor'
import { kopiereBloecke, leereZwischenablage } from './block-zwischenablage'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

const ID = '11111111-1111-4111-8111-111111111111'
const ANDERES = '22222222-2222-4222-8222-222222222222'
const text = (n: string) => ({ type: 'text', content: n })
function struktur(): Struktur {
  return {
    cover: { title: 'Mehr' },
    chapters: [
      { title: 'Eins', elements: [text('a'), text('b'), text('c')] },
      { title: 'Zwei', elements: [text('d'), text('e')] },
      { title: 'Drei', elements: [] },
    ],
    final_chapter: { title: 'Lernzielkontrolle' },
  }
}
const DATEN = (extra: Partial<EditorDaten> = {}): EditorDaten => ({
  id: ID,
  titel: 'Mein Material',
  werkzeug: 'skript',
  struktur: struktur(),
  stand: null,
  befunde: null,
  oeffentlich: false,
  imRegal: false,
  nutzer: 'u1',
  ...extra,
})

beforeEach(() => {
  vi.clearAllMocks()
  leereZwischenablage()
  window.localStorage.clear()
  mockViewport(1440)
  api.ladeEditor.mockResolvedValue(DATEN())
  api.speichereEntwurf.mockImplementation(async () => ({ stand: `stand-${api.speichereEntwurf.mock.calls.length}` }))
  api.baueEntwurfVorschau.mockResolvedValue({ adresse: 'https://speicher.test/entwurf.html', befunde: [], groesse: 1000, stand: null })
  api.ladeMaterialBilder.mockResolvedValue({ bilder: [], mehr: false })
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><body><p>Seite</p></body></html>')))
})

const letzte = () => api.speichereEntwurf.mock.calls.at(-1)![1] as Struktur
const inhalt = (s: Struktur) => s.chapters.map((t) => t.elements.map((b) => String(b.content)).join(''))
const gespeichert = (n = 1) => waitFor(() => expect(api.speichereEntwurf.mock.calls.length).toBeGreaterThanOrEqual(n), { timeout: 3000 })
function nachricht(data: unknown, rahmen: HTMLIFrameElement) {
  fireEvent(window, new MessageEvent('message', { data, source: rahmen.contentWindow }))
}
async function bereit() {
  renderInWorkspace(<BaukastenEditor id={ID} />, { withSidebar: false })
  const rahmen = (await screen.findByTitle('Vorschau der Seite')) as HTMLIFrameElement
  await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument())
  const senden = vi.spyOn(rahmen.contentWindow!, 'postMessage')
  return { rahmen, senden }
}
/** Zwei Wünsche brauchen Zeit, bis der Neubau der Vorschau durch ist: erst dann gelten Marken wieder */
const aktuell = async (n = 2) => {
  await waitFor(() => expect(api.baueEntwurfVorschau.mock.calls.length).toBeGreaterThanOrEqual(n), { timeout: 4000 })
  await waitFor(() => expect(screen.queryByText(/Vorschau wird aktualisiert/)).not.toBeInTheDocument(), { timeout: 4000 })
}

describe('Mehrfachauswahl (PROJ-102)', () => {
  it('⌘/Strg+Klick und Umschalt+Klick wählen mehrere Blöcke, auch über Themengrenzen; das Formular bleibt zu', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkMehr: 'k0-e2', wie: 'umschalten' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith(expect.objectContaining({ wk: 'k0-e2', mehr: ['k0-e0', 'k0-e2'] }), '*'))
    nachricht({ wkMehr: 'k1-e0', wie: 'bereich' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith(expect.objectContaining({ wk: 'k1-e0', mehr: ['k0-e2', 'k1-e0'] }), '*'))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    // ein normaler Klick beendet die Mehrfachauswahl
    nachricht({ wkWaehle: 'k1-e1' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith(expect.objectContaining({ wk: 'k1-e1', mehr: [] }), '*'))
  })

  it('wegnehmen bis ein Block übrig ist ergibt wieder eine Einzelauswahl', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkMehr: 'k0-e1', wie: 'umschalten' }, rahmen)
    nachricht({ wkMehr: 'k0-e1', wie: 'umschalten' }, rahmen)
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith(expect.objectContaining({ wk: 'k0-e0', mehr: [] }), '*'))
  })

  it('löscht mehrere Blöcke in einem Schritt; ein Rückgängig stellt alle wieder her', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkMehr: 'k0-e2', wie: 'umschalten' }, rahmen)
    nachricht({ wkLoesche: 'k0-e2' }, rahmen)
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['b', 'de', ''])
    expect(toast.success).toHaveBeenCalledWith('2 Blöcke gelöscht', expect.anything())
    fireEvent.click(screen.getByRole('button', { name: /Rückgängig/ }))
    await waitFor(() => expect(inhalt(letzte())).toEqual(['abc', 'de', '']), { timeout: 4000 })
  })

  it('fragt ab 5 Blöcken nach, bevor gelöscht wird', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkMehr: 'k1-e1', wie: 'bereich' }, rahmen)
    nachricht({ wkLoesche: 'k1-e1' }, rahmen)
    expect(await screen.findByText('5 Blöcke löschen?')).toBeInTheDocument()
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['', '', ''])
  })
})

describe('Ziehen und Verschieben (PROJ-102)', () => {
  it('legt die gewählten Blöcke an der Zielstelle ab, auch in einem anderen Thema, in alter Reihenfolge', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkMehr: 'k0-e2', wie: 'umschalten' }, rahmen)
    nachricht({ wkLege: 'k1-e0', wo: 'nach' }, rahmen)
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['b', 'dace', ''])
    // die verschobenen Blöcke bleiben gewählt
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith(expect.objectContaining({ mehr: ['k1-e1', 'k1-e2'] }), '*'))
  })

  it('legt in ein leeres Thema ab („anfang“)', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k1-e1' }, rahmen)
    nachricht({ wkLege: 'k2', wo: 'anfang' }, rahmen)
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['abc', 'd', 'e'])
  })

  it('Alt+Pfeil verschiebt um eine Stelle und über die Themengrenze', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k0-e2' }, rahmen)
    nachricht({ wkTaste: 'ArrowDown', mod: false, shift: false, alt: true }, rahmen)
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['ab', 'cde', ''])
    await aktuell()
    nachricht({ wkTaste: 'ArrowUp', mod: false, shift: false, alt: true }, rahmen)
    await gespeichert(2)
    expect(inhalt(letzte())).toEqual(['abc', 'de', ''])
  })

  it('Themen lassen sich nur vor ein anderes Thema oder ans Ende legen', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k0' }, rahmen)
    nachricht({ wkLegeThema: 'abschluss' }, rahmen)
    await gespeichert()
    expect(letzte().chapters.map((t) => t.title)).toEqual(['Zwei', 'Drei', 'Eins'])
  })

  it('ein Thema auf die eigene Stelle zu legen ändert nichts', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k1' }, rahmen)
    nachricht({ wkLegeThema: 'k2' }, rahmen)
    await new Promise((r) => setTimeout(r, 100))
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('„Verschieben nach …“ im Menü setzt den Block ans Ende des gewählten Themas', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkMenue: 'k0-e0', x: 100, y: 50 }, rahmen)
    fireEvent.keyDown(await screen.findByRole('menuitem', { name: /Verschieben nach/ }), { key: 'ArrowRight' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Zwei' }))
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['bc', 'dea', ''])
  })
})

describe('Kopieren und Einfügen (PROJ-102)', () => {
  it('kopiert Blöcke und fügt sie hinter dem gewählten Block ein; die eingefügten sind gewählt', async () => {
    const { rahmen, senden } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkMehr: 'k0-e1', wie: 'umschalten' }, rahmen)
    nachricht({ wkTaste: 'c', mod: true, shift: false, alt: false }, rahmen)
    expect(toast.success).toHaveBeenCalledWith('2 Blöcke kopiert')
    nachricht({ wkWaehle: 'k1-e1' }, rahmen)
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['abc', 'deab', ''])
    expect(toast.success).toHaveBeenCalledWith('2 Blöcke eingefügt')
    await waitFor(() => expect(senden).toHaveBeenLastCalledWith(expect.objectContaining({ mehr: ['k1-e2', 'k1-e3'] }), '*'))
  })

  it('Ausschneiden entfernt die Blöcke und legt sie in die Zwischenablage; Einfügen holt sie wieder', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k0-e1' }, rahmen)
    nachricht({ wkTaste: 'x', mod: true, shift: false, alt: false }, rahmen)
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['ac', 'de', ''])
    await aktuell()
    nachricht({ wkWaehle: 'k1-e0' }, rahmen)
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    await gespeichert(2)
    expect(inhalt(letzte())).toEqual(['ac', 'dbe', ''])
  })

  it('ohne Auswahl landet das Eingefügte am Ende des letzten Themas', async () => {
    kopiereBloecke([text('z')], ID, 'u1')
    const { rahmen } = await bereit()
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['abc', 'de', 'z'])
  })

  it('ist die Zwischenablage leer, sagt ein Hinweis es', async () => {
    const { rahmen } = await bereit()
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Zwischenablage ist leer')))
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('die Zwischenablage einer anderen Person wird nicht benutzt', async () => {
    kopiereBloecke([text('fremd')], ID, 'andere-person')
    const { rahmen } = await bereit()
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    await waitFor(() => expect(toast.info).toHaveBeenCalled())
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('aus einem anderen Material: Bilder werden vorher übernommen und die Namen ersetzt', async () => {
    kopiereBloecke([{ type: 'image', path: 'images/seite1_x.png', caption: 'Bild' }], ANDERES, 'u1')
    api.uebernehmeBilder.mockResolvedValue({ zuordnung: { 'images/seite1_x.png': 'images/eigen_abcdef12.png' }, fehlend: [] })
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k1-e0' }, rahmen)
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    await gespeichert()
    expect(api.uebernehmeBilder).toHaveBeenCalledWith(ID, ANDERES, ['images/seite1_x.png'], 1000)
    expect(letzte().chapters[1].elements[1]).toMatchObject({ type: 'image', path: 'images/eigen_abcdef12.png' })
  })

  it('reicht der Platz nicht, wird nichts eingefügt', async () => {
    kopiereBloecke([{ type: 'image', path: 'images/seite1_x.png' }], ANDERES, 'u1')
    api.uebernehmeBilder.mockRejectedValue(new Error('Die Seite wäre danach zu groß'))
    const { rahmen } = await bereit()
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Die Seite wäre danach zu groß'))
    expect(api.speichereEntwurf).not.toHaveBeenCalled()
  })

  it('im selben Material werden keine Bilder kopiert', async () => {
    kopiereBloecke([{ type: 'image', path: 'images/seite1_x.png' }], ID, 'u1')
    const { rahmen } = await bereit()
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    await gespeichert()
    expect(api.uebernehmeBilder).not.toHaveBeenCalled()
  })

  it('ein Block, den das Material nicht kennt, wird ausgelassen und gemeldet', async () => {
    kopiereBloecke([text('z'), { type: 'gibt_es_nicht' }], ID, 'u1')
    const { rahmen } = await bereit()
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    await gespeichert()
    expect(inhalt(letzte())).toEqual(['abc', 'de', 'z'])
    expect(toast.info).toHaveBeenCalledWith('1 Block passt nicht in dieses Material und wurde ausgelassen.')
  })

  it('Einfügen und Ausschneiden gehen nicht im Schreibschutz, Kopieren schon', async () => {
    api.speichereEntwurf.mockRejectedValue(Object.assign(new (await import('@/lib/werkzeugkiste-api')).WerkzeugFehler('weg', 404), {}))
    const { rahmen } = await bereit()
    nachricht({ wkWaehle: 'k0-e0' }, rahmen)
    nachricht({ wkTaste: 'd', mod: true, shift: false, alt: false }, rahmen) // löst Speichern aus → 404 → gesperrt
    await waitFor(() => expect(screen.getByText(/schreibgeschützt/)).toBeInTheDocument(), { timeout: 4000 })
    const aufrufe = api.speichereEntwurf.mock.calls.length
    nachricht({ wkTaste: 'c', mod: true, shift: false, alt: false }, rahmen)
    expect(toast.success).toHaveBeenCalledWith('1 Block kopiert')
    nachricht({ wkTaste: 'v', mod: true, shift: false, alt: false }, rahmen)
    nachricht({ wkTaste: 'x', mod: true, shift: false, alt: false }, rahmen)
    await new Promise((r) => setTimeout(r, 100))
    expect(api.speichereEntwurf.mock.calls.length).toBe(aufrufe)
  })
})
