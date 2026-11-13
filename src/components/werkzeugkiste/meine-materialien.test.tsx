import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { MaterialListe, MaterialZeile } from '@/lib/werkzeugkiste-materialien'

const api = vi.hoisted(() => ({
  ladeMaterialien: vi.fn(),
  loescheAblauf: vi.fn(),
  benenneMaterialUm: vi.fn(),
  kopiereFuerAnderesWerkzeug: vi.fn(),
  ladeDatei: vi.fn(),
  ladeFreigabe: vi.fn(),
  ladeFreigabeOptionen: vi.fn(),
  speichereFreigabe: vi.fn(),
  sucheLehrkraefte: vi.fn(),
}))

vi.mock('@/lib/werkzeugkiste-api', async (original) => ({
  ...(await original<typeof import('@/lib/werkzeugkiste-api')>()),
  ...api,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { toast } from 'sonner'

import { MeineMaterialien } from './meine-materialien'

// Radix (Teilen-Dialog) misst Größen per ResizeObserver, den jsdom nicht kennt
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

const GB = 1024 * 1024 * 1024
const morgen = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

function zeile(extra: Partial<MaterialZeile> = {}): MaterialZeile {
  return {
    id: 'm1',
    art: 'material',
    werkzeug: 'skript',
    titel: 'Haftung im Frachtrecht',
    skriptName: 'Heft 2 Haftung.pdf',
    format: 'h5p',
    schritt: 5,
    hatDatei: true,
    hatVorschau: true,
    hatAntwort: true,
    skriptEntfernt: false,
    erstelltAm: new Date().toISOString(),
    aktualisiertAm: new Date().toISOString(),
    laeuftAbAm: null,
    ...extra,
  }
}

function liste(eintraege: MaterialZeile[], extra: Partial<MaterialListe> = {}): MaterialListe {
  return { eintraege, gesamt: eintraege.length, hatMehr: false, speicher: { genutztBytes: 100 * 1024 * 1024, grenzeBytes: 2 * GB }, ...extra }
}

/** Menü einer Zeile öffnen (Radix öffnet es per Tastatur zuverlässig auch in jsdom) */
function oeffneMenue(titel: string) {
  const knopf = screen.getAllByRole('button', { name: `Weitere Aktionen für ${titel}` })[0]
  fireEvent.keyDown(knopf, { key: 'Enter' })
}

beforeEach(() => {
  api.ladeMaterialien.mockReset()
  api.loescheAblauf.mockReset()
  api.benenneMaterialUm.mockReset()
  api.kopiereFuerAnderesWerkzeug.mockReset()
  api.ladeDatei.mockReset()
  api.ladeFreigabe.mockReset().mockResolvedValue({ freigabe: null })
  api.ladeFreigabeOptionen.mockReset().mockResolvedValue({ bereiche: [{ id: 'd1', name: 'Spedition' }], faecher: [] })
  api.speichereFreigabe.mockReset().mockResolvedValue(undefined)
  api.sucheLehrkraefte.mockReset().mockResolvedValue([])
})
afterEach(() => vi.clearAllMocks())

describe('Meine Materialien (PROJ-52)', () => {
  it('zeigt den Leerzustand mit der Hauptaktion und meldet ihn der Seite', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([]))
    const onLeer = vi.fn()
    render(<MeineMaterialien onLeer={onLeer} />)
    expect(await screen.findByText('Noch kein Material erstellt.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Skript hochladen/ })).toHaveAttribute('href', '/admin/werkzeugkiste/neu')
    await waitFor(() => expect(onLeer).toHaveBeenLastCalledWith(true))
  })

  it('zeigt Entwürfe mit Stand und Löschwarnung, Materialien mit Format und Download', async () => {
    api.ladeMaterialien.mockResolvedValue(
      liste([
        zeile({ id: 'e1', art: 'entwurf', titel: 'Außenhandel.docx', schritt: 3, format: null, hatDatei: false, laeuftAbAm: morgen() }),
        zeile({ id: 'm1' }),
      ]),
    )
    const onLeer = vi.fn()
    render(<MeineMaterialien onLeer={onLeer} />)
    await screen.findAllByText('Haftung im Frachtrecht')

    // Desktop-Tabelle und Handy-Karten stehen beide im Dokument (CSS blendet eine aus)
    expect(screen.getAllByText('Entwurf').length).toBeGreaterThan(0)
    expect(screen.getAllByText('bei Schritt 3 · Prompt').length).toBeGreaterThan(0)
    expect(screen.getAllByText('wird morgen gelöscht').length).toBeGreaterThan(0)
    expect(screen.getAllByText('H5P für Moodle · aus Heft 2 Haftung.pdf').length).toBeGreaterThan(0)

    const fortsetzen = screen.getAllByRole('link', { name: /Fortsetzen/ })[0]
    expect(fortsetzen).toHaveAttribute('href', '/admin/werkzeugkiste/ablauf/e1?schritt=3')
    const download = screen.getAllByRole('link', { name: /Herunterladen/ })[0]
    expect(download).toHaveAttribute('href', '/api/admin/werkzeugkiste/ablaeufe/m1/download')
    expect(onLeer).toHaveBeenLastCalledWith(false)
  })

  it('meldet eine fehlende Datei beim Herunterladen ruhig als Hinweis (BUG-1)', async () => {
    const { WerkzeugFehler } = await import('@/lib/werkzeugkiste-api')
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ id: 'm1' })]))
    api.ladeDatei.mockRejectedValue(new WerkzeugFehler('Die Datei ist nicht mehr vorhanden. Über „Überarbeiten“ neu erstellen.', 404))
    render(<MeineMaterialien />)
    await screen.findAllByText('Haftung im Frachtrecht')
    fireEvent.click(screen.getAllByRole('link', { name: /Herunterladen/ })[0])
    expect(api.ladeDatei).toHaveBeenCalledWith('m1')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Die Datei ist nicht mehr vorhanden. Über „Überarbeiten“ neu erstellen.'))
  })

  it('führt bei Materialien ohne Datei (reine Texte) zur Ansicht statt zum Download', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ id: 'l1', titel: 'LearningApps', hatDatei: false, hatVorschau: false })]))
    render(<MeineMaterialien />)
    await screen.findAllByText('LearningApps')
    expect(screen.queryByRole('link', { name: /Herunterladen/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Öffnen/ })[0]).toHaveAttribute('href', '/admin/werkzeugkiste/ablauf/l1?schritt=5')
  })

  it('weist ab 90 % Speicher darauf hin', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile()], { speicher: { genutztBytes: 1.9 * GB, grenzeBytes: 2 * GB } }))
    render(<MeineMaterialien />)
    expect(await screen.findByText(/Dein Speicher ist zu 95 % voll/)).toBeInTheDocument()
  })

  it('zeigt bei einer leeren Suche „Nichts gefunden“ und setzt sie zurück', async () => {
    api.ladeMaterialien.mockImplementation(async ({ suche }: { suche: string }) => (suche ? liste([]) : liste([zeile()])))
    const onLeer = vi.fn()
    render(<MeineMaterialien onLeer={onLeer} />)
    await screen.findAllByText('Haftung im Frachtrecht')

    fireEvent.change(screen.getByRole('searchbox', { name: 'Materialien durchsuchen' }), { target: { value: 'zzz' } })
    expect(await screen.findByText('Nichts gefunden')).toBeInTheDocument()
    expect(api.ladeMaterialien).toHaveBeenLastCalledWith({ suche: 'zzz', werkzeug: '', seite: 1, nurOeffentlich: false })
    // Bei einer Suche ist die Ablage nicht „leer“: Die Hauptaktion bleibt im Seitenkopf
    expect(onLeer).not.toHaveBeenLastCalledWith(true)

    fireEvent.click(screen.getByRole('button', { name: 'Suche zurücksetzen' }))
    expect((await screen.findAllByText('Haftung im Frachtrecht')).length).toBeGreaterThan(0)
  })

  it('lädt mit „Mehr laden“ die nächste Seite nach', async () => {
    api.ladeMaterialien
      .mockResolvedValueOnce(liste([zeile({ id: 'a', titel: 'Erstes' })], { gesamt: 2, hatMehr: true }))
      .mockResolvedValueOnce(liste([zeile({ id: 'b', titel: 'Zweites' })], { gesamt: 2, hatMehr: false }))
    render(<MeineMaterialien />)
    await screen.findAllByText('Erstes')
    fireEvent.click(screen.getByRole('button', { name: 'Mehr laden' }))
    await screen.findAllByText('Zweites')
    expect(api.ladeMaterialien).toHaveBeenLastCalledWith({ suche: '', werkzeug: '', seite: 2, nurOeffentlich: false })
    expect(screen.getAllByText('Erstes').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Mehr laden' })).not.toBeInTheDocument()
  })

  it('zeigt einen verständlichen Fehler mit „Erneut versuchen“', async () => {
    const { WerkzeugFehler } = await import('@/lib/werkzeugkiste-api')
    api.ladeMaterialien.mockRejectedValueOnce(new WerkzeugFehler('Keine Verbindung.', 0)).mockResolvedValueOnce(liste([zeile()]))
    render(<MeineMaterialien />)
    expect(await screen.findByText('Keine Verbindung.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect((await screen.findAllByText('Haftung im Frachtrecht')).length).toBeGreaterThan(0)
  })

  it('löscht erst nach der Rückfrage und nimmt die Zeile dann aus der Liste', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile(), zeile({ id: 'm2', titel: 'Zweites Material' })]))
    api.loescheAblauf.mockResolvedValue({ ok: true })
    render(<MeineMaterialien />)
    await screen.findAllByText('Haftung im Frachtrecht')

    oeffneMenue('Haftung im Frachtrecht')
    fireEvent.click(await screen.findByRole('menuitem', { name: /Löschen/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Material endgültig löschen?')).toBeInTheDocument()
    expect(api.loescheAblauf).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(api.loescheAblauf).toHaveBeenCalledWith('m1'))
    await waitFor(() => expect(screen.queryByText('Haftung im Frachtrecht')).not.toBeInTheDocument())
    expect(screen.getAllByText('Zweites Material').length).toBeGreaterThan(0)
  })

  it('graut Überarbeiten und anderes Werkzeug aus, wenn das Skript entfernt wurde', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ skriptEntfernt: true })]))
    render(<MeineMaterialien />)
    await screen.findAllByText('Haftung im Frachtrecht')
    expect(screen.getAllByText('Skript entfernt').length).toBeGreaterThan(0)

    oeffneMenue('Haftung im Frachtrecht')
    const ueberarbeiten = await screen.findByRole('menuitem', { name: /Überarbeiten/ })
    expect(ueberarbeiten).toHaveAttribute('aria-disabled', 'true')
    expect(ueberarbeiten).toHaveTextContent('Skript wurde nach 12 Monaten entfernt')
    expect(screen.getByRole('menuitem', { name: /anderes Werkzeug/ })).toHaveAttribute('aria-disabled', 'true')
    // Herunterladen, Umbenennen, KI-Antwort und Löschen bleiben möglich
    expect(screen.getByRole('menuitem', { name: /Umbenennen/ })).not.toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: /KI-Antwort herunterladen/ })).toBeInTheDocument()
  })

  it('benennt um und zeigt den neuen Titel', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile()]))
    api.benenneMaterialUm.mockResolvedValue({})
    render(<MeineMaterialien />)
    await screen.findAllByText('Haftung im Frachtrecht')

    oeffneMenue('Haftung im Frachtrecht')
    fireEvent.click(await screen.findByRole('menuitem', { name: /Umbenennen/ }))
    const feld = await screen.findByLabelText('Titel')
    expect(feld).toHaveValue('Haftung im Frachtrecht')
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled()

    fireEvent.change(feld, { target: { value: '  Haftung (neu)  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(api.benenneMaterialUm).toHaveBeenCalledWith('m1', 'Haftung (neu)'))
    expect((await screen.findAllByText('Haftung (neu)')).length).toBeGreaterThan(0)
  })

  describe('Regal (PROJ-53)', () => {
    it('zeigt in der Spalte „Regal“, wer das Material sieht, und „privat“ ohne Freigabe', async () => {
      api.ladeMaterialien.mockResolvedValue(
        liste([
          zeile({ id: 'm1', titel: 'Privat' }),
          zeile({ id: 'm2', titel: 'Fachbereich', regal: { stufe: 'fachbereich', personen: 0, bereiche: 1, entnommen: false } }),
          zeile({ id: 'm3', titel: 'Alle', regal: { stufe: 'alle', personen: 0, bereiche: 0, entnommen: false } }),
          zeile({ id: 'm4', titel: 'Personen', regal: { stufe: 'ausgewaehlte', personen: 3, bereiche: 0, entnommen: false } }),
          zeile({ id: 'm5', titel: 'Entnommen', regal: { stufe: 'alle', personen: 0, bereiche: 0, entnommen: true } }),
        ]),
      )
      render(<MeineMaterialien />)
      await screen.findAllByText('Privat')
      for (const text of ['privat', 'Fachbereich', 'alle', '3 Personen', 'vom Admin aus dem Regal genommen']) {
        expect(screen.getAllByText(text).length).toBeGreaterThan(0)
      }
    })

    it('zeigt für Entwürfe keine Regal-Angabe und kein „Teilen …“', async () => {
      api.ladeMaterialien.mockResolvedValue(liste([zeile({ id: 'e1', art: 'entwurf', titel: 'Entwurf.docx', schritt: 2, format: null, hatDatei: false })]))
      render(<MeineMaterialien />)
      await screen.findAllByText('Entwurf.docx')
      expect(screen.queryByText('privat')).not.toBeInTheDocument()
      oeffneMenue('Entwurf.docx')
      await screen.findByRole('menuitem', { name: /Löschen/ })
      expect(screen.queryByRole('menuitem', { name: /Teilen/ })).not.toBeInTheDocument()
    })

    it('öffnet „Teilen …“ aus dem Menü und zeigt danach die neue Stufe in der Zeile', async () => {
      api.ladeMaterialien.mockResolvedValue(liste([zeile()]))
      render(<MeineMaterialien />)
      await screen.findAllByText('Haftung im Frachtrecht')

      oeffneMenue('Haftung im Frachtrecht')
      fireEvent.click(await screen.findByRole('menuitem', { name: /Teilen/ }))
      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Material teilen')).toBeInTheDocument()
      expect(await within(dialog).findByText('Nur du siehst dieses Material.')).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('radio', { name: /^Alle Lehrkräfte/ }))
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      await waitFor(() => expect(api.speichereFreigabe).toHaveBeenCalledWith('m1', expect.objectContaining({ stufe: 'alle' })))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.getAllByText('alle').length).toBeGreaterThan(0)
      expect(screen.queryByText('privat')).not.toBeInTheDocument()
    })

    it('warnt im Löschen-Fenster, dass das Material auch aus dem Regal verschwindet', async () => {
      api.ladeMaterialien.mockResolvedValue(
        liste([
          zeile({ id: 'm1', regal: { stufe: 'alle', personen: 0, bereiche: 0, entnommen: false } }),
          zeile({ id: 'm2', titel: 'Zweites Material' }),
        ]),
      )
      render(<MeineMaterialien />)
      await screen.findAllByText('Haftung im Frachtrecht')

      oeffneMenue('Haftung im Frachtrecht')
      fireEvent.click(await screen.findByRole('menuitem', { name: /Löschen/ }))
      expect(await screen.findByText(/verschwindet auch aus dem Regal/)).toBeInTheDocument()
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Abbrechen' }))

      oeffneMenue('Zweites Material')
      fireEvent.click(await screen.findByRole('menuitem', { name: /Löschen/ }))
      await screen.findByRole('alertdialog')
      expect(screen.queryByText(/verschwindet auch aus dem Regal/)).not.toBeInTheDocument()
    })
  })

  describe('Kopie aus dem Regal (PROJ-53, Paket 2)', () => {
    it('nennt die Urheberin oder den Urheber, nicht „Skript entfernt“, und erlaubt Überarbeiten', async () => {
      api.ladeMaterialien.mockResolvedValue(
        liste([zeile({ titel: 'Haftung (Kopie)', skriptName: null, skriptEntfernt: true, ausRegal: 'Frau Meier' })]),
      )
      render(<MeineMaterialien />)
      await screen.findAllByText('Haftung (Kopie)')
      expect(screen.getAllByText('H5P für Moodle · aus dem Regal von Frau Meier').length).toBeGreaterThan(0)
      expect(screen.queryByText('Skript entfernt')).not.toBeInTheDocument()

      oeffneMenue('Haftung (Kopie)')
      const ueberarbeiten = await screen.findByRole('menuitem', { name: /Überarbeiten/ })
      expect(ueberarbeiten).not.toHaveAttribute('aria-disabled', 'true')
      const anderes = screen.getByRole('menuitem', { name: /anderes Werkzeug/ })
      expect(anderes).toHaveAttribute('aria-disabled', 'true')
      expect(anderes).toHaveTextContent('Stammt aus dem Regal, es gibt kein Skript dazu')
      // Teilen, Umbenennen, Löschen bleiben möglich
      expect(screen.getByRole('menuitem', { name: /Teilen/ })).not.toHaveAttribute('aria-disabled', 'true')
    })
  })
})

describe('Eigene Seite (PROJ-94)', () => {
  it('nie veröffentlicht: „Bearbeiten“ statt „Öffnen“, Teilen und Link erst nach dem Veröffentlichen', async () => {
    api.ladeMaterialien.mockResolvedValue(
      liste([
        zeile({
          id: 'e1',
          werkzeug: 'eigen',
          titel: 'Meine Seite',
          skriptName: null,
          format: 'seite',
          hatDatei: false,
          hatVorschau: false,
          hatAntwort: false,
          nochNichtVeroeffentlicht: true,
          entwurfOffen: true,
          baukasten: 'bearbeiten',
        }),
      ]),
    )
    render(<MeineMaterialien />)
    const bearbeiten = await screen.findAllByRole('link', { name: /Bearbeiten/ })
    expect(bearbeiten[0]).toHaveAttribute('href', expect.stringContaining('e1'))
    expect(screen.queryByRole('link', { name: /Öffnen/ })).toBeNull()
  })
})
