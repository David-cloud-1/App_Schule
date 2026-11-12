import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MaterialListe, MaterialZeile } from '@/lib/werkzeugkiste-materialien'
import type { AblaufErgebnis } from '@/lib/werkzeugkiste'

const api = vi.hoisted(() => ({
  ladeMaterialien: vi.fn(),
  kopiereAlsSeite: vi.fn(),
  ladeLink: vi.fn(),
}))
vi.mock('@/lib/werkzeugkiste-api', async (original) => ({
  ...(await original<typeof import('@/lib/werkzeugkiste-api')>()),
  ...api,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { MeineMaterialien } from '@/components/werkzeugkiste/meine-materialien'
import { SchrittFertig } from '@/components/werkzeugkiste/schritt-fertig'
import { SchrittAntwort } from '@/components/werkzeugkiste/schritt-antwort'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

function zeile(extra: Partial<MaterialZeile> = {}): MaterialZeile {
  return {
    id: 'm1',
    art: 'material',
    werkzeug: 'skript',
    titel: 'Haftung im Frachtrecht',
    skriptName: 'Heft.pdf',
    format: 'seite',
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
const liste = (eintraege: MaterialZeile[]): MaterialListe => ({
  eintraege,
  gesamt: eintraege.length,
  hatMehr: false,
  speicher: { genutztBytes: 0, grenzeBytes: 2 * 1024 ** 3 },
})

beforeEach(() => {
  vi.clearAllMocks()
  api.ladeLink.mockResolvedValue({ link: null })
})

describe('Meine Materialien', () => {
  it('Interaktive Seite: Symbol führt in den Baukasten, offene Änderungen sind markiert', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ baukasten: 'bearbeiten', entwurfOffen: true })]))
    render(<MeineMaterialien />)
    const links = await screen.findAllByRole('link', { name: 'Im Baukasten bearbeiten: Haftung im Frachtrecht' })
    expect(links[0]).toHaveAttribute('href', '/admin/werkzeugkiste/bearbeiten/m1')
    expect(screen.getAllByText('Nicht veröffentlicht')[0]).toHaveAttribute('title', 'Es gibt unveröffentlichte Änderungen im Baukasten')
  })

  it('H5P: fragt nach einer Kopie als Seite und öffnet sie dann im Editor', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ format: 'h5p', baukasten: 'als-seite' })]))
    api.kopiereAlsSeite.mockResolvedValue({ id: 'neu1' })
    const ort = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...ort, href: '' } })
    render(<MeineMaterialien />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Im Baukasten bearbeiten: Haftung im Frachtrecht' }))[0])
    expect(await screen.findByText(/Dein H5P-Material bleibt unverändert/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Kopie anlegen' }))
    await waitFor(() => expect(window.location.href).toBe('/admin/werkzeugkiste/bearbeiten/neu1'))
    expect(api.kopiereAlsSeite).toHaveBeenCalledWith('m1')
    Object.defineProperty(window, 'location', { configurable: true, value: ort })
  })

  it('zeigt Fehler beim Kopieren im Dialog', async () => {
    api.ladeMaterialien.mockResolvedValue(liste([zeile({ format: 'h5p', baukasten: 'als-seite' })]))
    const { WerkzeugFehler } = await import('@/lib/werkzeugkiste-api')
    api.kopiereAlsSeite.mockRejectedValue(new WerkzeugFehler('Dein Speicher ist voll.', 409))
    render(<MeineMaterialien />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Im Baukasten bearbeiten: Haftung im Frachtrecht' }))[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Kopie anlegen' }))
    expect(await screen.findByText(/Dein Speicher ist voll/)).toBeInTheDocument()
  })

  it('andere Werkzeuge und unfertige Abläufe bekommen kein Baukasten-Symbol', async () => {
    api.ladeMaterialien.mockResolvedValue(
      liste([zeile({ id: 'k', werkzeug: 'kahoot', titel: 'Kahoot', baukasten: null }), zeile({ id: 'e', art: 'entwurf', titel: 'Läuft' })]),
    )
    render(<MeineMaterialien />)
    await screen.findAllByText('Kahoot')
    expect(screen.queryByRole('link', { name: /Im Baukasten bearbeiten/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Im Baukasten bearbeiten/ })).not.toBeInTheDocument()
  })
})

describe('Schritt „Fertig“ und Schritt 4', () => {
  const ergebnis: AblaufErgebnis = { titel: 'Haftung', dateiname: 'Haftung.html', format: 'seite', kapitel: 1, aufgaben: 3 }

  it('Fertig: „Im Baukasten bearbeiten“ neben dem Herunterladen', async () => {
    render(<SchrittFertig ablaufId="m1" ergebnis={ergebnis} bearbeiten="/admin/werkzeugkiste/bearbeiten/m1" />)
    expect(await screen.findByRole('link', { name: /Im Baukasten bearbeiten/ })).toHaveAttribute('href', '/admin/werkzeugkiste/bearbeiten/m1')
  })

  it('Fertig ohne Baukasten (z. B. H5P): kein Knopf', () => {
    render(<SchrittFertig ablaufId="m1" ergebnis={{ ...ergebnis, format: 'h5p' }} />)
    expect(screen.queryByRole('link', { name: /Im Baukasten bearbeiten/ })).not.toBeInTheDocument()
  })

  it('Schritt 4: Hinweis auf den Entwurf im Editor', () => {
    render(
      <SchrittAntwort
        antwort="cover: {}"
        setAntwort={vi.fn()}
        pruefung={null}
        prueftGerade={false}
        pruefFehler={null}
        erneutPruefen={vi.fn()}
        entwurfImEditor="/admin/werkzeugkiste/bearbeiten/m1"
      />,
    )
    expect(screen.getByText('Zu diesem Material gibt es einen Entwurf im Editor.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Im Editor öffnen' })).toHaveAttribute('href', '/admin/werkzeugkiste/bearbeiten/m1')
  })
})
