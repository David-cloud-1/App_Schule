import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/werkzeugkiste-api', () => ({
  ladeMaterialBilder: vi.fn(),
  ladeMaterialBild: vi.fn(),
  ladeBildHoch: vi.fn(),
}))
vi.mock('@/lib/werkzeugkiste-bild-bearbeiten', async (original) => {
  const echt = await original<typeof import('@/lib/werkzeugkiste-bild-bearbeiten')>()
  return {
    ...echt,
    // Leinwand gibt es in jsdom nicht: Arbeitskopie und Ergebnis werden nachgebildet
    arbeitskopie: vi.fn(async () => ({ width: 800, height: 400 }) as unknown as HTMLCanvasElement),
    alsBlob: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
    drehe: vi.fn((c: HTMLCanvasElement) => c),
    erzeugeErgebnis: vi.fn(async () => ({ blob: new Blob(['fertig'], { type: 'image/jpeg' }), typ: 'jpg', breite: 800, hoehe: 400 })),
  }
})

import * as api from '@/lib/werkzeugkiste-api'
import * as bearbeiten from '@/lib/werkzeugkiste-bild-bearbeiten'
import { MaterialBilderProvider } from './material-bilder'
import { BildAuswahl } from './bild-dialog'

const m = {
  liste: vi.mocked(api.ladeMaterialBilder),
  gross: vi.mocked(api.ladeMaterialBild),
  hoch: vi.mocked(api.ladeBildHoch),
  ergebnis: vi.mocked(bearbeiten.erzeugeErgebnis),
}
const SKRIPT = { pfad: 'images/seite3.png', vorschau: 'data:image/jpeg;base64,AA', breite: 6, hoehe: 3 }
const EIGEN = { pfad: 'images/eigen_abc123de.jpg', vorschau: 'data:image/jpeg;base64,BB', breite: 0, hoehe: 0 }

function zeige(props: Partial<React.ComponentProps<typeof BildAuswahl>> = {}, verwendet: string[] = []) {
  const onWaehle = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <MaterialBilderProvider materialId="m1" verwendet={new Set(verwendet)} seitenGroesse={1_000_000}>
      <BildAuswahl offen onOpenChange={onOpenChange} onWaehle={onWaehle} {...props} />
    </MaterialBilderProvider>,
  )
  return { onWaehle, onOpenChange }
}

/** Radix-Reiter reagieren auf mouseDown, normale Knöpfe auf click */
const klick = (el: HTMLElement) => {
  fireEvent.mouseDown(el)
  fireEvent.click(el)
}

const bild = (name = 'foto.png', typ = 'image/png', groesse = 1000) => {
  const f = new File(['x'], name, { type: typ })
  Object.defineProperty(f, 'size', { value: groesse })
  return f
}

beforeEach(() => {
  vi.clearAllMocks()
  m.liste.mockResolvedValue({ bilder: [EIGEN, SKRIPT], mehr: false, skript: true })
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
})

describe('Bild-Fenster (PROJ-92)', () => {
  it('zeigt die Galerie mit „Verwendet“ und „Eigenes Bild“, ein Klick wählt', async () => {
    const { onWaehle } = zeige({}, ['images/seite3.png'])
    expect(await screen.findByText('Eigenes Bild')).toBeInTheDocument()
    expect(screen.getAllByText('Verwendet')).toHaveLength(1)
    klick(screen.getByRole('button', { name: /seite3\.png/ }))
    expect(onWaehle).toHaveBeenCalledWith('images/seite3.png')
  })

  it('weist darauf hin, dass das Skript nicht mehr da ist', async () => {
    m.liste.mockResolvedValue({ bilder: [EIGEN], mehr: false, skript: false })
    zeige()
    expect(await screen.findByText(/nicht mehr verfügbar/)).toBeInTheDocument()
  })

  it('zeigt einen Leerzustand mit „Bild hochladen“', async () => {
    m.liste.mockResolvedValue({ bilder: [], mehr: false, skript: true })
    zeige()
    klick(await screen.findByRole('button', { name: /Bild hochladen/ }))
    expect(screen.getByText(/Bild hierher ziehen/)).toBeInTheDocument()
  })

  it('lehnt falsche Formate und zu große Dateien ab, bevor etwas passiert', async () => {
    zeige()
    klick(await screen.findByRole('tab', { name: /Hochladen/ }))
    const feld = screen.getByLabelText('Bilddatei auswählen')
    fireEvent.change(feld, { target: { files: [bild('logo.svg', 'image/svg+xml')] } })
    expect(await screen.findByText(/PNG, JPG und WebP/, { selector: '[role=alert]' })).toBeInTheDocument()
    fireEvent.change(feld, { target: { files: [bild('riesig.jpg', 'image/jpeg', 11_000_000)] } })
    expect(await screen.findByText(/größer als 10 MB/)).toBeInTheDocument()
    expect(m.hoch).not.toHaveBeenCalled()
  })

  it('verlangt den Alternativtext, lädt dann hoch und meldet Name und Text', async () => {
    m.hoch.mockImplementation(async (_id, _blob, fortschritt) => {
      fortschritt(100)
      return EIGEN
    })
    const { onWaehle } = zeige({ mitAlt: true })
    klick(await screen.findByRole('tab', { name: /Hochladen/ }))
    fireEvent.change(screen.getByLabelText('Bilddatei auswählen'), { target: { files: [bild()] } })
    const uebernehmen = await screen.findByRole('button', { name: 'Übernehmen' })
    await waitFor(() => expect(bearbeiten.arbeitskopie).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByAltText('Vorschau des Bildes')).toBeInTheDocument())
    expect(uebernehmen).toBeDisabled()
    expect(screen.getByText(/Bitte beschreibe/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Alternativtext/), { target: { value: 'Ein Lager' } })
    expect(uebernehmen).toBeEnabled()
    klick(uebernehmen)
    await waitFor(() => expect(onWaehle).toHaveBeenCalledWith('images/eigen_abc123de.jpg', 'Ein Lager'))
    expect(m.hoch).toHaveBeenCalledWith('m1', expect.any(Blob), expect.any(Function))
  })

  it('ohne Alternativtext-Frage (z. B. Bildzuordnung) genügt „Übernehmen“', async () => {
    m.hoch.mockResolvedValue(EIGEN)
    const { onWaehle } = zeige()
    klick(await screen.findByRole('tab', { name: /Hochladen/ }))
    fireEvent.change(screen.getByLabelText('Bilddatei auswählen'), { target: { files: [bild()] } })
    await waitFor(() => expect(screen.getByAltText('Vorschau des Bildes')).toBeInTheDocument())
    klick(screen.getByRole('button', { name: 'Übernehmen' }))
    await waitFor(() => expect(onWaehle).toHaveBeenCalledWith('images/eigen_abc123de.jpg', undefined))
  })

  it('zeigt Fehler des Hochladens und lässt den Block unverändert', async () => {
    m.hoch.mockRejectedValue(new Error('Das Hochladen wurde unterbrochen.'))
    const { onWaehle } = zeige()
    klick(await screen.findByRole('tab', { name: /Hochladen/ }))
    fireEvent.change(screen.getByLabelText('Bilddatei auswählen'), { target: { files: [bild()] } })
    await waitFor(() => expect(screen.getByAltText('Vorschau des Bildes')).toBeInTheDocument())
    klick(screen.getByRole('button', { name: 'Übernehmen' }))
    expect(await screen.findByText('Das Hochladen wurde unterbrochen.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeEnabled()
    expect(onWaehle).not.toHaveBeenCalled()
  })

  it('warnt vor einer Seite über 8 MB und lädt erst nach „Trotzdem übernehmen“', async () => {
    m.ergebnis.mockResolvedValue({ blob: new Blob([new Uint8Array(10)], { type: 'image/jpeg' }), typ: 'jpg', breite: 1, hoehe: 1 } as never)
    m.hoch.mockResolvedValue(EIGEN)
    render(
      <MaterialBilderProvider materialId="m1" seitenGroesse={7_999_995}>
        <BildAuswahl offen onOpenChange={() => {}} onWaehle={vi.fn()} />
      </MaterialBilderProvider>,
    )
    klick(await screen.findByRole('tab', { name: /Hochladen/ }))
    fireEvent.change(screen.getByLabelText('Bilddatei auswählen'), { target: { files: [bild()] } })
    await waitFor(() => expect(screen.getByAltText('Vorschau des Bildes')).toBeInTheDocument())
    klick(screen.getByRole('button', { name: 'Übernehmen' }))
    expect(await screen.findByText(/größer als 8 MB/)).toBeInTheDocument()
    expect(m.hoch).not.toHaveBeenCalled()
    klick(screen.getByRole('button', { name: 'Trotzdem übernehmen' }))
    await waitFor(() => expect(m.hoch).toHaveBeenCalled())
  })

  it('„Bild bearbeiten“ holt das vorhandene Bild und startet direkt im Bearbeiten-Schritt', async () => {
    m.gross.mockResolvedValue({ pfad: 'images/seite3.png', bild: 'data:image/jpeg;base64,QUJD', breite: 6, hoehe: 3 })
    zeige({ bearbeite: 'images/seite3.png', mitAlt: true, alt: 'Altes Lager' })
    expect(await screen.findByRole('heading', { name: 'Bild bearbeiten' })).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Altes Lager')).toBeInTheDocument()
    expect(m.gross).toHaveBeenCalledWith('m1', 'images/seite3.png')
  })
})
