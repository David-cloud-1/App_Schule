import { describe, it, expect } from 'vitest'
import { activeStreak } from './streak'

const now = new Date('2026-11-26T12:00:00Z') // Donnerstag

describe('activeStreak', () => {
  it('gilt, wenn heute oder gestern gelernt wurde', () => {
    expect(activeStreak(5, '2026-11-26', now)).toBe(5)
    expect(activeStreak(5, '2026-11-25', now)).toBe(5)
  })
  it('ist 0, wenn die letzte Runde länger her ist', () => {
    expect(activeStreak(1, '2026-11-23', now)).toBe(0)
    expect(activeStreak(30, '2026-07-27', now)).toBe(0)
  })
  it('rechnet in deutscher Zeit: kurz nach Mitternacht ist schon der neue Tag', () => {
    expect(activeStreak(3, '2026-11-25', new Date('2026-11-26T23:30:00Z'))).toBe(0)
  })
  it('ist 0 ohne Datum oder Wert', () => {
    expect(activeStreak(3, null, now)).toBe(0)
    expect(activeStreak(null, '2026-11-26', now)).toBe(0)
  })
})
