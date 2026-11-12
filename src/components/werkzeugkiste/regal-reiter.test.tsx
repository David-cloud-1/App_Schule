import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { RegalKarte, RegalListe } from '@/lib/werkzeugkiste-regal'

const api = vi.hoisted(() => ({
  ladeRegal: vi.fn(),
  ladeRegalDatei: vi.fn(),
  passeAn: vi.fn(),
  ladeModeration: vi.fn(),
  entnimmAusRegal: vi.fn(),
  lasseWiederZu: vi.fn(),
}))

vi.mock('@/lib/werkzeugkiste-api', async (original) => ({
  ...(await original<typeof import('@/lib/werkzeugkiste-api')>()),
  ...api,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { toast } from 'sonner'
import { WerkzeugFehler } from '@/lib/werkzeugkiste-api'

import { RegalReiter } from './regal-reiter'

// Radix (Auswahlliste) misst Größen per ResizeObserver, den jsdom nicht kennt
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

function karte(extra: Partial<RegalKarte> = {}): RegalKarte {
  return {
    id: 'f1',
    titel: 'Haftung im Frachtrecht',
    werkzeug: 'skript',
    format: 'h5p',
    fachId: null,
    fachName: null,
    notiz: null,
    besitzerName: 'Frau Meier',
    vonMir: false,
    mitMirGeteilt: false,
    hatDatei: true,
    anpassbar: false,
    geladen: 3,
    geteiltAm: new Date().toISOString(),
    ...extra,
  }
}

function liste(eintraege: RegalKarte[], extra: Partial<RegalListe> = {}): RegalListe {
  return { eintraege, gesamt: eintraege.length, hatMehr: false, filter: { faecher: [], werkzeuge: [] }, ...extra }
}

beforeEach(() => {
  api.ladeRegal.mockReset()
  api.ladeRegalDatei.mockReset().mockResolvedValue(undefined)
  api.passeAn.mockReset()
  api.ladeModeration.mockReset()
  api.entnimmAusRegal.mockReset().mockResolvedValue({ ok: true })
  api.lasseWiederZu.mockReset().mockResolvedValue({ ok: true })
})
afterEach(() => vi.clearAllMocks())

describe('Regal des Kollegiums (PROJ-53)', () => {
  it('zeigt den Leerzustand mit Link zu „Meine Materialien“', async () => {
    api.ladeRegal.mockResolvedValue(liste([]))
    render(<RegalReiter />)
    expect(await screen.findByText('Noch nichts geteilt.')).toBeInTheDocument()
    expect(screen.getByText('Teile dein erstes Material aus Meine Materialien.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zu Meine Materialien' })).toHaveAttribute('href', '?tab=materialien')
  })

  it('zeigt auf jeder Karte Werkzeug · Format, Titel, Notiz, Absender und Zähler', async () => {
    api.ladeRegal.mockResolvedValue(
      liste([karte({ notiz: 'Für die 11. Klasse, ca. 2 Doppelstunden', fachName: 'Recht', geladen: 12 })]),
    )
    render(<RegalReiter />)
    expect(await screen.findByText('Haftung im Frachtrecht')).toBeInTheDocument()
    expect(screen.getByText(/H5P für Moodle/)).toBeInTheDocument()
    expect(screen.getByText('Recht')).toBeInTheDocument()
    expect(screen.getByText('Für die 11. Klasse, ca. 2 Doppelstunden')).toBeInTheDocument()
    expect(screen.getByText(/von Frau Meier/)).toBeInTheDocument()
    expect(screen.getByText(/12× geladen/)).toBeInTheDocument()
  })

  it('kennzeichnet eigene Karten mit „von dir“ und persönlich geteilte mit „mit dir geteilt“', async () => {
    api.ladeRegal.mockResolvedValue(
      liste([karte({ id: 'a', vonMir: true, titel: 'Meins' }), karte({ id: 'b', mitMirGeteilt: true, titel: 'Für mich' })]),
    )
    render(<RegalReiter />)
    await screen.findByText('Meins')
    expect(screen.getByText(/von dir/)).toBeInTheDocument()
    expect(screen.getByText('mit dir geteilt')).toBeInTheDocument()
    expect(screen.queryByText(/von Frau Meier/)).toBeInTheDocument()
  })

  it('lädt die Datei herunter und meldet Fehler ruhig', async () => {
    api.ladeRegal.mockResolvedValue(liste([karte()]))
    render(<RegalReiter />)
    const knopf = await screen.findByRole('button', { name: /Herunterladen/ })
    fireEvent.click(knopf)
    await waitFor(() => expect(api.ladeRegalDatei).toHaveBeenCalledWith('f1'))

    api.ladeRegalDatei.mockRejectedValueOnce(new WerkzeugFehler('Die Datei ist nicht mehr vorhanden.', 404))
    fireEvent.click(knopf)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Die Datei ist nicht mehr vorhanden.'))
  })

  it('bietet bei reinen Texten keinen Download an', async () => {
    api.ladeRegal.mockResolvedValue(liste([karte({ hatDatei: false })]))
    render(<RegalReiter />)
    await screen.findByText('Haftung im Frachtrecht')
    expect(screen.queryByRole('button', { name: /Herunterladen/ })).not.toBeInTheDocument()
    expect(screen.getByText(/besteht nur aus Texten/)).toBeInTheDocument()
  })

  it('zeigt Filter-Chips nur für Werte, die im Regal vorkommen, und filtert beim Klick', async () => {
    api.ladeRegal.mockResolvedValue(
      liste([karte()], { filter: { faecher: [{ id: 'fa1', name: 'Recht' }], werkzeuge: ['skript'] } }),
    )
    render(<RegalReiter />)
    const fachGruppe = await screen.findByRole('group', { name: 'Nach Fach filtern' })
    expect(within(fachGruppe).getByRole('button', { name: 'Alle' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: 'Nach Werkzeug filtern' })).toBeInTheDocument()

    fireEvent.click(within(fachGruppe).getByRole('button', { name: 'Recht' }))
    await waitFor(() => expect(api.ladeRegal).toHaveBeenLastCalledWith(expect.objectContaining({ fach: 'fa1', seite: 1 })))
    expect(within(fachGruppe).getByRole('button', { name: 'Recht' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('blendet Filterreihen ohne Werte aus', async () => {
    api.ladeRegal.mockResolvedValue(liste([karte()]))
    render(<RegalReiter />)
    await screen.findByText('Haftung im Frachtrecht')
    expect(screen.queryByRole('group', { name: 'Nach Fach filtern' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Nach Werkzeug filtern' })).not.toBeInTheDocument()
  })

  it('sucht nach kurzer Pause und zeigt „Nichts gefunden“ mit Zurücksetzen', async () => {
    api.ladeRegal.mockResolvedValueOnce(liste([karte()]))
    render(<RegalReiter />)
    await screen.findByText('Haftung im Frachtrecht')

    api.ladeRegal.mockResolvedValue(liste([]))
    fireEvent.change(screen.getByLabelText('Das Regal durchsuchen'), { target: { value: 'Zoll' } })
    expect(await screen.findByText('Nichts gefunden')).toBeInTheDocument()
    expect(api.ladeRegal).toHaveBeenLastCalledWith(expect.objectContaining({ suche: 'Zoll' }))

    api.ladeRegal.mockResolvedValue(liste([karte()]))
    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    expect(await screen.findByText('Haftung im Frachtrecht')).toBeInTheDocument()
    expect(screen.getByLabelText('Das Regal durchsuchen')).toHaveValue('')
  })

  it('lädt ab 30 Einträgen mit „Mehr laden“ die nächste Seite nach', async () => {
    api.ladeRegal.mockResolvedValueOnce(liste([karte({ id: 'a', titel: 'Erste' })], { gesamt: 31, hatMehr: true }))
    render(<RegalReiter />)
    await screen.findByText('Erste')

    api.ladeRegal.mockResolvedValueOnce(liste([karte({ id: 'b', titel: 'Zweite' })], { gesamt: 31, hatMehr: false }))
    fireEvent.click(screen.getByRole('button', { name: 'Mehr laden' }))
    expect(await screen.findByText('Zweite')).toBeInTheDocument()
    expect(screen.getByText('Erste')).toBeInTheDocument()
    expect(api.ladeRegal).toHaveBeenLastCalledWith(expect.objectContaining({ seite: 2 }))
    expect(screen.queryByRole('button', { name: 'Mehr laden' })).not.toBeInTheDocument()
  })

  it('zeigt einen Ladefehler ruhig mit „Erneut versuchen“', async () => {
    api.ladeRegal.mockRejectedValueOnce(new WerkzeugFehler('Das Regal konnte gerade nicht geladen werden.', 500))
    render(<RegalReiter />)
    expect(await screen.findByText('Das Regal konnte gerade nicht geladen werden.')).toBeInTheDocument()

    api.ladeRegal.mockResolvedValue(liste([karte()]))
    fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/ }))
    expect(await screen.findByText('Haftung im Frachtrecht')).toBeInTheDocument()
  })

  it('sortiert auf Wunsch nach der Zahl der Downloads', async () => {
    api.ladeRegal.mockResolvedValue(liste([karte()]))
    render(<RegalReiter />)
    await screen.findByText('Haftung im Frachtrecht')
    expect(api.ladeRegal).toHaveBeenLastCalledWith(expect.objectContaining({ sortierung: 'neueste' }))
  })
})

describe('Regal – Anpassen (PROJ-53, Paket 2)', () => {
  const orig = window.location
  beforeEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: { ...orig, href: 'http://localhost/' } })
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: orig })
  })

  it('zeigt „Anpassen“ nur bei anpassbaren Karten anderer Lehrkräfte', async () => {
    api.ladeRegal.mockResolvedValue(
      liste([
        karte({ id: 'a', titel: 'Anpassbar', anpassbar: true }),
        karte({ id: 'b', titel: 'Ohne Auszug', anpassbar: false }),
        karte({ id: 'c', titel: 'Eigenes', anpassbar: true, vonMir: true }),
      ]),
    )
    render(<RegalReiter />)
    await screen.findByText('Anpassbar')
    expect(screen.getAllByRole('button', { name: /^Anpassen/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /^Anpassen.*Anpassbar/ })).toBeInTheDocument()
  })

  it('legt eine Kopie an und öffnet sie bei Schritt 4', async () => {
    api.ladeRegal.mockResolvedValue(liste([karte({ id: 'f1', anpassbar: true })]))
    api.passeAn.mockResolvedValue({ ablauf: { id: 'neu1' } })
    render(<RegalReiter />)
    fireEvent.click(await screen.findByRole('button', { name: /^Anpassen/ }))
    await waitFor(() => expect(api.passeAn).toHaveBeenCalledWith('f1'))
    await waitFor(() => expect(window.location.href).toBe('/admin/werkzeugkiste/ablauf/neu1?schritt=4'))
  })

  it('öffnet eine angepasste Interaktive Seite direkt im Baukasten (PROJ-89)', async () => {
    api.ladeRegal.mockResolvedValue(liste([karte({ id: 'f1', anpassbar: true })]))
    api.passeAn.mockResolvedValue({ ablauf: { id: 'neu1', werkzeug: 'skript', status: 'fertig', ergebnis: { format: 'seite' } } })
    render(<RegalReiter />)
    fireEvent.click(await screen.findByRole('button', { name: /^Anpassen/ }))
    await waitFor(() => expect(window.location.href).toBe('/admin/werkzeugkiste/bearbeiten/neu1'))
  })

  it('meldet Fehler ruhig und bleibt im Regal', async () => {
    api.ladeRegal.mockResolvedValue(liste([karte({ anpassbar: true })]))
    api.passeAn.mockRejectedValue(new WerkzeugFehler('Dein Speicher ist voll.', 409))
    render(<RegalReiter />)
    fireEvent.click(await screen.findByRole('button', { name: /^Anpassen/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Dein Speicher ist voll.'))
    expect(window.location.href).toBe('http://localhost/')
    expect(screen.getByRole('button', { name: /^Anpassen/ })).toBeEnabled()
  })
})

describe('Regal – Moderationsschalter (PROJ-53, Paket 2)', () => {
  it('zeigt Lehrkräften keinen Schalter', async () => {
    api.ladeRegal.mockResolvedValue(liste([karte()]))
    render(<RegalReiter />)
    await screen.findByText('Haftung im Frachtrecht')
    expect(screen.queryByRole('group', { name: 'Ansicht' })).not.toBeInTheDocument()
  })

  it('wechselt für den Super-Admin zwischen Regal und Moderation', async () => {
    api.ladeRegal.mockResolvedValue(liste([karte()], { moderation: true }))
    api.ladeModeration.mockResolvedValue({
      eintraege: [{ id: 'f1', titel: 'Geteiltes Material', werkzeug: 'skript', besitzerName: 'Frau Meier', stufe: 'alle', geladen: 2, geteiltAm: new Date().toISOString(), entnommenAm: null, entnommenGrund: null }],
      gesamt: 1,
      hatMehr: false,
    })
    render(<RegalReiter />)
    const gruppe = await screen.findByRole('group', { name: 'Ansicht' })
    expect(within(gruppe).getByRole('button', { name: 'Regal' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(gruppe).getByRole('button', { name: 'Moderation' }))
    expect(await screen.findByText('Geteiltes Material')).toBeInTheDocument()
    expect(screen.queryByLabelText('Das Regal durchsuchen')).not.toBeInTheDocument()

    fireEvent.click(within(screen.getByRole('group', { name: 'Ansicht' })).getByRole('button', { name: 'Regal' }))
    expect(await screen.findByLabelText('Das Regal durchsuchen')).toBeInTheDocument()
  })
})
