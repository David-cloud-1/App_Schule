import { describe, it, expect } from 'vitest'
import {
  buildParticipantFocus,
  countsAsSwitch,
  isFocusDetectionSupported,
  formatFocusDuration,
  formatFocusSummary,
  validateFocusSettings,
} from './focus-tracking'

describe('validateFocusSettings', () => {
  it('accepts tracking without auto-submit', () => {
    expect(validateFocusSettings({ focusTracking: true, focusAutoSubmitAfter: null })).toBeNull()
  })
  it('accepts everything off', () => {
    expect(validateFocusSettings({ focusTracking: false, focusAutoSubmitAfter: null })).toBeNull()
  })
  it('accepts the boundaries 1 and 20', () => {
    expect(validateFocusSettings({ focusTracking: true, focusAutoSubmitAfter: 1 })).toBeNull()
    expect(validateFocusSettings({ focusTracking: true, focusAutoSubmitAfter: 20 })).toBeNull()
  })
  it('rejects auto-submit without tracking', () => {
    expect(validateFocusSettings({ focusTracking: false, focusAutoSubmitAfter: 3 })).toMatch(/protokolliert/)
  })
  it('rejects values outside 1-20 and non-integers', () => {
    expect(validateFocusSettings({ focusTracking: true, focusAutoSubmitAfter: 0 })).toMatch(/zwischen 1 und 20/)
    expect(validateFocusSettings({ focusTracking: true, focusAutoSubmitAfter: 21 })).toMatch(/zwischen 1 und 20/)
    expect(validateFocusSettings({ focusTracking: true, focusAutoSubmitAfter: 2.5 })).toMatch(/zwischen 1 und 20/)
  })
})

describe('countsAsSwitch', () => {
  it('ignores absences under 3 seconds and counts from 3 seconds', () => {
    expect(countsAsSwitch(0)).toBe(false)
    expect(countsAsSwitch(2)).toBe(false)
    expect(countsAsSwitch(3)).toBe(true)
    expect(countsAsSwitch(120)).toBe(true)
  })
})

describe('formatting', () => {
  it('formats durations as m:ss min', () => {
    expect(formatFocusDuration(102)).toBe('1:42 min')
    expect(formatFocusDuration(7)).toBe('0:07 min')
    expect(formatFocusDuration(3600)).toBe('60:00 min')
    expect(formatFocusDuration(-5)).toBe('0:00 min')
  })
  it('formats the list cell and shows a dash without switches', () => {
    expect(formatFocusSummary(3, 102)).toBe('3× · 1:42 min')
    expect(formatFocusSummary(0, 0)).toBe('—')
  })
})

describe('buildParticipantFocus', () => {
  const now = new Date('2026-10-08T10:00:00Z')

  it('is unremarkable without any data', () => {
    const f = buildParticipantFocus(undefined, [], now)
    expect(f).toMatchObject({ countedSwitches: 0, countedSeconds: 0, shortCount: 0, away: false, conspicuous: false, autoSubmitted: false })
  })

  it('takes the stored summary as is', () => {
    const f = buildParticipantFocus({ counted_switches: 2, counted_seconds: 90, short_count: 1, auto_submitted: true }, [], now)
    expect(f).toMatchObject({ countedSwitches: 2, countedSeconds: 90, shortCount: 1, conspicuous: true, autoSubmitted: true, away: false })
  })

  it('counts an open entry once it passed the tolerance', () => {
    const f = buildParticipantFocus(undefined, [{ left_at: '2026-10-08T09:59:30Z' }], now)
    expect(f).toMatchObject({ countedSwitches: 1, countedSeconds: 30, away: true, conspicuous: true })
  })

  it('treats a fresh open entry as short and not yet conspicuous', () => {
    const f = buildParticipantFocus(undefined, [{ left_at: '2026-10-08T09:59:58Z' }], now)
    expect(f).toMatchObject({ countedSwitches: 0, shortCount: 1, away: true, conspicuous: false })
  })

  it('adds open entries on top of the summary', () => {
    const f = buildParticipantFocus(
      { counted_switches: 1, counted_seconds: 10, short_count: 0, auto_submitted: false },
      [{ left_at: '2026-10-08T09:59:50Z' }],
      now,
    )
    expect(f).toMatchObject({ countedSwitches: 2, countedSeconds: 20 })
  })
})

describe('trackingUnavailable', () => {
  it('is false by default and taken from the summary when set', () => {
    expect(buildParticipantFocus(undefined, []).trackingUnavailable).toBe(false)
    const f = buildParticipantFocus(
      { counted_switches: 0, counted_seconds: 0, short_count: 0, auto_submitted: false, tracking_unavailable: true },
      [],
    )
    expect(f.trackingUnavailable).toBe(true)
    expect(f.conspicuous).toBe(false)
  })
})

describe('isFocusDetectionSupported', () => {
  it('is supported with visibility state or with hasFocus', () => {
    expect(isFocusDetectionSupported({ visibilityState: 'visible', hasFocus: () => true })).toBe(true)
    expect(isFocusDetectionSupported({ visibilityState: 'visible' } as never)).toBe(true)
    expect(isFocusDetectionSupported({ hasFocus: () => true } as never)).toBe(true)
  })
  it('is unsupported with neither, or without a document', () => {
    expect(isFocusDetectionSupported({} as never)).toBe(false)
    expect(isFocusDetectionSupported(undefined)).toBe(false)
  })
})

