import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { KontoVerbrauchKarte } from './konto-verbrauch'
import type { VerbrauchLauf } from '@/lib/werkzeugkiste-verbrauch'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push }),
  usePathname: () => '/admin/konto',
  useSearchParams: () => new URLSearchParams(),
}))

const jetzt = new Date()
const iso = (tageZurueck: number) => new Date(jetzt.getTime() - tageZurueck * 86_400_000).toISOString()
const lauf = (i: number, kosten: number, extra: Partial<VerbrauchLauf> = {}): VerbrauchLauf => ({
  id: `l${i}`,
  werkzeug: 'skript',
  dateiName: `skript-${i}.pdf`,
  status: 'fertig',
  kostenEur: kosten,
  gestartetAm: iso(0),
  ...extra,
})

beforeEach(() => vi.clearAllMocks())

describe('Karte „Werkzeugkiste – mein Verbrauch“ (PROJ-65)', () => {
  it('zeigt ohne Läufe den Leerzustand mit dem Hinweis auf den kostenlosen Weg', () => {
    render(<KontoVerbrauchKarte section={{ ok: true, data: [] }} />)
    expect(screen.getByText('Noch nichts verbraucht')).toBeInTheDocument()
    expect(screen.getByText(/kostenlose Weg mit deiner eigenen KI verbraucht nichts/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('zeigt Summe, Anzahl und die Läufe des Monats', () => {
    render(<KontoVerbrauchKarte section={{ ok: true, data: [lauf(1, 0.125), lauf(2, 0.5, { status: 'abgebrochen' })] }} />)
    expect(screen.getByText('0,63 €')).toBeInTheDocument()
    expect(screen.getByText('aus 2 direkten Erstellungen')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('abgebrochen')).toBeInTheDocument()
    expect(screen.getByText(/Beträge ca., umgerechnet aus US-Dollar/)).toBeInTheDocument()
  })

  it('zeigt zuerst zehn Läufe und blendet den Rest mit „Mehr anzeigen“ ein', () => {
    const viele = Array.from({ length: 14 }, (_, i) => lauf(i + 1, 0.1))
    render(<KontoVerbrauchKarte section={{ ok: true, data: viele }} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: 'Mehr anzeigen (4 weitere)' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(14)
    expect(screen.queryByRole('button', { name: /Mehr anzeigen/ })).not.toBeInTheDocument()
  })

  it('meldet einen Monat ohne Verbrauch freundlich, wenn es früher welchen gab', () => {
    const vormonat = lauf(1, 2, { gestartetAm: iso(45) })
    render(<KontoVerbrauchKarte section={{ ok: true, data: [vormonat] }} />)
    expect(screen.getByText('0,00 €')).toBeInTheDocument()
    expect(screen.getByText('In diesem Monat nichts verbraucht')).toBeInTheDocument()
  })

  it('behandelt einen Fehler in der Karte, ohne die Seite zu stören', () => {
    render(<KontoVerbrauchKarte section={{ ok: false }} />)
    expect(screen.getByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument()
  })

  it('hat eine beschriftete Monatsauswahl', () => {
    render(<KontoVerbrauchKarte section={{ ok: true, data: [lauf(1, 1)] }} />)
    expect(screen.getByLabelText('Monat')).toBeInTheDocument()
  })
})
