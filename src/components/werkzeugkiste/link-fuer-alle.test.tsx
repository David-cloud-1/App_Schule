import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { LinkAdminListe, LinkStand } from '@/lib/werkzeugkiste-links'
import type { AblaufErgebnis } from '@/lib/werkzeugkiste'
import type { MaterialListe, MaterialZeile } from '@/lib/werkzeugkiste-materialien'

const api = vi.hoisted(() => ({
  ladeLink: vi.fn(),
  erzeugeLink: vi.fn(),
  schalteLinkAb: vi.fn(),
  ladeLinkUebersicht: vi.fn(),
  schalteLinkAdminAb: vi.fn(),
  ladeMaterialien: vi.fn(),
  ladeFreigabe: vi.fn(),
  ladeFreigabeOptionen: vi.fn(),
}))

vi.mock('@/lib/werkzeugkiste-api', async (original) => ({
  ...(await original<typeof import('@/lib/werkzeugkiste-api')>()),
  ...api,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { toast } from 'sonner'
import { WerkzeugFehler } from '@/lib/werkzeugkiste-api'

import { LinkDialog, LinkFeld } from './link-fuer-alle'
import { LinkUebersicht } from './link-uebersicht'
import { SchrittFertig } from './schritt-fertig'
import { TeilenDialog } from './teilen-dialog'
import { MeineMaterialien } from './meine-materialien'

// Radix misst Größen per ResizeObserver, den jsdom nicht kennt
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

const CODE = 'ab12'.repeat(12)
const STAND: LinkStand = { code: CODE, erzeugtAm: new Date().toISOString(), aufrufe: 4, letzterAufruf: null }
const ADRESSE = `${window.location.origin}/s/${CODE}`
let schreiben: ReturnType<typeof vi.fn>

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
  api.ladeLink.mockResolvedValue({ link: null })
  api.ladeFreigabe.mockResolvedValue({ freigabe: null })
  api.ladeFreigabeOptionen.mockResolvedValue({ bereiche: [{ id: 'd1', name: 'Spedition' }], faecher: [] })
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.error).mockReset()
  schreiben = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: schreiben }, configurable: true })
})
afterEach(() => vi.clearAllMocks())

describe('Link-Feld (PROJ-67)', () => {
  it('zeigt ohne Link den Hinweis, den Fortschritts-Hinweis und den Datenschutz-Satz', async () => {
    render(<LinkFeld ablaufId="a1" />)
    expect(await screen.findByText(/Jeder, der diesen Link hat, kann das Material öffnen/)).toBeInTheDocument()
    expect(screen.getByText(/merkt sich die Seite deinen Lernfortschritt nicht/)).toBeInTheDocument()
    expect(screen.getByText(/keine Namen oder Noten/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Link erzeugen und kopieren/ })).toBeEnabled()
  })

  it('erzeugt den Link, legt ihn in die Zwischenablage und zeigt ihn an', async () => {
    api.erzeugeLink.mockResolvedValue({ link: STAND })
    const geaendert = vi.fn()
    render(<LinkFeld ablaufId="a1" geaendert={geaendert} />)
    fireEvent.click(await screen.findByRole('button', { name: /Link erzeugen und kopieren/ }))
    expect(await screen.findByDisplayValue(ADRESSE)).toBeInTheDocument()
    expect(api.erzeugeLink).toHaveBeenCalledWith('a1')
    expect(schreiben).toHaveBeenCalledWith(ADRESSE)
    expect(toast.success).toHaveBeenCalledWith('Link kopiert')
    expect(geaendert).toHaveBeenCalledWith(STAND)
    expect(screen.getByText('4 Aufrufe')).toBeInTheDocument()
  })

  it('zeigt bei verbotener Zwischenablage trotzdem den Link zum Markieren', async () => {
    schreiben.mockRejectedValue(new Error('verboten'))
    api.erzeugeLink.mockResolvedValue({ link: STAND })
    render(<LinkFeld ablaufId="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Link erzeugen und kopieren/ }))
    expect(await screen.findByDisplayValue(ADRESSE)).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Link erzeugt. Markiere ihn zum Kopieren.')
  })

  it('nennt den Satz der Schnittstelle, wenn das Erzeugen scheitert', async () => {
    api.erzeugeLink.mockRejectedValue(new WerkzeugFehler('Einen Link für alle gibt es nur bei der Interaktiven Seite.', 409))
    render(<LinkFeld ablaufId="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Link erzeugen und kopieren/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('nur bei der Interaktiven Seite')
    expect(screen.getByRole('button', { name: /Link erzeugen und kopieren/ })).toBeEnabled()
  })

  it('zeigt einen vorhandenen Link mit Aufrufen, kopiert ihn und fragt vor dem Abschalten nach', async () => {
    api.ladeLink.mockResolvedValue({ link: STAND })
    api.schalteLinkAb.mockResolvedValue({ ok: true })
    const geaendert = vi.fn()
    render(<LinkFeld ablaufId="a1" geaendert={geaendert} />)
    expect(await screen.findByDisplayValue(ADRESSE)).toHaveAttribute('readonly')

    fireEvent.click(screen.getByRole('button', { name: 'Link kopieren' }))
    await waitFor(() => expect(schreiben).toHaveBeenCalledWith(ADRESSE))

    fireEvent.click(screen.getByRole('button', { name: 'Link abschalten' }))
    expect(await screen.findByText('Link abschalten?')).toBeInTheDocument()
    expect(api.schalteLinkAb).not.toHaveBeenCalled()
    const buttons = screen.getAllByRole('button', { name: 'Link abschalten' })
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => expect(api.schalteLinkAb).toHaveBeenCalledWith('a1'))
    expect(geaendert).toHaveBeenCalledWith(null)
    expect(await screen.findByRole('button', { name: /Link erzeugen und kopieren/ })).toBeInTheDocument()
  })

  it('bricht das Abschalten ab, ohne etwas zu ändern', async () => {
    api.ladeLink.mockResolvedValue({ link: STAND })
    render(<LinkFeld ablaufId="a1" />)
    await screen.findByDisplayValue(ADRESSE)
    fireEvent.click(screen.getByRole('button', { name: 'Link abschalten' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }))
    expect(api.schalteLinkAb).not.toHaveBeenCalled()
  })

  it('bietet bei einem Ladefehler „Erneut versuchen“ an', async () => {
    api.ladeLink.mockRejectedValueOnce(new WerkzeugFehler('Keine Verbindung.', 0)).mockResolvedValueOnce({ link: null })
    render(<LinkFeld ablaufId="a1" />)
    expect(await screen.findByText('Keine Verbindung.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/ }))
    expect(await screen.findByRole('button', { name: /Link erzeugen und kopieren/ })).toBeInTheDocument()
  })

  it('der Dialog nennt das Material und lädt je Material neu', async () => {
    render(<LinkDialog ziel={{ id: 'a1', titel: 'Haftung' }} schliessen={() => undefined} />)
    expect(await screen.findByText('„Haftung“')).toBeInTheDocument()
    expect(api.ladeLink).toHaveBeenCalledWith('a1')
  })
})

describe('Schritt „Fertig“ (PROJ-67)', () => {
  const ergebnis = (extra: Partial<AblaufErgebnis> = {}): AblaufErgebnis => ({
    titel: 'Haftung', dateiname: 'haftung.html', format: 'seite', kapitel: 2, aufgaben: 12, ...extra,
  })

  it('zeigt bei der Interaktiven Seite „Link für alle erzeugen“ als Nebenaktion und lässt „Herunterladen“ die Hauptaktion sein', async () => {
    render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis()} />)
    expect(await screen.findByRole('button', { name: 'Link für alle erzeugen' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Herunterladen/ })).toBeInTheDocument()
  })

  it('öffnet beim ersten Mal den Hinweis-Dialog statt gleich zu erzeugen', async () => {
    render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Link für alle erzeugen' }))
    expect(await screen.findByText(/Jeder, der diesen Link hat/)).toBeInTheDocument()
    expect(api.erzeugeLink).not.toHaveBeenCalled()
  })

  it('kopiert mit vorhandenem Link mit einem Klick und zeigt Aufrufe und „Link verwalten“', async () => {
    api.ladeLink.mockResolvedValue({ link: STAND })
    render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis()} />)
    const knopf = await screen.findByRole('button', { name: 'Link kopieren' })
    expect(screen.getByText(/Öffentlich · 4 Aufrufe/)).toBeInTheDocument()
    fireEvent.click(knopf)
    await waitFor(() => expect(schreiben).toHaveBeenCalledWith(ADRESSE))
    expect(toast.success).toHaveBeenCalledWith('Link kopiert')
    expect(screen.getByRole('button', { name: 'Link verwalten' })).toBeInTheDocument()
  })

  it('zeigt bei H5P nur den Hinweis und fragt den Link gar nicht ab', () => {
    render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis({ format: 'h5p', dateiname: 'x.h5p' })} />)
    expect(screen.queryByRole('button', { name: 'Link für alle erzeugen' })).not.toBeInTheDocument()
    expect(screen.getByText(/nur bei interaktiver seite/i)).toBeInTheDocument()
    expect(api.ladeLink).not.toHaveBeenCalled()
  })

  it('zeigt bei reinen Texten zum Kopieren weder Knopf noch Hinweis', () => {
    render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis({ format: 'texte', texte: [{ titel: 'T', text: 'x' }] })} />)
    expect(screen.queryByRole('button', { name: 'Link für alle erzeugen' })).not.toBeInTheDocument()
    expect(screen.queryByText(/nur bei interaktiver seite/i)).not.toBeInTheDocument()
  })
})

describe('Teilen-Dialog (PROJ-67)', () => {
  it('zeigt den öffentlichen Link nur bei einer Interaktiven Seite', async () => {
    const { rerender } = render(<TeilenDialog ziel={{ id: 'm1', titel: 'T', linkMoeglich: true }} schliessen={() => undefined} gespeichert={() => undefined} />)
    expect(await screen.findByRole('heading', { name: 'Öffentlicher Link' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Link erzeugen und kopieren/ })).toHaveAttribute('type', 'button')
    rerender(<TeilenDialog ziel={{ id: 'm2', titel: 'T', linkMoeglich: false }} schliessen={() => undefined} gespeichert={() => undefined} />)
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Öffentlicher Link' })).not.toBeInTheDocument())
  })

  it('meldet den neuen Link-Stand der Liste, ohne das Regal zu speichern', async () => {
    api.erzeugeLink.mockResolvedValue({ link: STAND })
    const linkGeaendert = vi.fn()
    const gespeichert = vi.fn()
    render(<TeilenDialog ziel={{ id: 'm1', titel: 'T', linkMoeglich: true }} schliessen={() => undefined} gespeichert={gespeichert} linkGeaendert={linkGeaendert} />)
    fireEvent.click(await screen.findByRole('button', { name: /Link erzeugen und kopieren/ }))
    await waitFor(() => expect(linkGeaendert).toHaveBeenCalledWith('m1', STAND))
    expect(gespeichert).not.toHaveBeenCalled()
  })
})

describe('Meine Materialien (PROJ-67)', () => {
  const zeile = (extra: Partial<MaterialZeile> = {}): MaterialZeile => ({
    id: 'm1', art: 'material', werkzeug: 'skript', titel: 'Haftung', skriptName: 'h.pdf', format: 'seite', schritt: 5,
    hatDatei: true, hatVorschau: true, hatAntwort: true, skriptEntfernt: false,
    erstelltAm: new Date().toISOString(), aktualisiertAm: new Date().toISOString(), laeuftAbAm: null, ...extra,
  })
  const liste = (eintraege: MaterialZeile[]): MaterialListe => ({
    eintraege, gesamt: eintraege.length, hatMehr: false, speicher: { genutztBytes: 1, grenzeBytes: 2 * 1024 ** 3 },
  })
  const menue = (titel: string) => fireEvent.keyDown(screen.getAllByRole('button', { name: `Weitere Aktionen für ${titel}` })[0], { key: 'Enter' })

  it('kennzeichnet öffentliche Materialien mit „Öffentlich“', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ oeffentlich: { aufrufe: 3 } }), zeile({ id: 'm2', titel: 'Privat' })]))
    render(<MeineMaterialien />)
    expect((await screen.findAllByText('Öffentlich')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Öffentlich')).toHaveLength(2) // Tabelle und Karte derselben Zeile, nicht die zweite
  })

  it('bietet den Link im Menü nur bei Interaktiver Seite an', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile(), zeile({ id: 'm2', titel: 'Quiz', format: 'h5p' })]))
    render(<MeineMaterialien />)
    await screen.findAllByText('Haftung')
    menue('Haftung')
    expect(await screen.findByRole('menuitem', { name: /Link für alle erzeugen/ })).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
  })

  it('bietet den Link im Menü bei H5P nicht an', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ titel: 'Quiz', format: 'h5p' })]))
    render(<MeineMaterialien />)
    await screen.findAllByText('Quiz')
    menue('Quiz')
    await screen.findByRole('menuitem', { name: /Teilen/ })
    expect(screen.queryByRole('menuitem', { name: /Link für alle|Öffentlicher Link/ })).not.toBeInTheDocument()
  })

  it('filtert mit „Nur öffentliche“ über die Schnittstelle', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ oeffentlich: { aufrufe: 0 } })]))
    render(<MeineMaterialien />)
    await screen.findAllByText('Haftung')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nur öffentliche' }))
    await waitFor(() => expect(api.ladeMaterialien).toHaveBeenLastCalledWith({ suche: '', werkzeug: '', seite: 1, nurOeffentlich: true }))
  })

  it('warnt beim Löschen eines öffentlichen Materials vor dem Abschalten des Links', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ oeffentlich: { aufrufe: 1 } })]))
    render(<MeineMaterialien />)
    await screen.findAllByText('Haftung')
    menue('Haftung')
    fireEvent.click(await screen.findByRole('menuitem', { name: /Löschen/ }))
    expect(await screen.findByText(/Der öffentliche Link wird dabei ebenfalls abgeschaltet/)).toBeInTheDocument()
  })
})

describe('Link-Übersicht für den Super-Admin (PROJ-67)', () => {
  const liste = (n: number): LinkAdminListe => ({
    eintraege: Array.from({ length: n }, (_, i) => ({
      id: `l${i}`, titel: `Material ${i}`, werkzeug: 'skript', besitzerName: 'Frau Muster',
      erzeugtAm: new Date().toISOString(), aufrufe: 7, letzterAufruf: null,
    })),
    gesamt: n, hatMehr: false,
  })

  it('zeigt Titel, Besitzer und Aufrufe, nie den Code', async () => {
    api.ladeLinkUebersicht.mockResolvedValue(liste(1))
    const { container } = render(<LinkUebersicht />)
    expect(await screen.findByText('Material 0')).toBeInTheDocument()
    expect(screen.getByText('Frau Muster')).toBeInTheDocument()
    expect(screen.getByText(/7 Aufrufe/)).toBeInTheDocument()
    expect(container.innerHTML).not.toMatch(/[0-9a-f]{48}/)
  })

  it('zeigt einen ruhigen Leerzustand', async () => {
    api.ladeLinkUebersicht.mockResolvedValue(liste(0))
    render(<LinkUebersicht />)
    expect(await screen.findByText('Keine öffentlichen Links.')).toBeInTheDocument()
  })

  it('schaltet nach Bestätigung ab und lädt die Liste neu', async () => {
    api.ladeLinkUebersicht.mockResolvedValueOnce(liste(1)).mockResolvedValueOnce(liste(0))
    api.schalteLinkAdminAb.mockResolvedValue({ ok: true })
    render(<LinkUebersicht />)
    fireEvent.click(await screen.findByRole('button', { name: /Link abschalten: Material 0/ }))
    expect(api.schalteLinkAdminAb).not.toHaveBeenCalled()
    const knoepfe = await screen.findAllByRole('button', { name: 'Link abschalten' })
    fireEvent.click(knoepfe[knoepfe.length - 1])
    await waitFor(() => expect(api.schalteLinkAdminAb).toHaveBeenCalledWith('l0'))
    expect(await screen.findByText('Keine öffentlichen Links.')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Link abgeschaltet')
  })

  it('zeigt bei einem Ladefehler einen Satz und „Erneut versuchen“', async () => {
    api.ladeLinkUebersicht.mockRejectedValue(new WerkzeugFehler('Die Übersicht konnte gerade nicht geladen werden.', 500))
    render(<LinkUebersicht />)
    expect(await screen.findByText('Die Übersicht konnte gerade nicht geladen werden.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument()
  })
})
