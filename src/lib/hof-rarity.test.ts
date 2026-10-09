import { describe, it, expect } from 'vitest'
import {
  RARITY_THRESHOLDS,
  deriveRarity,
  getEffectiveRarity,
  hofRarityLabel,
  isHofRarity,
} from './hof-rarity'

describe('hof-rarity (PROJ-32)', () => {
  it('derives the rarity from the price at the documented thresholds', () => {
    expect(deriveRarity(1)).toBe('standard')
    expect(deriveRarity(RARITY_THRESHOLDS.selten - 1)).toBe('standard')
    expect(deriveRarity(RARITY_THRESHOLDS.selten)).toBe('selten')
    expect(deriveRarity(RARITY_THRESHOLDS.episch - 1)).toBe('selten')
    expect(deriveRarity(RARITY_THRESHOLDS.episch)).toBe('episch')
    expect(deriveRarity(100000)).toBe('episch')
  })

  it('gives every current catalogue price a sensible tier', () => {
    expect(deriveRarity(75)).toBe('standard') // Referenzitem bleibt Standard
    expect(deriveRarity(120)).toBe('selten')
    expect(deriveRarity(250)).toBe('episch')
    expect(deriveRarity(300)).toBe('episch')
  })

  it('an admin override wins over the price in both directions', () => {
    expect(getEffectiveRarity(30, 'episch')).toBe('episch')
    expect(getEffectiveRarity(300, 'standard')).toBe('standard')
  })

  it('falls back to the price when the override is empty or invalid', () => {
    expect(getEffectiveRarity(120, null)).toBe('selten')
    expect(getEffectiveRarity(120, undefined)).toBe('selten')
    expect(getEffectiveRarity(120, '')).toBe('selten')
    expect(getEffectiveRarity(120, 'legendaer')).toBe('selten')
  })

  it('follows a changed price automatically as long as no override is set', () => {
    expect(getEffectiveRarity(80, null)).toBe('standard')
    expect(getEffectiveRarity(260, null)).toBe('episch')
  })

  it('isHofRarity accepts only the three fixed values', () => {
    expect(isHofRarity('selten')).toBe(true)
    expect(isHofRarity('legendaer')).toBe(false)
    expect(isHofRarity(null)).toBe(false)
  })

  it('has German labels', () => {
    expect(hofRarityLabel('standard')).toBe('Standard')
    expect(hofRarityLabel('selten')).toBe('Selten')
    expect(hofRarityLabel('episch')).toBe('Episch')
  })
})
