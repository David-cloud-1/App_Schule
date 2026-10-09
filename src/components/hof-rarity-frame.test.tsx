import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HofRarityFrame, HofRarityLabel } from './hof-rarity-frame'
import { HofItemTile, type OwnedHofItem } from './hof-item-tile'
import { HofSceneTourismus } from './hof-scene-tourismus'
import { HofSceneDefault } from './hof-scene-default'

const item = (over: Partial<OwnedHofItem> & { id: string }): OwnedHofItem => ({
  name: 'Item',
  description: '',
  category: 'fahrzeuge',
  icon_key: '',
  ...over,
})

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

  it('the shared tile shows the label and frame for an epic owned item', () => {
    const { container } = render(
      <HofItemTile item={item({ id: '1', name: 'Pokal', rarity: 'episch', icon_key: 'pokal' })} departmentCode="SPED" />,
    )
    expect(container.querySelector('[data-rarity="episch"]')).not.toBeNull()
    expect(screen.getByText('Episch')).toBeTruthy()
  })

  it('both scenes render the same rarity treatment', () => {
    const items = [item({ id: '1', name: 'Rare', rarity: 'selten' })]
    const a = render(<HofSceneTourismus departmentCode="TOUR" items={items} />)
    expect(a.container.querySelector('[data-rarity="selten"]')).not.toBeNull()
    a.unmount()
    const b = render(<HofSceneDefault departmentCode="SPED" items={items} />)
    expect(b.container.querySelector('[data-rarity="selten"]')).not.toBeNull()
  })

  it('an owned item without rarity (older API response) renders as standard', () => {
    const { container } = render(<HofItemTile item={item({ id: '1', name: 'Alt' })} departmentCode="SPED" />)
    expect(container.querySelector('[data-rarity="standard"]')).not.toBeNull()
    expect(screen.queryByText('Selten')).toBeNull()
    expect(screen.queryByText('Episch')).toBeNull()
  })
})
