import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Ablauf } from '@/lib/werkzeugkiste'

const api = vi.hoisted(() => ({ ladeKapitel: vi.fn(), erstelleKapitelPrompt: vi.fn(), setzeKapitelEin: vi.fn() }))
vi.mock('@/lib/werkzeugkiste-api', async (original) => ({ ...(await original<typeof import('@/lib/werkzeugkiste-api')>()), ...api }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { UeberarbeitenHilfen } from './ueberarbeiten-hilfen'

function zeige(extra: Partial<Parameters<typeof UeberarbeitenHilfen>[0]> = {}) {
  const props = { ablaufId: 'a1', antwort: 'Fraht und Fraht', setAntwort: vi.fn(), gespeichert: true, onAblauf: vi.fn(), ...extra }
  render(<UeberarbeitenHilfen {...props} />)
  return props
}

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
})

describe('Überarbeiten-Hilfen in Schritt 4 (PROJ-52, Paket 2)', () => {
  it('ersetzt einen Tippfehler überall und meldet die Zahl der Stellen', () => {
    const p = zeige()
    fireEvent.click(screen.getByRole('button', { name: /Tippfehler direkt korrigieren/ }))
    fireEvent.change(screen.getByLabelText('Suchen'), { target: { value: 'Fraht' } })
    expect(screen.getByText('2 Fundstellen')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Ersetzen durch'), { target: { value: 'Fracht' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ersetzen' }))
    expect(p.setAntwort).toHaveBeenCalledWith('Fracht und Fracht')
    expect(screen.getByText('2 Stellen ersetzt.')).toBeInTheDocument()
  })

  it('sagt ruhig Bescheid, wenn die Stelle nicht vorkommt, und ändert nichts', () => {
    const p = zeige()
    fireEvent.click(screen.getByRole('button', { name: /Tippfehler direkt korrigieren/ }))
    fireEvent.change(screen.getByLabelText('Suchen'), { target: { value: 'Zoll' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ersetzen' }))
    expect(screen.getByText('Diese Stelle kommt in der Antwort nicht vor.')).toBeInTheDocument()
    expect(p.setAntwort).not.toHaveBeenCalled()
  })

  it('fragt ein Kapitel in zwei Schritten an: Wunsch → Prompt → Antwort einsetzen', async () => {
    api.ladeKapitel.mockResolvedValue({ kapitel: ['Einführung', 'Haftung'] })
    api.erstelleKapitelPrompt.mockResolvedValue({ prompt: 'Du überarbeitest EIN Kapitel', titel: 'Einführung' })
    const neu = { id: 'a1', antwort: 'neu' } as Ablauf
    api.setzeKapitelEin.mockResolvedValue({ ablauf: neu })
    const p = zeige()

    fireEvent.click(screen.getByRole('button', { name: /Ein einzelnes Kapitel neu anfragen/ }))
    const wunsch = await screen.findByLabelText('Was soll anders werden?')
    expect(api.ladeKapitel).toHaveBeenCalledWith('a1')
    const erstellen = screen.getByRole('button', { name: /Prompt für dieses Kapitel erstellen/ })
    expect(erstellen).toBeDisabled()
    fireEvent.change(wunsch, { target: { value: 'Mehr Beispiele' } })
    fireEvent.click(erstellen)
    await waitFor(() => expect(api.erstelleKapitelPrompt).toHaveBeenCalledWith('a1', 0, 'Mehr Beispiele'))

    const feld = await screen.findByLabelText('Antwort der KI zum Kapitel')
    expect(screen.getByRole('button', { name: /Prompt kopieren/ })).toBeInTheDocument()
    const einsetzen = screen.getByRole('button', { name: 'Kapitel einsetzen' })
    expect(einsetzen).toBeDisabled()
    fireEvent.change(feld, { target: { value: 'title: Einführung neu' } })
    fireEvent.click(einsetzen)
    await waitFor(() => expect(api.setzeKapitelEin).toHaveBeenCalledWith('a1', 0, 'title: Einführung neu'))
    await waitFor(() => expect(p.onAblauf).toHaveBeenCalledWith(neu))
  })

  it('zeigt „Kapitel neu anfragen“ erst, wenn die Antwort gespeichert und geprüft ist, und gar nicht ohne Kapitel', async () => {
    zeige({ gespeichert: false })
    expect(screen.queryByRole('button', { name: /Ein einzelnes Kapitel/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tippfehler direkt korrigieren/ })).toBeInTheDocument()
  })

  it('blendet den Kapitel-Teil aus, wenn die Antwort keine Kapitel hat', async () => {
    api.ladeKapitel.mockResolvedValue({ kapitel: [] })
    zeige()
    fireEvent.click(screen.getByRole('button', { name: /Ein einzelnes Kapitel neu anfragen/ }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /Ein einzelnes Kapitel/ })).not.toBeInTheDocument())
  })
})
