import { describe, it, expect } from 'vitest'
import {
  buildCurrentWeek,
  buildLast7Days,
  continueHref,
  countAnsweredToday,
  pickContinueTarget,
  toBerlinDateStr,
} from './home-today'

describe('toBerlinDateStr', () => {
  it('wechselt um Mitternacht deutscher Zeit, nicht UTC', () => {
    // 22:30 UTC am 21.10. = 00:30 am 22.10. in Berlin (Sommerzeit)
    expect(toBerlinDateStr(new Date('2026-10-21T22:30:00Z'))).toBe('2026-10-22')
  })
})

describe('buildCurrentWeek', () => {
  // Donnerstag, 22.10.2026, 10 Uhr Berlin
  const now = new Date('2026-10-22T08:00:00Z')

  it('läuft von Montag bis Sonntag', () => {
    const week = buildCurrentWeek(now, new Set())
    expect(week.map((d) => d.label)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
    expect(week[0].dateStr).toBe('2026-10-19')
    expect(week[6].dateStr).toBe('2026-10-25')
  })

  it('markiert heute, künftige Tage und Lerntage', () => {
    const week = buildCurrentWeek(now, new Set(['2026-10-20', '2026-10-22']))
    expect(week.find((d) => d.isToday)?.label).toBe('Do')
    expect(week.filter((d) => d.isFuture).map((d) => d.label)).toEqual(['Fr', 'Sa', 'So'])
    expect(week.filter((d) => d.learned).map((d) => d.label)).toEqual(['Di', 'Do'])
  })

  it('am Sonntag ist Montag der Vortag-Wochenanfang', () => {
    const week = buildCurrentWeek(new Date('2026-10-25T10:00:00Z'), new Set())
    expect(week[0].dateStr).toBe('2026-10-19')
    expect(week[6].isToday).toBe(true)
  })

  it('über die Zeitumstellung (25.10.) bleiben es 7 verschiedene Tage', () => {
    const week = buildCurrentWeek(new Date('2026-10-27T10:00:00Z'), new Set())
    expect(new Set(week.map((d) => d.dateStr)).size).toBe(7)
    expect(week[0].dateStr).toBe('2026-10-26')
  })
})

describe('buildLast7Days', () => {
  it('endet heute und reicht 6 Tage zurück', () => {
    const days = buildLast7Days(new Date('2026-10-22T08:00:00Z'), new Set(['2026-10-16']))
    expect(days[0].dateStr).toBe('2026-10-16')
    expect(days[0].learned).toBe(true)
    expect(days[6].dateStr).toBe('2026-10-22')
    expect(days[6].isToday).toBe(true)
  })
})

describe('countAnsweredToday', () => {
  it('zählt nur Antworten des heutigen Berliner Tags', () => {
    const now = new Date('2026-10-22T08:00:00Z')
    const answers = [
      { answered_at: '2026-10-21T21:59:00Z' }, // 23:59 Berlin am Vortag
      { answered_at: '2026-10-21T22:01:00Z' }, // 00:01 Berlin heute
      { answered_at: '2026-10-22T07:00:00Z' },
    ]
    expect(countAnsweredToday(answers, now)).toBe(2)
  })
})

describe('pickContinueTarget', () => {
  const subjects = [
    { id: 's1', code: 'STG' },
    { id: 's2', code: 'BGP' },
  ]

  it('ohne letzte Runde gibt es kein Ziel', () => {
    expect(pickContinueTarget(null, [], subjects)).toBeNull()
  })

  it('Fach außerhalb des Bereichs ergibt kein Ziel', () => {
    expect(pickContinueTarget('fremd', ['t1'], subjects)).toBeNull()
  })

  it('alle Fragen aus einem Thema → Themen-Runde', () => {
    expect(pickContinueTarget('s1', ['t1', 't1', 't1'], subjects)).toEqual({
      subjectId: 's1',
      subjectCode: 'STG',
      topicId: 't1',
    })
  })

  it('gemischte Themen → ganzes Fach', () => {
    expect(pickContinueTarget('s1', ['t1', 't2'], subjects)?.topicId).toBeNull()
  })

  it('Fragen ohne Thema → ganzes Fach', () => {
    expect(pickContinueTarget('s2', [null, null], subjects)?.topicId).toBeNull()
  })
})

describe('continueHref', () => {
  it('baut die Quiz-Adresse mit und ohne Thema', () => {
    expect(continueHref({ subjectId: 's1', subjectCode: 'STG', topicId: null })).toBe('/quiz?subject=s1')
    expect(continueHref({ subjectId: 's1', subjectCode: 'STG', topicId: 't1' })).toBe('/quiz?subject=s1&topic=t1')
  })
})
