import { describe, expect, it } from 'vitest'
import {
  ablaufInfo,
  beitrittInfo,
  erstellerName,
  formatBeitrittZeit,
  formatRestzeit,
  heute2359,
  parseBerlinEingabe,
  pruefeVerlaengern,
  verlaengerteZeit,
} from './nachweis-ablauf'

const NOW = new Date('2026-11-27T10:00:00Z')

describe('ablaufInfo', () => {
  it('ordnet Zustände den vier Schritten zu', () => {
    const base = { closesAt: null, inProgress: 0, now: NOW }
    expect(ablaufInfo({ ...base, status: 'draft', resultsReleasedAt: null }).step).toBe('entwurf')
    expect(ablaufInfo({ ...base, status: 'open', resultsReleasedAt: null }).step).toBe('offen')
    expect(ablaufInfo({ ...base, status: 'closed', resultsReleasedAt: null }).step).toBe('geschlossen')
    expect(ablaufInfo({ ...base, status: 'closed', resultsReleasedAt: '2026-11-27T09:00:00Z' }).step).toBe('freigegeben')
  })

  it('wählt die Hauptaktion je Schritt, bei „Freigegeben“ keine', () => {
    const base = { closesAt: null, inProgress: 0, now: NOW }
    expect(ablaufInfo({ ...base, status: 'draft', resultsReleasedAt: null }).primaryAction).toBe('open')
    expect(ablaufInfo({ ...base, status: 'open', resultsReleasedAt: null }).primaryAction).toBe('close')
    expect(ablaufInfo({ ...base, status: 'closed', resultsReleasedAt: null }).primaryAction).toBe('release_results')
    expect(ablaufInfo({ ...base, status: 'closed', resultsReleasedAt: 'x' }).primaryAction).toBeNull()
  })

  it('zeigt „Beitritt beendet, noch N schreiben“ nur bei abgelaufenem Beitritt', () => {
    const open = { status: 'open' as const, resultsReleasedAt: null, now: NOW }
    expect(ablaufInfo({ ...open, closesAt: '2026-11-27T09:00:00Z', inProgress: 3 }).joinEndedNote).toBe('Beitritt beendet, noch 3 schreiben')
    expect(ablaufInfo({ ...open, closesAt: '2026-11-27T11:00:00Z', inProgress: 3 }).joinEndedNote).toBeNull()
    expect(ablaufInfo({ ...open, closesAt: '2026-11-27T09:00:00Z', inProgress: 0 }).joinEndedNote).toBeNull()
  })
})

describe('Zeitangaben', () => {
  it('formatiert in der Schulzeitzone mit Wochentag und 24-Stunden-Zeit', () => {
    expect(formatBeitrittZeit('2026-11-26T22:59:00Z')).toBe('Do, 26.11., 23:59')
    // Sommerzeit: UTC+2
    expect(formatBeitrittZeit('2026-07-01T21:59:00Z')).toBe('Mi, 01.07., 23:59')
  })

  it('formatiert die Restzeit', () => {
    expect(formatRestzeit(80 * 60000)).toBe('1 Std. 20 Min.')
    expect(formatRestzeit(60 * 60000)).toBe('1 Std.')
    expect(formatRestzeit(45 * 60000)).toBe('45 Min.')
    expect(formatRestzeit(10000)).toBe('unter 1 Min.')
    expect(formatRestzeit((26 * 60) * 60000)).toBe('1 Tag 2 Std.')
  })

  it('beschreibt den Beitritt je Zustand', () => {
    const closesAt = '2026-11-27T11:20:00Z'
    expect(beitrittInfo({ status: 'draft', opensAt: null, closesAt, now: NOW }).state).toBe('Beitritt noch nicht geöffnet')
    const running = beitrittInfo({ status: 'open', opensAt: '2026-11-27T08:00:00Z', closesAt, now: NOW })
    expect(running.state).toBe('noch 1 Std. 20 Min.')
    expect(running.range).toBe('Beitritt ab Fr, 27.11., 09:00 · Beitritt bis Fr, 27.11., 12:20')
    expect(beitrittInfo({ status: 'open', opensAt: null, closesAt: '2026-11-27T09:00:00Z', now: NOW }).state).toBe('Beitritt beendet')
    expect(beitrittInfo({ status: 'closed', opensAt: null, closesAt, now: NOW }).phase).toBe('ended')
  })
})

describe('Verlängern', () => {
  it('rechnet „Heute 23:59“ in der Schulzeitzone, auch bei Sommer- und Winterzeit', () => {
    expect(heute2359(new Date('2026-11-27T10:00:00Z')).toISOString()).toBe('2026-11-27T22:59:00.000Z')
    expect(heute2359(new Date('2026-07-01T10:00:00Z')).toISOString()).toBe('2026-07-01T21:59:00.000Z')
    // Tag der Umstellung auf Winterzeit (25.10.2026): 23:59 gilt schon als UTC+1
    expect(heute2359(new Date('2026-10-25T10:00:00Z')).toISOString()).toBe('2026-10-25T22:59:00.000Z')
  })

  it('bietet Schnellwahlen', () => {
    const closes = '2026-11-27T11:00:00Z'
    expect(verlaengerteZeit(closes, '+30', NOW).toISOString()).toBe('2026-11-27T11:30:00.000Z')
    expect(verlaengerteZeit(closes, '+60', NOW).toISOString()).toBe('2026-11-27T12:00:00.000Z')
  })

  it('lässt nur echte Verlängerungen in der Zukunft zu', () => {
    const base = { status: 'open' as const, currentClosesAt: '2026-11-27T11:00:00Z', now: NOW }
    expect(pruefeVerlaengern({ ...base, newClosesAt: '2026-11-27T12:00:00Z' })).toBeNull()
    expect(pruefeVerlaengern({ ...base, newClosesAt: '2026-11-27T10:30:00Z' })).toMatch(/nach der bisherigen/)
    expect(pruefeVerlaengern({ ...base, currentClosesAt: '2026-11-27T09:00:00Z', newClosesAt: '2026-11-27T09:30:00Z' })).toMatch(/Zukunft/)
    expect(pruefeVerlaengern({ ...base, status: 'closed', autoClosedAt: '2026-11-27T09:05:00Z', newClosesAt: '2026-11-27T12:00:00Z' })).toMatch(/automatisch geschlossen/)
    expect(pruefeVerlaengern({ ...base, newClosesAt: 'kaputt' })).toMatch(/gültige Zeit/)
  })
})

describe('erstellerName', () => {
  it('nimmt Vor- und Nachname, sonst Anzeigename', () => {
    expect(erstellerName({ createdBy: 'u', firstName: 'Ada', lastName: 'Lovelace', profileFound: true })).toBe('Ada Lovelace')
    expect(erstellerName({ createdBy: 'u', displayName: 'Ada', profileFound: true })).toBe('Ada')
  })
  it('kennt gelöschte Konten und Altbestand', () => {
    expect(erstellerName({ createdBy: null, profileFound: false })).toBe('Ehemaliges Konto')
    expect(erstellerName({ createdBy: 'u', profileFound: false })).toBe('Ehemaliges Konto')
    expect(erstellerName({ createdBy: 'u', profileFound: true })).toBe('Unbekannt')
  })
})

describe('defensive Eingaben', () => {
  it('gibt bei kaputtem Datum einen Strich statt eines Fehlers', () => {
    expect(formatBeitrittZeit('')).toBe('–')
  })
})

describe('Eingabe in der Schulzeitzone (QA BUG-6)', () => {
  it('liest datetime-local als Schulzeit, nicht als Gerätezeit', () => {
    expect(parseBerlinEingabe('2026-11-28T23:59')!.toISOString()).toBe('2026-11-28T22:59:00.000Z')
    expect(parseBerlinEingabe('2026-07-01T23:59')!.toISOString()).toBe('2026-07-01T21:59:00.000Z')
  })
  it('lehnt Leeres und Kaputtes ab', () => {
    expect(parseBerlinEingabe('')).toBeNull()
    expect(parseBerlinEingabe('morgen')).toBeNull()
    expect(parseBerlinEingabe('2026-13-01T10:00')).toBeNull()
  })
})

describe('Entwurf mit abgelaufenem Beitritt (QA BUG-3)', () => {
  it('meldet „bitte verlängern“ statt „noch nicht geöffnet“', () => {
    const info = beitrittInfo({ status: 'draft', opensAt: null, closesAt: '2026-11-27T09:00:00Z', now: NOW })
    expect(info.phase).toBe('ended')
    expect(info.state).toMatch(/verlängern/)
  })
})
