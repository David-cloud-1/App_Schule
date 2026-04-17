/**
 * XP & Level System utilities (PROJ-4)
 *
 * Level formula: level n requires 50 × n × (n−1) total XP
 *   Level 1 =    0 XP
 *   Level 2 =  100 XP  (costs 100 XP)
 *   Level 3 =  300 XP  (costs 200 XP)
 *   Level 4 =  600 XP  (costs 300 XP)
 *   Level n = 50 × n × (n−1) XP
 */

export const MAX_LEVEL = 50

/** Total XP required to *reach* level n (1-indexed). */
export function getXpForLevel(level: number): number {
  const n = Math.min(level, MAX_LEVEL + 1)
  return 50 * n * (n - 1)
}

/** Current level for a given total XP amount. Minimum 1, maximum MAX_LEVEL. */
export function getLevelFromXp(totalXp: number): number {
  let level = 1
  while (level < MAX_LEVEL && getXpForLevel(level + 1) <= totalXp) {
    level++
  }
  return level
}

/** XP earned within the current level (0 to cost-of-level). */
export function getXpWithinLevel(totalXp: number): number {
  const level = getLevelFromXp(totalXp)
  return totalXp - getXpForLevel(level)
}

/** XP cost to complete the current level (distance to next level). */
export function getXpCostOfLevel(level: number): number {
  return level * 100
}

/**
 * Progress toward the next level as a value between 0 and 100 (percentage).
 * At MAX_LEVEL this returns 100.
 */
export function getProgressPercent(totalXp: number): number {
  const level = getLevelFromXp(totalXp)
  if (level >= MAX_LEVEL) return 100
  const within = getXpWithinLevel(totalXp)
  const cost = getXpCostOfLevel(level)
  return Math.round((within / cost) * 100)
}

/** Colour class for a level badge based on tier. */
export function getLevelColor(level: number): string {
  if (level >= 40) return 'text-[#FFD700] bg-[#FFD700]/15 border-[#FFD700]/40' // Gold
  if (level >= 25) return 'text-[#1CB0F6] bg-[#1CB0F6]/15 border-[#1CB0F6]/40' // Blue
  if (level >= 10) return 'text-[#FF9600] bg-[#FF9600]/15 border-[#FF9600]/40' // Orange
  return 'text-[#58CC02] bg-[#58CC02]/15 border-[#58CC02]/40' // Green
}
