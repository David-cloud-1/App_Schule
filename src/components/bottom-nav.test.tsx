import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from './bottom-nav'

let mockPath = '/'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

describe('BottomNav (PROJ-41)', () => {
  it('zeigt fünf Einträge und markiert den aktiven', () => {
    mockPath = '/'
    render(<BottomNav hatBetrieb betriebLabel="Betrieb" />)
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
    expect(nav.querySelectorAll('a')).toHaveLength(5)
    expect(screen.getByRole('link', { name: 'Heute' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Lernen' })).not.toHaveAttribute('aria-current')
  })

  it('der Shop gehört zum Betrieb-Tab', () => {
    mockPath = '/shop'
    render(<BottomNav hatBetrieb betriebLabel="Resort" />)
    const betrieb = screen.getByRole('link', { name: 'Resort' })
    expect(betrieb).toHaveAttribute('href', '/betrieb')
    expect(betrieb).toHaveAttribute('aria-current', 'page')
  })

  it('ohne Betrieb führt der Eintrag zum Shop', () => {
    mockPath = '/'
    render(<BottomNav hatBetrieb={false} betriebLabel="Shop" />)
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/shop')
  })

  it('erscheint nicht im laufenden Quiz', () => {
    mockPath = '/quiz'
    render(<BottomNav hatBetrieb betriebLabel="Betrieb" />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
