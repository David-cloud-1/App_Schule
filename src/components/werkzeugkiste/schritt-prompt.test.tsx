import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SchrittPrompt } from './schritt-prompt'
import { AIS_CHAT_URL } from '@/lib/werkzeugkiste-texte'

describe('Schritt 3 mit Bayerncloud-KI-Link', () => {
  it('zeigt einen Link zur Bayerncloud KI, der in einem neuen Tab öffnet', () => {
    render(<SchrittPrompt prompt="Mach daraus ein Arbeitsblatt." />)
    const link = screen.getByRole('link', { name: /Bayerncloud KI öffnen/ })
    expect(link).toHaveAttribute('href', AIS_CHAT_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('nennt die Bayerncloud KI im ersten Kurzschritt', () => {
    render(<SchrittPrompt prompt="x" />)
    expect(screen.getByText(/Öffne die Bayerncloud KI/)).toBeInTheDocument()
  })
})
