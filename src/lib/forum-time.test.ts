import { describe, it, expect } from 'vitest'
import { formatFullDateTime, formatRelativeTime } from './forum-time'

const NOW = new Date('2026-10-29T12:00:00Z').getTime()
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const MIN = 60_000
const H = 60 * MIN
const D = 24 * H

describe('formatRelativeTime', () => {
  it('sagt „gerade eben“ unter einer Minute und bei Zeitstempeln aus der Zukunft', () => {
    expect(formatRelativeTime(ago(5_000), NOW)).toBe('gerade eben')
    expect(formatRelativeTime(ago(-30_000), NOW)).toBe('gerade eben')
  })

  it('zählt Minuten, Stunden und Tage', () => {
    expect(formatRelativeTime(ago(5 * MIN), NOW)).toBe('vor 5 Min.')
    expect(formatRelativeTime(ago(59 * MIN), NOW)).toBe('vor 59 Min.')
    expect(formatRelativeTime(ago(2 * H), NOW)).toBe('vor 2 Std.')
    expect(formatRelativeTime(ago(23 * H), NOW)).toBe('vor 23 Std.')
    expect(formatRelativeTime(ago(1 * D + H), NOW)).toBe('gestern')
    expect(formatRelativeTime(ago(3 * D), NOW)).toBe('vor 3 Tagen')
  })

  it('zeigt ab einer Woche das Datum', () => {
    expect(formatRelativeTime('2026-10-01T10:00:00Z', NOW)).toBe('01.10.2026')
  })

  it('gibt bei ungültigem Datum nichts aus', () => {
    expect(formatRelativeTime('kein-datum', NOW)).toBe('')
    expect(formatFullDateTime('kein-datum')).toBe('')
  })
})
