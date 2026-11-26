import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeaveRoundLink } from './leave-round-link'

describe('LeaveRoundLink (F6)', () => {
  it('geht ohne Antwort direkt zurück', () => {
    render(<LeaveRoundLink started={false} />)
    expect(screen.getByRole('link', { name: 'Runde verlassen' })).toHaveAttribute('href', '/subjects')
  })
  it('fragt nach, sobald Antworten gegeben wurden', () => {
    render(<LeaveRoundLink started />)
    fireEvent.click(screen.getByRole('button', { name: 'Runde verlassen' }))
    expect(screen.getByText('Runde abbrechen?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weiterspielen' })).toBeInTheDocument()
  })
})
