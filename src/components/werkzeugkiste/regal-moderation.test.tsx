import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ModerationListe, ModerationZeile } from '@/lib/werkzeugkiste-regal'

const api = vi.hoisted(() => ({
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

import { RegalModeration } from './regal-moderation'

function zeile(extra: Partial<ModerationZeile> = {}): ModerationZeile {
  return {
    id: 'f1',
    titel: 'Haftung im Frachtrecht',
    werkzeug: 'skript',
    besitzerName: 'Frau Meier',
    stufe: 'alle',
    geladen: 4,
    geteiltAm: new Date().toISOString(),
    entnommenAm: null,
    entnommenGrund: null,
    ...extra,
  }
}

function liste(eintraege: ModerationZeile[], extra: Partial<ModerationListe> = {}): ModerationListe {
  return { eintraege, gesamt: eintraege.length, hatMehr: false, ...extra }
}

beforeEach(() => {
  api.ladeModeration.mockReset()
  api.entnimmAusRegal.mockReset().mockResolvedValue({ ok: true })
  api.lasseWiederZu.mockReset().mockResolvedValue({ ok: true })
})
afterEach(() => vi.clearAllMocks())

describe('Regal-Moderation (PROJ-53, Paket 2)', () => {
  it('zeigt Titel, Besitzer, Stufe und Ladezahl jeder Freigabe', async () => {
    api.ladeModeration.mockResolvedValue(liste([zeile(), zeile({ id: 'f2', titel: 'Zweites', stufe: 'fachbereich', besitzerName: 'Herr Weiß', geladen: 0 })]))
    render(<RegalModeration />)
    expect(await screen.findByText('Haftung im Frachtrecht')).toBeInTheDocument()
    expect(screen.getByText('Frau Meier')).toBeInTheDocument()
    expect(screen.getByText('Alle Lehrkräfte')).toBeInTheDocument()
    expect(screen.getByText('Fachbereich')).toBeInTheDocument()
    expect(screen.getByText('4×')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Aus dem Regal nehmen/ })).toHaveLength(2)
  })

  it('zeigt einen Leerzustand, solange nichts geteilt ist', async () => {
    api.ladeModeration.mockResolvedValue(liste([]))
    render(<RegalModeration />)
    expect(await screen.findByText('Noch nichts geteilt.')).toBeInTheDocument()
  })

  it('verlangt einen Grund, bevor etwas aus dem Regal genommen wird', async () => {
    api.ladeModeration.mockResolvedValue(liste([zeile()]))
    render(<RegalModeration />)
    fireEvent.click(await screen.findByRole('button', { name: /Aus dem Regal nehmen: Haftung/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Material aus dem Regal nehmen?')).toBeInTheDocument()
    const knopf = within(dialog).getByRole('button', { name: 'Aus dem Regal nehmen' })
    expect(knopf).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText(/Grund/), { target: { value: 'ab' } })
    expect(knopf).toBeDisabled()
    expect(api.entnimmAusRegal).not.toHaveBeenCalled()
  })

  it('nimmt mit Grund aus dem Regal, meldet es und lädt die Liste neu', async () => {
    api.ladeModeration.mockResolvedValueOnce(liste([zeile()])).mockResolvedValueOnce(
      liste([zeile({ entnommenAm: new Date().toISOString(), entnommenGrund: 'Urheberrecht des Verlags' })]),
    )
    render(<RegalModeration />)
    fireEvent.click(await screen.findByRole('button', { name: /Aus dem Regal nehmen: Haftung/ }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.change(within(dialog).getByLabelText(/Grund/), { target: { value: '  Urheberrecht des Verlags  ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aus dem Regal nehmen' }))

    await waitFor(() => expect(api.entnimmAusRegal).toHaveBeenCalledWith('f1', 'Urheberrecht des Verlags'))
    expect(toast.success).toHaveBeenCalledWith('Aus dem Regal genommen')
    expect(await screen.findByText(/Entnommen: Urheberrecht des Verlags/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wieder zulassen/ })).toBeInTheDocument()
  })

  it('zeigt Fehler im Dialog und bleibt offen', async () => {
    api.ladeModeration.mockResolvedValue(liste([zeile()]))
    api.entnimmAusRegal.mockRejectedValue(new WerkzeugFehler('Dieses Material wurde schon aus dem Regal genommen.', 409))
    render(<RegalModeration />)
    fireEvent.click(await screen.findByRole('button', { name: /Aus dem Regal nehmen: Haftung/ }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.change(within(dialog).getByLabelText(/Grund/), { target: { value: 'Urheberrecht' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aus dem Regal nehmen' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('schon aus dem Regal genommen')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('lässt eine Entnahme wieder zu', async () => {
    api.ladeModeration
      .mockResolvedValueOnce(liste([zeile({ entnommenAm: new Date().toISOString(), entnommenGrund: 'Urheberrecht' })]))
      .mockResolvedValueOnce(liste([]))
    render(<RegalModeration />)
    expect(screen.queryByRole('button', { name: /^Aus dem Regal nehmen/ })).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /Wieder zulassen/ }))
    await waitFor(() => expect(api.lasseWiederZu).toHaveBeenCalledWith('f1'))
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Wieder zugelassen/))
    expect(await screen.findByText('Noch nichts geteilt.')).toBeInTheDocument()
  })

  it('lädt mit „Mehr laden“ die nächste Seite nach und zeigt Ladefehler ruhig', async () => {
    api.ladeModeration.mockRejectedValueOnce(new WerkzeugFehler('Die Übersicht konnte gerade nicht geladen werden.', 500))
    render(<RegalModeration />)
    expect(await screen.findByText('Die Übersicht konnte gerade nicht geladen werden.')).toBeInTheDocument()

    api.ladeModeration.mockResolvedValueOnce(liste([zeile({ titel: 'Erste' })], { gesamt: 51, hatMehr: true }))
    fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/ }))
    await screen.findByText('Erste')
    api.ladeModeration.mockResolvedValueOnce(liste([zeile({ id: 'f9', titel: 'Zweite' })], { gesamt: 51 }))
    fireEvent.click(screen.getByRole('button', { name: 'Mehr laden' }))
    expect(await screen.findByText('Zweite')).toBeInTheDocument()
    expect(api.ladeModeration).toHaveBeenLastCalledWith(2)
  })
})
