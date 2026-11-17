import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/werkzeugkiste-api', async (original) => {
  const echt = await original<typeof import('@/lib/werkzeugkiste-api')>()
  return {
    ...echt,
    ladeMaterialien: vi.fn(),
    ladeRegal: vi.fn(),
    ladeUebernahmeGliederung: vi.fn(),
    baueUebernahmeVorschau: vi.fn(),
    ladeSeitenText: vi.fn(),
    holeUebernahme: vi.fn(),
  }
})

import * as api from '@/lib/werkzeugkiste-api'
import { UebernehmenDialog } from './uebernehmen-dialog'

const m = {
  material: vi.mocked(api.ladeMaterialien),
  regal: vi.mocked(api.ladeRegal),
  gliederung: vi.mocked(api.ladeUebernahmeGliederung),
  vorschau: vi.mocked(api.baueUebernahmeVorschau),
  seite: vi.mocked(api.ladeSeitenText),
  hole: vi.mocked(api.holeUebernahme),
}

const EIGEN_ID = '22222222-2222-4222-8222-222222222222'
const FREIGABE_ID = '44444444-4444-4444-8444-444444444444'

const GLIEDERUNG = {
  titel: 'Mein Heft',
  werkzeug: 'skript',
  themen: [
    {
      titel: 'Lagerarten',
      bloecke: [
        { typ: 'text', name: 'Lehrtext', kurz: 'Ein Lager ist …', passt: true },
        { typ: 'fremd', name: 'Unbekannter Block', kurz: '', passt: false },
      ],
    },
    { titel: 'Verpackung', bloecke: [{ typ: 'true_false', name: 'Richtig oder falsch', kurz: 'Wahr?', passt: true }] },
  ],
  fragen: [{ typ: 'multiple_choice', name: 'Auswahlfrage', kurz: 'Welche?', passt: true }],
}

function zeige() {
  const onUebernommen = vi.fn()
  const onOpenChange = vi.fn()
  render(<UebernehmenDialog offen onOpenChange={onOpenChange} zielId="ziel" seitenGroesse={1234} onUebernommen={onUebernommen} />)
  return { onUebernommen, onOpenChange }
}

const klick = (el: HTMLElement) => {
  fireEvent.mouseDown(el)
  fireEvent.click(el)
}

beforeEach(() => {
  vi.clearAllMocks()
  m.material.mockResolvedValue({
    eintraege: [
      { id: EIGEN_ID, art: 'material', werkzeug: 'skript', titel: 'Mein Heft', baukasten: 'bearbeiten' },
      { id: 'h5p', art: 'material', werkzeug: 'skript', titel: 'Nur H5P', baukasten: 'als-seite' },
      { id: 'entwurf', art: 'entwurf', werkzeug: 'skript', titel: 'Entwurf', baukasten: null },
    ],
  } as never)
  m.regal.mockResolvedValue({
    eintraege: [
      { id: FREIGABE_ID, titel: 'Regal-Heft', werkzeug: 'skript', format: 'seite', besitzerName: 'Frau Müller', vonMir: false },
      { id: 'meins', titel: 'Mein eigenes im Regal', werkzeug: 'skript', format: 'seite', besitzerName: 'Ich', vonMir: true },
      { id: 'h5p', titel: 'Regal H5P', werkzeug: 'skript', format: 'h5p', besitzerName: 'X', vonMir: false },
    ],
    gesamt: 3,
    hatMehr: false,
  } as never)
  m.gliederung.mockResolvedValue(GLIEDERUNG)
  m.vorschau.mockResolvedValue({ adresse: 'https://speicher.test/v', groesse: 1 })
  m.seite.mockResolvedValue('<p>Mini</p>')
  m.hole.mockResolvedValue({ themen: [], bloecke: [], ausgelassen: 0, fehlend: 0, titel: 'Mein Heft' })
})

describe('Aus Material übernehmen (PROJ-108)', () => {
  it('zeigt nur Materialien, die der Baukasten bearbeiten kann', async () => {
    zeige()
    expect(await screen.findByText('Mein Heft')).toBeInTheDocument()
    expect(screen.queryByText('Nur H5P')).not.toBeInTheDocument()
    expect(screen.queryByText('Entwurf')).not.toBeInTheDocument()
  })

  it('im Reiter „Regal“ stehen fremde Seiten, nicht die eigenen und nicht H5P', async () => {
    zeige()
    await screen.findByText('Mein Heft')
    klick(screen.getByRole('tab', { name: 'Regal' }))
    expect(await screen.findByText('Regal-Heft')).toBeInTheDocument()
    expect(screen.getByText(/Frau Müller/)).toBeInTheDocument()
    expect(screen.queryByText('Mein eigenes im Regal')).not.toBeInTheDocument()
    expect(screen.queryByText('Regal H5P')).not.toBeInTheDocument()
  })

  it('leere Liste: ein Satz mit Hinweis auf die Werkzeuge', async () => {
    m.material.mockResolvedValue({ eintraege: [] } as never)
    zeige()
    expect(await screen.findByText(/Erstelle sie unter „Werkzeuge“/)).toBeInTheDocument()
  })

  it('zeigt die Gliederung, wählt ein Thema und übernimmt nur Verweise (Quelle und Nummern)', async () => {
    const { onUebernommen, onOpenChange } = zeige()
    fireEvent.click(await screen.findByText('Mein Heft'))
    expect(await screen.findByText('Lagerarten')).toBeInTheDocument()
    expect(screen.getByText(/Wird ausgelassen/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Übernehmen' })).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: /Ganzes Thema „Lagerarten“/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Richtig oder falsch/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Frage 1/ }))
    const knopf = await screen.findByRole('button', { name: '1 Thema und 2 Blöcke übernehmen' })
    fireEvent.click(knopf)

    await waitFor(() => expect(m.hole).toHaveBeenCalled())
    expect(m.hole).toHaveBeenCalledWith(
      'ziel',
      { art: 'eigen', id: EIGEN_ID },
      { themen: [0], bloecke: [{ thema: 1, block: 0 }], fragen: [0] },
      1234,
    )
    await waitFor(() => expect(onUebernommen).toHaveBeenCalled())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('einzelne Blöcke eines ganz gewählten Themas sind schon enthalten (nicht extra wählbar)', async () => {
    zeige()
    fireEvent.click(await screen.findByText('Mein Heft'))
    await screen.findByText('Lagerarten')
    const block = screen.getByRole('checkbox', { name: /Lehrtext: Ein Lager ist/ })
    fireEvent.click(block)
    expect(block).toBeChecked()
    fireEvent.click(screen.getByRole('checkbox', { name: /Ganzes Thema „Lagerarten“/ }))
    expect(screen.getByRole('checkbox', { name: /Lehrtext: Ein Lager ist/ })).toBeDisabled()
    expect(await screen.findByRole('button', { name: '1 Thema übernehmen' })).toBeEnabled()
  })

  it('baut die Vorschau erst beim Anklicken', async () => {
    zeige()
    fireEvent.click(await screen.findByText('Mein Heft'))
    await screen.findByText('Lagerarten')
    expect(m.vorschau).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Vorschau von Thema „Verpackung“/ }))
    await waitFor(() => expect(m.vorschau).toHaveBeenCalledWith('ziel', { art: 'eigen', id: EIGEN_ID }, { themen: [1], bloecke: [], fragen: [] }))
    expect(await screen.findByTitle('Vorschau des Gewählten')).toHaveAttribute('sandbox', 'allow-scripts')
  })

  it('zurückgezogenes Regal-Material: verständlicher Satz, der Dialog bleibt offen', async () => {
    m.hole.mockRejectedValue(new api.WerkzeugFehler('intern', 404))
    const { onUebernommen, onOpenChange } = zeige()
    await screen.findByText('Mein Heft')
    klick(screen.getByRole('tab', { name: 'Regal' }))
    fireEvent.click(await screen.findByText('Regal-Heft'))
    await screen.findByText('Lagerarten')
    fireEvent.click(screen.getByRole('checkbox', { name: /Ganzes Thema „Verpackung“/ }))
    fireEvent.click(await screen.findByRole('button', { name: '1 Thema übernehmen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('nicht mehr')
    expect(onUebernommen).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(m.gliederung).toHaveBeenCalledWith('ziel', { art: 'regal', id: FREIGABE_ID })
  })

  it('zeigt einen Fehler der Gliederung ohne technische Texte', async () => {
    m.gliederung.mockRejectedValue(new api.WerkzeugFehler('Dieses Material gibt es nicht mehr oder du darfst es nicht sehen.', 404))
    zeige()
    fireEvent.click(await screen.findByText('Mein Heft'))
    expect(await screen.findByRole('alert')).toHaveTextContent('gibt es nicht mehr')
  })

  it('wird der Dialog geschlossen, während der Server arbeitet, wird nichts eingefügt', async () => {
    let fertig: (r: Awaited<ReturnType<typeof api.holeUebernahme>>) => void = () => {}
    m.hole.mockReturnValue(new Promise((res) => (fertig = res)))
    const onUebernommen = vi.fn()
    const props = { zielId: 'ziel', seitenGroesse: 1, onUebernommen, onOpenChange: vi.fn() }
    const { rerender } = render(<UebernehmenDialog offen {...props} />)
    fireEvent.click(await screen.findByText('Mein Heft'))
    await screen.findByText('Lagerarten')
    fireEvent.click(screen.getByRole('checkbox', { name: /Ganzes Thema „Verpackung“/ }))
    fireEvent.click(await screen.findByRole('button', { name: '1 Thema übernehmen' }))
    await waitFor(() => expect(m.hole).toHaveBeenCalled())
    rerender(<UebernehmenDialog offen={false} {...props} />)
    fertig({ themen: [{ title: 'X', elements: [] }], bloecke: [], ausgelassen: 0, fehlend: 0, titel: 'T' })
    await new Promise((r) => setTimeout(r, 20))
    expect(onUebernommen).not.toHaveBeenCalled()
  })
})
