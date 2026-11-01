import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FreigabeOptionen, FreigabeStand } from '@/lib/werkzeugkiste-regal'

const api = vi.hoisted(() => ({
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
import { WerkzeugFehler } from '@/lib/werkzeugkiste-api'

import { TeilenDialog } from './teilen-dialog'

// Radix (Auswahlknöpfe, Kontrollkästchen) misst Größen per ResizeObserver, den jsdom nicht kennt
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

const ZIEL = { id: 'm1', titel: 'Haftung im Frachtrecht' }
const SPED = { id: 'd1', name: 'Spedition' }
const TOUR = { id: 'd2', name: 'Tourismus' }

function optionen(extra: Partial<FreigabeOptionen> = {}): FreigabeOptionen {
  return {
    bereiche: [SPED],
    faecher: [{ id: 'f1', name: 'KSK', eigen: true }],
    ...extra,
  }
}

function stand(extra: Partial<FreigabeStand> = {}): FreigabeStand {
  return { stufe: 'alle', fachId: null, notiz: null, bereiche: [], personen: [], entnommenAm: null, entnommenGrund: null, ...extra }
}

function oeffne(gespeichert = vi.fn(), schliessen = vi.fn()) {
  render(<TeilenDialog ziel={ZIEL} schliessen={schliessen} gespeichert={gespeichert} />)
  return { gespeichert, schliessen }
}

const speichern = () => screen.getByRole('button', { name: 'Speichern' })
const radio = (name: RegExp) => screen.getByRole('radio', { name })

beforeEach(() => {
  api.ladeFreigabe.mockReset().mockResolvedValue({ freigabe: null })
  api.ladeFreigabeOptionen.mockReset().mockResolvedValue(optionen())
  api.speichereFreigabe.mockReset().mockResolvedValue(undefined)
  api.sucheLehrkraefte.mockReset().mockResolvedValue([])
})
afterEach(() => vi.clearAllMocks())

describe('Teilen-Dialog (PROJ-53)', () => {
  it('bietet die vier Stufen mit erklärendem Satz an und beginnt bei „Nur ich“', async () => {
    oeffne()
    expect(await screen.findByText('Nur du siehst dieses Material.')).toBeInTheDocument()
    expect(radio(/^Nur ich/)).toBeChecked()
    expect(screen.getByText('Alle Lehrkräfte in Spedition sehen es im Regal.')).toBeInTheDocument()
    expect(screen.getByText('Alle Lehrkräfte der Schule sehen es im Regal.')).toBeInTheDocument()
    expect(radio(/Ausgewählte Kolleginnen/)).toBeInTheDocument()
    // Nichts zu speichern, solange es privat bleibt und nie geteilt war
    expect(speichern()).toBeDisabled()
  })

  it('weist darauf hin, dass nur das fertige Material geteilt wird und das Skript privat bleibt', async () => {
    oeffne()
    expect(await screen.findByText('Geteilt wird nur das fertige Material. Dein Skript bleibt privat.')).toBeInTheDocument()
  })

  it('teilt mit dem eigenen Fachbereich: ein einziger Bereich ist schon vorgewählt', async () => {
    const { gespeichert } = oeffne()
    await screen.findByText('Nur du siehst dieses Material.')
    fireEvent.click(radio(/Mein Fachbereich/))
    expect(speichern()).toBeEnabled()
    fireEvent.click(speichern())
    await waitFor(() => expect(api.speichereFreigabe).toHaveBeenCalled())
    expect(api.speichereFreigabe).toHaveBeenCalledWith('m1', {
      stufe: 'fachbereich',
      fachId: null,
      notiz: '',
      bereiche: ['d1'],
      personen: [],
    })
    expect(toast.success).toHaveBeenCalledWith('Mit deinem Fachbereich geteilt')
    expect(gespeichert).toHaveBeenCalledWith('m1', { stufe: 'fachbereich', personen: 0, bereiche: 1, entnommen: false })
  })

  it('lässt bei mehreren Fachbereichen einen oder mehrere ankreuzen und verlangt mindestens einen', async () => {
    api.ladeFreigabeOptionen.mockResolvedValue(optionen({ bereiche: [SPED, TOUR] }))
    oeffne()
    await screen.findByText('Nur du siehst dieses Material.')
    fireEvent.click(radio(/Mein Fachbereich/))
    expect(screen.getByRole('checkbox', { name: 'Spedition' })).not.toBeChecked()
    expect(speichern()).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tourismus' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Spedition' }))
    expect(speichern()).toBeEnabled()
    fireEvent.click(speichern())
    await waitFor(() => expect(api.speichereFreigabe).toHaveBeenCalled())
    expect(api.speichereFreigabe.mock.calls[0][1].bereiche.sort()).toEqual(['d1', 'd2'])
  })

  it('graut „Mein Fachbereich“ ohne Fachbereich aus und nennt den Weg dorthin', async () => {
    api.ladeFreigabeOptionen.mockResolvedValue(optionen({ bereiche: [] }))
    oeffne()
    expect(await screen.findByText('Trage dich unter Meine Fächer ein')).toBeInTheDocument()
    expect(radio(/Mein Fachbereich/)).toBeDisabled()
    // Die anderen Stufen gehen weiter
    fireEvent.click(radio(/^Alle Lehrkräfte/))
    expect(speichern()).toBeEnabled()
  })

  it('teilt mit allen Lehrkräften und gibt Fach und Notiz weiter, Notiz zählt mit', async () => {
    oeffne()
    await screen.findByText('Nur du siehst dieses Material.')
    fireEvent.click(radio(/^Alle Lehrkräfte/))
    const notiz = screen.getByLabelText(/Notiz/)
    fireEvent.change(notiz, { target: { value: '  Für die 11. Klasse  ' } })
    expect(screen.getByText('22 / 200')).toBeInTheDocument()
    fireEvent.click(speichern())
    await waitFor(() => expect(api.speichereFreigabe).toHaveBeenCalled())
    expect(api.speichereFreigabe).toHaveBeenCalledWith('m1', expect.objectContaining({ stufe: 'alle', notiz: 'Für die 11. Klasse' }))
    expect(toast.success).toHaveBeenCalledWith('Mit allen Lehrkräften geteilt')
  })

  describe('Ausgewählte Kolleginnen und Kollegen', () => {
    it('sucht nach Namen, zeigt die Auswahl als Chips und lässt sie wieder entfernen', async () => {
      api.sucheLehrkraefte.mockResolvedValue([{ id: 'u2', name: 'Frau Meier' }])
      oeffne()
      await screen.findByText('Nur du siehst dieses Material.')
      fireEvent.click(radio(/Ausgewählte Kolleginnen/))
      expect(speichern()).toBeDisabled()

      fireEvent.change(screen.getByLabelText('Lehrkräfte suchen'), { target: { value: 'Mei' } })
      const treffer = await screen.findByRole('button', { name: 'Frau Meier' })
      fireEvent.click(treffer)
      expect(api.sucheLehrkraefte).toHaveBeenCalledWith('Mei')

      expect(screen.getByRole('button', { name: 'Frau Meier entfernen' })).toBeInTheDocument()
      expect(screen.getByText('1 von 50 Personen')).toBeInTheDocument()
      expect(speichern()).toBeEnabled()

      fireEvent.click(screen.getByRole('button', { name: 'Frau Meier entfernen' }))
      expect(screen.queryByRole('button', { name: 'Frau Meier entfernen' })).not.toBeInTheDocument()
      expect(speichern()).toBeDisabled()
    })

    it('fragt unter zwei Zeichen nicht und meldet „keine Lehrkraft gefunden“', async () => {
      oeffne()
      await screen.findByText('Nur du siehst dieses Material.')
      fireEvent.click(radio(/Ausgewählte Kolleginnen/))
      fireEvent.change(screen.getByLabelText('Lehrkräfte suchen'), { target: { value: 'M' } })
      await new Promise((r) => setTimeout(r, 400))
      expect(api.sucheLehrkraefte).not.toHaveBeenCalled()

      fireEvent.change(screen.getByLabelText('Lehrkräfte suchen'), { target: { value: 'Zz' } })
      expect(await screen.findByText('Keine passende Lehrkraft gefunden.')).toBeInTheDocument()
    })

    it('schickt die gewählten Personen mit', async () => {
      api.ladeFreigabe.mockResolvedValue({
        freigabe: stand({ stufe: 'ausgewaehlte', personen: [{ id: 'u2', name: 'Frau Meier', aktiv: true }] }),
      })
      const { gespeichert } = oeffne()
      await screen.findByRole('button', { name: 'Frau Meier entfernen' })
      fireEvent.click(speichern())
      await waitFor(() => expect(api.speichereFreigabe).toHaveBeenCalled())
      expect(api.speichereFreigabe).toHaveBeenCalledWith('m1', expect.objectContaining({ stufe: 'ausgewaehlte', personen: ['u2'] }))
      expect(toast.success).toHaveBeenCalledWith('Mit 1 Person geteilt')
      expect(gespeichert).toHaveBeenCalledWith('m1', expect.objectContaining({ stufe: 'ausgewaehlte', personen: 1 }))
    })

    it('kennzeichnet eine Person ohne Zugang und lässt sie entfernen', async () => {
      api.ladeFreigabe.mockResolvedValue({
        freigabe: stand({ stufe: 'ausgewaehlte', personen: [{ id: 'u3', name: 'Herr Weiß', aktiv: false }] }),
      })
      oeffne()
      expect(await screen.findByText('kein Zugang mehr')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Herr Weiß entfernen' }))
      expect(screen.queryByText('kein Zugang mehr')).not.toBeInTheDocument()
    })
  })

  it('zeigt den vorhandenen Stand und nimmt das Material mit „Nur ich“ aus dem Regal', async () => {
    api.ladeFreigabe.mockResolvedValue({ freigabe: stand({ stufe: 'alle', notiz: 'Klasse 12' }) })
    const { gespeichert } = oeffne()
    await screen.findByText('Alle Lehrkräfte der Schule sehen es im Regal.')
    expect(radio(/^Alle Lehrkräfte/)).toBeChecked()
    expect(screen.getByLabelText(/Notiz/)).toHaveValue('Klasse 12')

    fireEvent.click(radio(/^Nur ich/))
    expect(speichern()).toBeEnabled()
    fireEvent.click(speichern())
    await waitFor(() => expect(api.speichereFreigabe).toHaveBeenCalledWith('m1', expect.objectContaining({ stufe: 'privat' })))
    expect(gespeichert).toHaveBeenCalledWith('m1', null)
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Aus dem Regal genommen/))
  })

  it('sperrt nach einer Entnahme durch den Admin und nennt den Grund', async () => {
    api.ladeFreigabe.mockResolvedValue({ freigabe: stand({ entnommenAm: '2026-11-01T08:00:00Z', entnommenGrund: 'Urheberrecht' }) })
    oeffne()
    expect(await screen.findByText('Vom Admin aus dem Regal genommen')).toBeInTheDocument()
    expect(screen.getByText('Grund: Urheberrecht')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Speichern' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('zeigt Fehler des Servers im Dialog und bleibt offen', async () => {
    api.speichereFreigabe.mockRejectedValue(new WerkzeugFehler('Du kannst höchstens 50 Personen auswählen.', 409))
    const { gespeichert } = oeffne()
    await screen.findByText('Nur du siehst dieses Material.')
    fireEvent.click(radio(/^Alle Lehrkräfte/))
    fireEvent.click(speichern())
    expect(await screen.findByRole('alert')).toHaveTextContent('Du kannst höchstens 50 Personen auswählen.')
    expect(gespeichert).not.toHaveBeenCalled()
    expect(speichern()).toBeEnabled()
  })

  it('zeigt einen Ladefehler mit „Erneut versuchen“', async () => {
    api.ladeFreigabeOptionen.mockRejectedValueOnce(new WerkzeugFehler('Die Auswahl konnte gerade nicht geladen werden.', 500))
    oeffne()
    expect(await screen.findByText('Die Auswahl konnte gerade nicht geladen werden.')).toBeInTheDocument()
    expect(speichern()).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/ }))
    expect(await screen.findByText('Nur du siehst dieses Material.')).toBeInTheDocument()
  })

  it('schließt über „Abbrechen“, ohne zu speichern', async () => {
    const { schliessen } = oeffne()
    await screen.findByText('Nur du siehst dieses Material.')
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(schliessen).toHaveBeenCalled()
    expect(api.speichereFreigabe).not.toHaveBeenCalled()
  })
})
