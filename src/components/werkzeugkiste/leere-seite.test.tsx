import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WerkzeugFehler } from '@/lib/werkzeugkiste-api'

const api = vi.hoisted(() => ({ legeEigeneSeiteAn: vi.fn() }))
vi.mock('@/lib/werkzeugkiste-api', async (original) => ({
  ...(await original<typeof import('@/lib/werkzeugkiste-api')>()),
  ...api,
}))

import { LeereSeiteDialog } from './leere-seite-dialog'
import { WerkzeugUebersicht } from './werkzeug-uebersicht'
import { hatAufgaben, grundgeruest } from '@/lib/werkzeugkiste-editor'

describe('LeereSeiteDialog (PROJ-94)', () => {
  beforeEach(() => {
    api.legeEigeneSeiteAn.mockReset()
  })

  it('„Anlegen“ ist erst mit Titel aktiv', () => {
    render(<LeereSeiteDialog offen onOpenChange={() => {}} />)
    const knopf = screen.getByRole('button', { name: 'Anlegen' })
    expect(knopf).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: '   ' } })
    expect(knopf).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Incoterms' } })
    expect(knopf).toBeEnabled()
  })

  it('schickt Titel und Untertitel an den Server', async () => {
    api.legeEigeneSeiteAn.mockReturnValue(new Promise(() => {}))
    render(<LeereSeiteDialog offen onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: ' Incoterms ' } })
    fireEvent.change(screen.getByLabelText(/Untertitel/), { target: { value: 'Klasse 11' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }))
    await waitFor(() => expect(api.legeEigeneSeiteAn).toHaveBeenCalledWith('Incoterms', 'Klasse 11'))
  })

  it('zeigt den Serverfehler, etwa bei voller Ablage, und legt nichts an', async () => {
    api.legeEigeneSeiteAn.mockRejectedValue(new WerkzeugFehler('Dein Speicher ist voll.', 413))
    render(<LeereSeiteDialog offen onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Dein Speicher ist voll.')
    expect(screen.getByRole('button', { name: 'Anlegen' })).toBeEnabled()
  })
})

describe('Karte „Eigene Seite bauen“', () => {
  it('steht in der Übersicht und öffnet auf Klick den Dialog', () => {
    const auf = vi.fn()
    render(<WerkzeugUebersicht onEigeneSeite={auf} />)
    fireEvent.click(screen.getByRole('button', { name: /Eigene Seite bauen/ }))
    expect(auf).toHaveBeenCalled()
  })

  it('fehlt, wenn kein Einstieg übergeben wird', () => {
    render(<WerkzeugUebersicht />)
    expect(screen.queryByText('Eigene Seite bauen')).toBeNull()
  })
})

describe('hatAufgaben', () => {
  it('das Grundgerüst hat noch keine Aufgaben', () => {
    expect(hatAufgaben(grundgeruest('Test'))).toBe(false)
  })
  it('ein Block, der kein Text ist, zählt als Aufgabe', () => {
    const s = grundgeruest('Test')
    s.chapters[0].elements.push({ type: 'quiz' })
    expect(hatAufgaben(s)).toBe(true)
  })
  it('Fragen in der Lernzielkontrolle zählen als Aufgabe', () => {
    const s = grundgeruest('Test')
    s.final_chapter = { title: 'Lernzielkontrolle', question_set: [{ q: 'x' }] }
    expect(hatAufgaben(s)).toBe(true)
  })
})
