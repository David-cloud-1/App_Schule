import { describe, it, expect } from 'vitest'
import {
  HOF_CATEGORIES,
  getHofIconSet,
  getHofIconsByCategory,
  resolveHofIcon,
  isHofCategory,
  iconKeyBelongsToCategory,
  hofCategoryLabel,
  getHofCategories,
} from './hof-icons'

describe('hof-icons (PROJ-26)', () => {
  it('SPED set has at least 5 illustrations per category (acceptance criterion)', () => {
    for (const cat of HOF_CATEGORIES) {
      expect(getHofIconsByCategory('SPED', cat.value).length).toBeGreaterThanOrEqual(5)
    }
  })

  it('every icon key in the SPED set is unique', () => {
    const keys = getHofIconSet('SPED').map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('unknown department codes fall back to an empty set, not an error', () => {
    expect(getHofIconSet('UNKNOWN')).toEqual([])
  })

  it('resolveHofIcon finds an icon by key within its department', () => {
    const icon = resolveHofIcon('SPED', 'sattelschlepper-rot')
    expect(icon?.category).toBe('fahrzeuge')
  })

  it('resolveHofIcon returns null for a missing or unknown key', () => {
    expect(resolveHofIcon('SPED', 'does-not-exist')).toBeNull()
    expect(resolveHofIcon('SPED', null)).toBeNull()
    expect(resolveHofIcon('SPED', undefined)).toBeNull()
  })

  it('resolveHofIcon returns null for a department without that icon (e.g. TOUR)', () => {
    expect(resolveHofIcon('TOUR', 'sattelschlepper-rot')).toBeNull()
  })

  it('isHofCategory accepts only the four fixed values', () => {
    expect(isHofCategory('fahrzeuge')).toBe(true)
    expect(isHofCategory('nicht_existent')).toBe(false)
  })

  it('iconKeyBelongsToCategory rejects a category/icon mismatch (server-side defense)', () => {
    expect(iconKeyBelongsToCategory('SPED', 'fahrzeuge', 'sattelschlepper-rot')).toBe(true)
    // 'hoftor' gehört zu 'gebaeude_deko', nicht zu 'fahrzeuge'.
    expect(iconKeyBelongsToCategory('SPED', 'fahrzeuge', 'hoftor')).toBe(false)
  })

  it('hofCategoryLabel returns the German label, falling back to the raw value', () => {
    expect(hofCategoryLabel('gebaeude_deko')).toBe('Gebäude & Hof-Deko')
    expect(hofCategoryLabel('unbekannt')).toBe('unbekannt')
  })
})

describe('hof-icons Tourismus-Set (PROJ-31)', () => {
  it('TOUR set has at least 20 illustrations and at least 5 per category', () => {
    expect(getHofIconSet('TOUR').length).toBeGreaterThanOrEqual(20)
    for (const cat of HOF_CATEGORIES) {
      expect(getHofIconsByCategory('TOUR', cat.value).length).toBeGreaterThanOrEqual(5)
    }
  })

  it('every icon key in the TOUR set is unique', () => {
    const keys = getHofIconSet('TOUR').map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('TOUR and SPED share no icon key (no ambiguous meaning across sets)', () => {
    const sped = new Set(getHofIconSet('SPED').map((i) => i.key))
    expect(getHofIconSet('TOUR').filter((i) => sped.has(i.key))).toEqual([])
  })

  it('every TOUR icon renders an SVG element with a viewBox', () => {
    for (const icon of getHofIconSet('TOUR')) {
      const el = icon.Svg({}) as { type: string; props: { viewBox?: string } }
      expect(el.type).toBe('svg')
      expect(el.props.viewBox).toBe('0 0 48 48')
    }
  })

  it('resolves a TOUR icon within TOUR but not within SPED', () => {
    expect(resolveHofIcon('TOUR', 'flugzeug')?.category).toBe('fahrzeuge')
    expect(resolveHofIcon('SPED', 'flugzeug')).toBeNull()
  })

  it('rejects a Spedition icon for a Tourismus item and vice versa (server-side defense)', () => {
    expect(iconKeyBelongsToCategory('TOUR', 'fahrzeuge', 'flugzeug')).toBe(true)
    expect(iconKeyBelongsToCategory('TOUR', 'fahrzeuge', 'sattelschlepper-rot')).toBe(false)
    expect(iconKeyBelongsToCategory('SPED', 'fahrzeuge', 'flugzeug')).toBe(false)
  })

  it('uses Tourismus category labels for TOUR but keeps the technical values', () => {
    const cats = getHofCategories('TOUR')
    expect(cats.map((c) => c.value)).toEqual(HOF_CATEGORIES.map((c) => c.value))
    expect(hofCategoryLabel('fahrzeuge', 'TOUR')).toBe('Verkehrsmittel')
    expect(hofCategoryLabel('gebaeude_deko', 'TOUR')).toBe('Hotels & Reise-Deko')
    expect(hofCategoryLabel('ladung_ausstattung', 'TOUR')).toBe('Reiseausstattung')
  })

  it('SPED and unknown departments keep the default labels (no regression)', () => {
    expect(hofCategoryLabel('fahrzeuge', 'SPED')).toBe('Fahrzeuge')
    expect(hofCategoryLabel('fahrzeuge')).toBe('Fahrzeuge')
    expect(getHofCategories('UNKNOWN')).toEqual(HOF_CATEGORIES)
  })
})
