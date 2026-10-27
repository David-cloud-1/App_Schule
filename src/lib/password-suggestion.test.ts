import { describe, it, expect } from 'vitest'
import { PASSWORD_MIN_LENGTH, PASSWORD_WORDS, suggestPassword } from './password-suggestion'

describe('suggestPassword (PROJ-58)', () => {
  it('hat das Format Wort-Wort-Wort-Zahl', () => {
    for (let i = 0; i < 200; i++) {
      expect(suggestPassword()).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-[A-Z][a-z]+-[2-9]{2}$/)
    }
  })

  it('nutzt drei verschiedene Wörter aus der Liste', () => {
    for (let i = 0; i < 200; i++) {
      const parts = suggestPassword().split('-')
      const words = parts.slice(0, 3)
      expect(new Set(words).size).toBe(3)
      for (const w of words) expect(PASSWORD_WORDS).toContain(w)
    }
  })

  it('enthält keine verwechselbaren Zeichen (0/O, 1/l/I) und keine Umlaute', () => {
    for (const w of PASSWORD_WORDS) expect(w).not.toMatch(/[0O1lIäöüÄÖÜß]/)
  })

  it('Wortliste ohne Dubletten und groß genug', () => {
    expect(new Set(PASSWORD_WORDS).size).toBe(PASSWORD_WORDS.length)
    expect(PASSWORD_WORDS.length).toBeGreaterThanOrEqual(60)
  })

  it('ist immer lang genug und streut', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const p = suggestPassword()
      expect(p.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH)
      seen.add(p)
    }
    expect(seen.size).toBeGreaterThan(95)
  })
})
