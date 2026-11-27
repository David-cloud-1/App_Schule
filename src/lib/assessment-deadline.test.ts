import { describe, it, expect } from 'vitest'
import {
  endOfTodayInSchoolZone,
  fromSchoolInputValue,
  inOneHour,
  inOneWeek,
  quickDeadline,
  toSchoolInputValue,
} from './assessment-deadline'

describe('assessment-deadline (PROJ-133)', () => {
  it('heute 23:59 im Sommer (UTC+2)', () => {
    const now = new Date('2026-07-10T08:00:00Z')
    expect(endOfTodayInSchoolZone(now).toISOString()).toBe('2026-07-10T21:59:00.000Z')
  })

  it('heute 23:59 im Winter (UTC+1)', () => {
    const now = new Date('2026-11-27T10:00:00Z')
    expect(endOfTodayInSchoolZone(now).toISOString()).toBe('2026-11-27T22:59:00.000Z')
  })

  it('rechnet nach Mitternacht Schulzeit mit dem Schultag, nicht dem UTC-Tag', () => {
    // 23:30 UTC am 10.7. = 01:30 Schulzeit am 11.7.
    const now = new Date('2026-07-10T23:30:00Z')
    expect(endOfTodayInSchoolZone(now).toISOString()).toBe('2026-07-11T21:59:00.000Z')
  })

  it('am Tag der Umstellung auf Winterzeit (25.10.2026) gilt 23:59 mit UTC+1', () => {
    const now = new Date('2026-10-25T08:00:00Z')
    expect(endOfTodayInSchoolZone(now).toISOString()).toBe('2026-10-25T22:59:00.000Z')
  })

  it('am Tag der Umstellung auf Sommerzeit (29.3.2026) gilt 23:59 mit UTC+2', () => {
    const now = new Date('2026-03-29T08:00:00Z')
    expect(endOfTodayInSchoolZone(now).toISOString()).toBe('2026-03-29T21:59:00.000Z')
  })

  it('in 1 Stunde', () => {
    const now = new Date('2026-11-27T10:00:00Z')
    expect(inOneHour(now).toISOString()).toBe('2026-11-27T11:00:00.000Z')
  })

  it('in 1 Woche bleibt die Uhrzeit über die Zeitumstellung gleich', () => {
    // Mi 21.10.2026 12:00 Schulzeit (UTC+2) -> Mi 28.10.2026 12:00 Schulzeit (UTC+1)
    const now = new Date('2026-10-21T10:00:00Z')
    expect(inOneWeek(now).toISOString()).toBe('2026-10-28T11:00:00.000Z')
  })

  it('quickDeadline wählt die richtige Rechnung', () => {
    const now = new Date('2026-11-27T10:00:00Z')
    expect(quickDeadline('hour', now).getTime()).toBe(inOneHour(now).getTime())
    expect(quickDeadline('tonight', now).getTime()).toBe(endOfTodayInSchoolZone(now).getTime())
    expect(quickDeadline('week', now).getTime()).toBe(inOneWeek(now).getTime())
  })

  it('Eingabefeld-Wert hin und zurück', () => {
    const d = new Date('2026-07-10T21:59:00Z')
    expect(toSchoolInputValue(d)).toBe('2026-07-10T23:59')
    expect(fromSchoolInputValue('2026-07-10T23:59')?.toISOString()).toBe(d.toISOString())
    expect(fromSchoolInputValue('kaputt')).toBeNull()
  })
})
