import { describe, expect, it } from 'vitest'
import {
  aggregateSubjectStats,
  berlinDateStr,
  buildActivityStrip,
  displayNameSchema,
  isUserSectionKey,
  resetConfirmationMatches,
  resetConfirmLabel,
  userActionLabel,
} from './user-detail'

describe('displayNameSchema', () => {
  it('trimmt und akzeptiert normale Namen', () => {
    expect(displayNameSchema.parse('  Anna Beispiel  ')).toBe('Anna Beispiel')
  })

  it('lehnt zu kurze, zu lange und leere Namen ab', () => {
    expect(displayNameSchema.safeParse('A').success).toBe(false)
    expect(displayNameSchema.safeParse('   ').success).toBe(false)
    expect(displayNameSchema.safeParse('x'.repeat(51)).success).toBe(false)
    expect(displayNameSchema.safeParse('x'.repeat(50)).success).toBe(true)
  })

  it('lehnt Zeilenumbrüche und Steuerzeichen ab', () => {
    expect(displayNameSchema.safeParse('Anna\nBeispiel').success).toBe(false)
    expect(displayNameSchema.safeParse('Anna\u0000').success).toBe(false)
  })
})

describe('buildActivityStrip', () => {
  const now = new Date('2026-11-02T10:00:00Z')

  it('liefert 30 Tage, heute zuletzt', () => {
    const strip = buildActivityStrip([], now)
    expect(strip).toHaveLength(30)
    expect(strip[29].date).toBe(berlinDateStr(now))
    expect(strip[0].date).toBe('2026-10-04')
    expect(strip.every((d) => !d.learned)).toBe(true)
  })

  it('markiert gelernte Tage und ignoriert Tage außerhalb des Fensters', () => {
    const strip = buildActivityStrip(['2026-11-02', '2026-10-30', '2026-01-01'], now)
    expect(strip.filter((d) => d.learned).map((d) => d.date)).toEqual(['2026-10-30', '2026-11-02'])
  })
})

describe('aggregateSubjectStats', () => {
  const names = new Map([
    ['s1', 'BGP'],
    ['s2', 'KSK'],
  ])

  it('fasst Sessions je Fach zusammen und rundet die Quote', () => {
    const stats = aggregateSubjectStats(
      [
        { subject_id: 's1', score: 4, total: 5, completed_at: '2026-10-01T10:00:00Z' },
        { subject_id: 's1', score: 2, total: 5, completed_at: '2026-10-03T10:00:00Z' },
        { subject_id: 's2', score: 1, total: 3, completed_at: '2026-10-02T10:00:00Z' },
      ],
      names,
    )
    expect(stats[0]).toMatchObject({
      name: 'BGP',
      answered: 10,
      correct: 6,
      percent: 60,
      lastLearnedAt: '2026-10-03T10:00:00Z',
    })
    expect(stats[1]).toMatchObject({ name: 'KSK', answered: 3, percent: 33 })
  })

  it('führt Sessions ohne Fach unter „Gemischt“ und blendet Fächer ohne Antworten aus', () => {
    const stats = aggregateSubjectStats(
      [
        { subject_id: null, score: 3, total: 4, completed_at: '2026-10-01T10:00:00Z' },
        { subject_id: 's2', score: 0, total: 0, completed_at: '2026-10-02T10:00:00Z' },
      ],
      names,
    )
    expect(stats).toHaveLength(1)
    expect(stats[0].name).toBe('Gemischt')
  })

  it('gibt bei keiner Aktivität eine leere Liste', () => {
    expect(aggregateSubjectStats([], names)).toEqual([])
  })
})

describe('Bestätigung beim Zurücksetzen', () => {
  it('nimmt den Anzeigenamen, sonst die E-Mail', () => {
    expect(resetConfirmLabel('Anna', 'a@x.de')).toBe('Anna')
    expect(resetConfirmLabel(null, 'a@x.de')).toBe('a@x.de')
    expect(resetConfirmLabel('  ', null)).toBe('')
  })

  it('verlangt genau den Namen (Leerraum außen egal)', () => {
    expect(resetConfirmationMatches(' Anna ', 'Anna')).toBe(true)
    expect(resetConfirmationMatches('anna', 'Anna')).toBe(false)
    expect(resetConfirmationMatches('', '')).toBe(false)
    expect(resetConfirmationMatches(undefined, 'Anna')).toBe(false)
  })
})

describe('Beschriftungen und Abschnitte', () => {
  it('kennt die neuen Protokoll-Einträge und fällt sonst auf den Schlüssel zurück', () => {
    expect(userActionLabel('user.rename')).toBe('Name geändert')
    expect(userActionLabel('user.progress_reset')).toBe('Fortschritt zurückgesetzt')
    expect(userActionLabel('foo.bar')).toBe('foo.bar')
  })

  it('erkennt gültige Abschnitte', () => {
    expect(isUserSectionKey('learning')).toBe(true)
    expect(isUserSectionKey('passwords')).toBe(false)
  })
})
