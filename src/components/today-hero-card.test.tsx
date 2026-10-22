import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TodayHeroCard } from './today-hero-card'

const base = { level: 3, levelPercent: 70, xpToNextLevel: 90, isMaxLevel: false }

describe('TodayHeroCard (PROJ-42)', () => {
  it('zeigt Tagesziel-Fortschritt und Weiterlernen mit Ziel', () => {
    render(
      <TodayHeroCard
        {...base}
        answeredToday={4}
        continueTarget={{ href: '/quiz?subject=s1&topic=t1', label: 'STG · Frachtvertrag' }}
      />,
    )
    expect(screen.getByText('4/10 Fragen')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Weiterlernen/ })).toHaveAttribute('href', '/quiz?subject=s1&topic=t1')
    expect(screen.getByText('STG · Frachtvertrag')).toBeInTheDocument()
    expect(screen.getByText('noch 90 XP → Lvl 4')).toBeInTheDocument()
  })

  it('ohne Ziel führt der Button zur Fächer-Auswahl', () => {
    render(<TodayHeroCard {...base} answeredToday={0} continueTarget={null} />)
    expect(screen.getByRole('link', { name: /Fach auswählen/ })).toHaveAttribute('href', '/subjects')
  })

  it('erreichtes Ziel zeigt den Erfolgszustand und den echten Wert', () => {
    render(<TodayHeroCard {...base} answeredToday={23} continueTarget={null} />)
    expect(screen.getByText('Geschafft! 🎉')).toBeInTheDocument()
    expect(screen.getByText('23/10')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10')
  })

  it('Max-Level ersetzt die XP-Angabe', () => {
    render(<TodayHeroCard {...base} isMaxLevel answeredToday={0} continueTarget={null} />)
    expect(screen.getByText('Max-Level erreicht')).toBeInTheDocument()
  })
})
