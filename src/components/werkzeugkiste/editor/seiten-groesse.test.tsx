import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeitenGroesse } from './editor-vorschau'

describe('Platzanzeige der Seite (PROJ-92)', () => {
  it('zeigt Größe in MB von 8 MB', () => {
    render(<SeitenGroesse bytes={3_200_000} />)
    expect(screen.getByRole('status')).toHaveTextContent('Seite: 3,2 MB von 8 MB')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
  })

  it('färbt ab 80 % orange und ab 100 % rot und begrenzt den Balken', () => {
    const { container, rerender } = render(<SeitenGroesse bytes={6_400_000} />)
    expect(container.firstElementChild?.className).toContain('text-ws-orange')
    rerender(<SeitenGroesse bytes={9_000_000} />)
    expect(container.firstElementChild?.className).toContain('text-ws-red')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(container.firstElementChild).toHaveAttribute('title', expect.stringContaining('zu groß'))
  })
})
