import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HofRarityFrame, HofRarityLabel } from './hof-rarity-frame'

describe('HofRarityFrame (PROJ-32)', () => {
  it('leaves standard items completely unchanged (no extra classes)', () => {
    const { container } = render(
      <HofRarityFrame rarity="standard" className="w-14">
        x
      </HofRarityFrame>,
    )
    expect((container.firstChild as HTMLElement).className).toBe('w-14')
  })

  it('treats a missing rarity as standard', () => {
    const { container } = render(<HofRarityFrame className="w-14">x</HofRarityFrame>)
    expect((container.firstChild as HTMLElement).className).toBe('w-14')
  })

  it('gives rare items a glow ring and epic items additionally the one-time shimmer', () => {
    const rare = render(<HofRarityFrame rarity="selten">x</HofRarityFrame>).container.firstChild as HTMLElement
    expect(rare.className).toContain('ring-2')
    expect(rare.className).not.toContain('hof-shimmer')
    const epic = render(<HofRarityFrame rarity="episch">x</HofRarityFrame>).container.firstChild as HTMLElement
    expect(epic.className).toContain('ring-2')
    expect(epic.className).toContain('hof-shimmer')
  })

  it('shows a text label for rare and epic, nothing for standard (never colour only)', () => {
    const { container: std } = render(<HofRarityLabel rarity="standard" />)
    expect(std.textContent).toBe('')
    render(<HofRarityLabel rarity="selten" />)
    render(<HofRarityLabel rarity="episch" />)
    expect(screen.getByText('Selten')).toBeTruthy()
    expect(screen.getByText('Episch')).toBeTruthy()
  })
})
