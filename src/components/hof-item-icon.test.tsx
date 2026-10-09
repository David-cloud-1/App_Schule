import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HofItemIcon } from './hof-item-icon'

describe('HofItemIcon (PROJ-26/PROJ-34)', () => {
  it('prefers the isometric sprite when the department has one for this key', () => {
    const { container } = render(<HofItemIcon departmentCode="SPED" iconKey="pokal" name="Pokal" isoClassName="w-20 h-16" />)
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')!.startsWith('data:image/svg+xml,')).toBe(true)
    expect(img.getAttribute('alt')).toBe('Pokal')
    expect(img.className).toContain('w-20')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('shows the Tourismus sprite for Tourismus keys (PROJ-35)', () => {
    const { container } = render(<HofItemIcon departmentCode="TOUR" iconKey="flugzeug" name="Flugzeug" />)
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('shows a generic icon for a department without any sprites or flat set', () => {
    const { container } = render(<HofItemIcon departmentCode="UNBEKANNT" iconKey="flugzeug" name="Flugzeug" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('falls back to the legacy emoji, then to a generic icon', () => {
    const emoji = render(<HofItemIcon departmentCode="SPED" iconKey="gibt-es-nicht" legacyIcon="🎒" name="Alt" />)
    expect(emoji.container.textContent).toBe('🎒')
    emoji.unmount()
    const leer = render(<HofItemIcon departmentCode="SPED" iconKey="" name="Nichts" />)
    expect(leer.container.querySelector('svg')).not.toBeNull()
  })

  it('uses the flat size for the sprite when no iso size is given', () => {
    const { container } = render(<HofItemIcon departmentCode="SPED" iconKey="pokal" name="Pokal" svgClassName="w-10 h-10" />)
    expect(container.querySelector('img')!.className).toContain('w-10')
  })
})
