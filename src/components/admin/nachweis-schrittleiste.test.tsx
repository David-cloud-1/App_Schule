import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NachweisSchrittleiste } from './nachweis-schrittleiste'
import { ablaufInfo } from '@/lib/nachweis-ablauf'

const NOW = new Date('2026-11-27T10:00:00Z')

describe('NachweisSchrittleiste (PROJ-134)', () => {
  it('zeigt vier Schritte, markiert den aktuellen und nennt den Satz', () => {
    const info = ablaufInfo({ status: 'closed', resultsReleasedAt: null, closesAt: null, inProgress: 0, now: NOW })
    render(<NachweisSchrittleiste info={info} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((i) => i.textContent?.replace(/\(.*?\)/g, '').replace(/\d/g, '').trim())).toEqual(['Entwurf', 'Offen', 'Geschlossen', 'Freigegeben'])
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Geschlossen: Ergebnisse prüfen, dann freigeben.')).toBeInTheDocument()
  })

  it('hakt bei „Freigegeben“ alle Schritte ab und hat keinen aktuellen', () => {
    const info = ablaufInfo({ status: 'closed', resultsReleasedAt: '2026-11-27T09:00:00Z', closesAt: null, inProgress: 0, now: NOW })
    render(<NachweisSchrittleiste info={info} />)
    expect(screen.getAllByRole('listitem').every((i) => !i.hasAttribute('aria-current'))).toBe(true)
    expect(screen.getAllByText('(erledigt)')).toHaveLength(4)
  })

  it('zeigt „Beitritt beendet, noch N schreiben“ und den Hinweis zum automatischen Schließen', () => {
    const open = ablaufInfo({ status: 'open', resultsReleasedAt: null, closesAt: '2026-11-27T09:00:00Z', inProgress: 2, now: NOW })
    const { rerender } = render(<NachweisSchrittleiste info={open} />)
    expect(screen.getByRole('status')).toHaveTextContent('Beitritt beendet, noch 2 schreiben')
    const closed = ablaufInfo({ status: 'closed', resultsReleasedAt: null, closesAt: null, inProgress: 0, now: NOW })
    rerender(<NachweisSchrittleiste info={closed} autoClosedText="Automatisch geschlossen (Beitritt abgelaufen) · Fr, 27.11., 10:00" />)
    expect(screen.getByText(/Automatisch geschlossen \(Beitritt abgelaufen\)/)).toBeInTheDocument()
  })
})
