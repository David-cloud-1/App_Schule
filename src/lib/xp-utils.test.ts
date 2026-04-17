import { describe, it, expect } from 'vitest'
import {
  MAX_LEVEL,
  getXpForLevel,
  getLevelFromXp,
  getXpWithinLevel,
  getXpCostOfLevel,
  getProgressPercent,
  getLevelColor,
} from './xp-utils'

describe('xp-utils', () => {
  // ── getXpForLevel ──────────────────────────────────────────────────────────
  describe('getXpForLevel', () => {
    it('returns 0 XP for level 1 (start)', () => {
      expect(getXpForLevel(1)).toBe(0)
    })

    it('returns 100 XP for level 2', () => {
      // 50 × 2 × 1 = 100
      expect(getXpForLevel(2)).toBe(100)
    })

    it('returns 300 XP for level 3', () => {
      // 50 × 3 × 2 = 300
      expect(getXpForLevel(3)).toBe(300)
    })

    it('returns 600 XP for level 4', () => {
      // 50 × 4 × 3 = 600
      expect(getXpForLevel(4)).toBe(600)
    })

    it('returns correct XP for max level (50)', () => {
      // 50 × 50 × 49 = 122500
      expect(getXpForLevel(50)).toBe(122500)
    })

    it('caps at MAX_LEVEL + 1 threshold (no overflow beyond 50)', () => {
      // level 51 should be treated as 51 by the formula but capped
      // The cap is MAX_LEVEL+1 = 51 for the formula, so getXpForLevel(51) = 50*51*50 = 127500
      // but getXpForLevel(100) should equal getXpForLevel(51)
      expect(getXpForLevel(51)).toBe(getXpForLevel(100))
    })
  })

  // ── getLevelFromXp ─────────────────────────────────────────────────────────
  describe('getLevelFromXp', () => {
    it('returns level 1 for 0 XP', () => {
      expect(getLevelFromXp(0)).toBe(1)
    })

    it('returns level 1 for 99 XP (below threshold)', () => {
      expect(getLevelFromXp(99)).toBe(1)
    })

    it('returns level 2 at exactly 100 XP', () => {
      expect(getLevelFromXp(100)).toBe(2)
    })

    it('returns level 2 for 101 XP', () => {
      expect(getLevelFromXp(101)).toBe(2)
    })

    it('returns level 2 for 299 XP (below level 3 threshold)', () => {
      expect(getLevelFromXp(299)).toBe(2)
    })

    it('returns level 3 at exactly 300 XP', () => {
      expect(getLevelFromXp(300)).toBe(3)
    })

    it('returns level 50 at exactly 122500 XP', () => {
      expect(getLevelFromXp(122500)).toBe(50)
    })

    it('caps at level 50 even with XP far beyond max', () => {
      expect(getLevelFromXp(999999)).toBe(50)
    })

    it('returns level 1 for negative XP (edge case)', () => {
      expect(getLevelFromXp(-100)).toBe(1)
    })
  })

  // ── getXpWithinLevel ───────────────────────────────────────────────────────
  describe('getXpWithinLevel', () => {
    it('returns 0 at start of level 1 (0 XP)', () => {
      expect(getXpWithinLevel(0)).toBe(0)
    })

    it('returns 50 when 50 XP into level 1', () => {
      expect(getXpWithinLevel(50)).toBe(50)
    })

    it('returns 0 at start of level 2 (100 XP)', () => {
      expect(getXpWithinLevel(100)).toBe(0)
    })

    it('returns 150 when 150 XP into level 2 (250 total)', () => {
      expect(getXpWithinLevel(250)).toBe(150)
    })

    it('returns 0 at start of level 3 (300 XP)', () => {
      expect(getXpWithinLevel(300)).toBe(0)
    })
  })

  // ── getXpCostOfLevel ───────────────────────────────────────────────────────
  describe('getXpCostOfLevel', () => {
    it('costs 100 XP to complete level 1 (1×100)', () => {
      expect(getXpCostOfLevel(1)).toBe(100)
    })

    it('costs 200 XP to complete level 2 (2×100)', () => {
      expect(getXpCostOfLevel(2)).toBe(200)
    })

    it('costs 500 XP to complete level 5 (5×100)', () => {
      expect(getXpCostOfLevel(5)).toBe(500)
    })

    it('costs 5000 XP to complete level 50 (50×100)', () => {
      expect(getXpCostOfLevel(50)).toBe(5000)
    })
  })

  // ── getProgressPercent ─────────────────────────────────────────────────────
  describe('getProgressPercent', () => {
    it('returns 0% at start of level 1', () => {
      expect(getProgressPercent(0)).toBe(0)
    })

    it('returns 50% at halfway through level 1', () => {
      // Level 1 costs 100 XP. 50 XP = 50%
      expect(getProgressPercent(50)).toBe(50)
    })

    it('returns 0% at start of level 2 (100 XP)', () => {
      expect(getProgressPercent(100)).toBe(0)
    })

    it('returns 75% at 150/200 XP into level 2 (250 total)', () => {
      expect(getProgressPercent(250)).toBe(75)
    })

    it('returns 100% at max level', () => {
      expect(getProgressPercent(122500)).toBe(100)
    })

    it('returns 100% when XP exceeds max level', () => {
      expect(getProgressPercent(999999)).toBe(100)
    })
  })

  // ── getLevelColor ──────────────────────────────────────────────────────────
  describe('getLevelColor', () => {
    it('returns green for level 1–9', () => {
      const color = getLevelColor(1)
      expect(color).toContain('#58CC02')
    })

    it('returns green for level 9 (boundary)', () => {
      expect(getLevelColor(9)).toContain('#58CC02')
    })

    it('returns orange for level 10', () => {
      expect(getLevelColor(10)).toContain('#FF9600')
    })

    it('returns orange for level 24 (boundary)', () => {
      expect(getLevelColor(24)).toContain('#FF9600')
    })

    it('returns blue for level 25', () => {
      expect(getLevelColor(25)).toContain('#1CB0F6')
    })

    it('returns blue for level 39 (boundary)', () => {
      expect(getLevelColor(39)).toContain('#1CB0F6')
    })

    it('returns gold for level 40', () => {
      expect(getLevelColor(40)).toContain('#FFD700')
    })

    it('returns gold for level 50 (max)', () => {
      expect(getLevelColor(50)).toContain('#FFD700')
    })
  })

  // ── Integration: level-up XP milestones ───────────────────────────────────
  describe('level-up boundary integration', () => {
    it('correctly detects level-up from 1 to 2 at 100 XP', () => {
      expect(getLevelFromXp(99)).toBe(1)
      expect(getLevelFromXp(100)).toBe(2)
    })

    it('correctly detects level-up from 2 to 3 at 300 XP', () => {
      expect(getLevelFromXp(299)).toBe(2)
      expect(getLevelFromXp(300)).toBe(3)
    })

    it('correctly detects level-up from 9 to 10 at 4500 XP', () => {
      // getXpForLevel(10) = 50*10*9 = 4500
      expect(getLevelFromXp(4499)).toBe(9)
      expect(getLevelFromXp(4500)).toBe(10)
    })

    it('MAX_LEVEL constant is 50', () => {
      expect(MAX_LEVEL).toBe(50)
    })
  })
})
