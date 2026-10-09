import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HofSceneTourismus } from './hof-scene-tourismus'
import { HofSceneDefault } from './hof-scene-default'
import type { OwnedHofItem } from './hof-item-tile'

const item = (over: Partial<OwnedHofItem> & { id: string }): OwnedHofItem => ({
  name: 'Item',
  description: '',
  category: 'fahrzeuge',
  icon_key: '',
  ...over,
})

describe('HofSceneTourismus (PROJ-31)', () => {
  it('shows only zones that contain items and uses Tourismus category names', () => {
    render(
      <HofSceneTourismus
        departmentCode="TOUR"
        items={[
          item({ id: '1', name: 'Flugzeug', category: 'fahrzeuge', icon_key: 'flugzeug' }),
          item({ id: '2', name: 'Weltreise-Pokal', category: 'abzeichen_trophaeen', icon_key: 'weltreise-pokal' }),
        ]}
      />,
    )
    expect(screen.getByText('Verkehrsmittel')).toBeTruthy()
    expect(screen.getByText('Abzeichen & Trophäen')).toBeTruthy()
    expect(screen.queryByText('Hotels & Reise-Deko')).toBeNull()
    expect(screen.queryByText('Reiseausstattung')).toBeNull()
  })

  it('renders the item illustration labelled with its name', () => {
    render(
      <HofSceneTourismus
        departmentCode="TOUR"
        items={[item({ id: '1', name: 'Flugzeug', category: 'fahrzeuge', icon_key: 'flugzeug' })]}
      />,
    )
    expect(screen.getByLabelText('Flugzeug').tagName.toLowerCase()).toBe('svg')
  })

  it('falls back to the legacy emoji when an icon key cannot be resolved', () => {
    render(
      <HofSceneTourismus
        departmentCode="TOUR"
        items={[item({ id: '1', name: 'Altes Item', icon_key: 'gibt-es-nicht', icon: '🎒' })]}
      />,
    )
    expect(screen.getByLabelText('Altes Item').textContent).toBe('🎒')
  })

  it('renders many items in one zone without dropping any', () => {
    const many = Array.from({ length: 20 }, (_, i) => item({ id: String(i), name: `Bus ${i}`, icon_key: 'reisebus' }))
    const { container } = render(<HofSceneTourismus departmentCode="TOUR" items={many} />)
    expect(container.querySelectorAll('svg[role="img"]').length).toBe(20)
  })
})

describe('HofSceneDefault (Spedition, no regression)', () => {
  it('keeps the Spedition category names', () => {
    render(
      <HofSceneDefault
        departmentCode="SPED"
        items={[item({ id: '1', name: 'Lkw', category: 'fahrzeuge', icon_key: 'sattelschlepper-rot' })]}
      />,
    )
    expect(screen.getByText('Fahrzeuge')).toBeTruthy()
    expect(screen.queryByText('Verkehrsmittel')).toBeNull()
  })
})
