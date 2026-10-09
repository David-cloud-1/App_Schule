import { describe, it, expect } from 'vitest'
import {
  HOF_CATEGORIES,
  getHofIconSet,
  getHofIconsByCategory,
  resolveHofIcon,
  isHofCategory,
  iconKeyBelongsToCategory,
  hofCategoryLabel,
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

  it('TOUR set is empty — Tourismus has no shop catalog yet (PROJ-25)', () => {
    expect(getHofIconSet('TOUR')).toEqual([])
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
