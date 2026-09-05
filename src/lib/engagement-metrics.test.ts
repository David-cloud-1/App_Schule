import { describe, it, expect } from 'vitest'
import {
  analyzeEngagement,
  berlinDay,
  berlinHour,
  type EngagementInput,
  type ProfileRow,
  type SessionRow,
  type AnswerRow,
} from './engagement-metrics'

const NOW = new Date('2026-09-04T12:00:00Z')

/** Datum n Tage vor dem Referenzzeitpunkt, als ISO-Zeitstempel am Mittag. */
function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString()
}

function profile(id: string, over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id,
    role: 'student',
    created_at: daysAgo(60),
    current_streak: 0,
    longest_streak: 0,
    total_xp: 0,
    last_session_date: null,
    leaderboard_opt_out: false,
    ...over,
  }
}

function session(user: string, ago: number, over: Partial<SessionRow> = {}): SessionRow {
  return { user_id: user, subject_id: 's1', score: 8, total: 10, completed_at: daysAgo(ago), ...over }
}

function answers(user: string, sessionId: string, correct: number, wrong: number): AnswerRow[] {
  return [
    ...Array.from({ length: correct }, () => ({
      user_id: user,
      session_id: sessionId,
      is_correct: true,
      answered_at: daysAgo(1),
    })),
    ...Array.from({ length: wrong }, () => ({
      user_id: user,
      session_id: sessionId,
      is_correct: false,
      answered_at: daysAgo(1),
    })),
  ]
}

function input(over: Partial<EngagementInput> = {}): EngagementInput {
  return {
    profiles: [],
    sessions: [],
    answers: [],
    badges: [],
    userBadges: [],
    examSessions: [],
    subjects: [],
    now: NOW,
    ...over,
  }
}

function metric(report: ReturnType<typeof analyzeEngagement>, key: string) {
  const m = report.metrics.find((x) => x.key === key)
  if (!m) throw new Error(`Kennzahl ${key} fehlt`)
  return m
}

describe('berlinDay', () => {
  it('schiebt Zeitstempel kurz vor Mitternacht UTC auf den Berliner Folgetag', () => {
    // 22:30 UTC im Sommer = 00:30 Berlin am nächsten Tag — sonst zählte die
    // Abendrunde auf den falschen Streak-Tag.
    expect(berlinDay('2026-07-01T22:30:00Z')).toBe('2026-07-02')
    expect(berlinDay('2026-07-01T21:00:00Z')).toBe('2026-07-01')
  })

  it('rechnet im Winter mit einer Stunde Versatz', () => {
    expect(berlinDay('2026-01-01T23:30:00Z')).toBe('2026-01-02')
    expect(berlinHour('2026-01-01T18:00:00Z')).toBe(19)
  })
})

describe('Aktivierung', () => {
  it('zählt nur Profile mit mindestens einer abgeschlossenen Session', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('a'), profile('b'), profile('c'), profile('d')],
        sessions: [session('a', 3), session('b', 2)],
      })
    )
    expect(metric(r, 'activation').hits).toBe(2)
    expect(metric(r, 'activation').base).toBe(4)
  })

  it('ignoriert Sessions von Nutzern, die nicht in der Profilliste stehen', () => {
    // Wichtig für --nur-schueler: gefilterte Admins dürfen die Nenner nicht verzerren.
    const r = analyzeEngagement(
      input({ profiles: [profile('a')], sessions: [session('a', 3), session('admin', 1)] })
    )
    expect(r.users.activated).toBe(1)
  })
})

describe('Zweiter Tag', () => {
  it('lässt Neulinge aus der Basis, die noch keine Woche Zeit hatten', () => {
    // 'neu' startete gestern — als Einmal-Besucher zu zählen wäre unfair.
    const r = analyzeEngagement(
      input({
        profiles: [profile('alt'), profile('neu')],
        sessions: [session('alt', 30), session('neu', 1)],
      })
    )
    expect(metric(r, 'second_day').base).toBe(1)
  })

  it('erkennt zwei Sessions am selben Tag nicht als zweiten Tag', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('a')],
        sessions: [session('a', 20), session('a', 20)],
      })
    )
    expect(metric(r, 'second_day').hits).toBe(0)
  })
})

describe('Streak-Rückkehr', () => {
  it('zählt einen Bruch erst nach zwei Tagen in Folge und wertet die Rückkehr binnen 7 Tagen', () => {
    // Tage 40,39 (Lauf), Lücke, Tag 35 (Rückkehr nach 4 Tagen)
    const r = analyzeEngagement(
      input({
        profiles: [profile('a')],
        sessions: [session('a', 40), session('a', 39), session('a', 35)],
      })
    )
    expect(metric(r, 'streak_recovery').base).toBe(1)
    expect(metric(r, 'streak_recovery').hits).toBe(1)
  })

  it('wertet eine Rückkehr nach mehr als 7 Tagen nicht als aufgefangen', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('a')],
        sessions: [session('a', 40), session('a', 39), session('a', 20)],
      })
    )
    expect(metric(r, 'streak_recovery').base).toBe(1)
    expect(metric(r, 'streak_recovery').hits).toBe(0)
  })

  it('zählt einen offenen Abbruch am Ende als nicht aufgefangenen Bruch', () => {
    const r = analyzeEngagement(
      input({ profiles: [profile('a')], sessions: [session('a', 30), session('a', 29)] })
    )
    expect(metric(r, 'streak_recovery').base).toBe(1)
    expect(metric(r, 'streak_recovery').hits).toBe(0)
  })

  it('sieht in einem einzelnen Lerntag keinen Streak-Bruch', () => {
    const r = analyzeEngagement(input({ profiles: [profile('a')], sessions: [session('a', 30)] }))
    expect(metric(r, 'streak_recovery').base).toBe(0)
  })
})

describe('Trefferquote als Korridor', () => {
  it('meldet eine zu leichte App genauso wie eine zu schwere', () => {
    const leicht = analyzeEngagement(
      input({
        profiles: [profile('a')],
        sessions: [session('a', 2)],
        answers: answers('a', 'x', 95, 5),
      })
    )
    expect(metric(leicht, 'accuracy').verdict).toBe('zu hoch')

    const schwer = analyzeEngagement(
      input({
        profiles: [profile('a')],
        sessions: [session('a', 2)],
        answers: answers('a', 'x', 40, 60),
      })
    )
    expect(metric(schwer, 'accuracy').verdict).toBe('kritisch')
  })

  it('hält sich bei zu dünner Datenlage zurück, statt ein Urteil zu erfinden', () => {
    const r = analyzeEngagement(
      input({ profiles: [profile('a')], sessions: [session('a', 2)], answers: answers('a', 'x', 1, 9) })
    )
    expect(metric(r, 'accuracy').verdict).toBe('zu wenig daten')
  })
})

describe('Freiwillige Verlängerung', () => {
  it('zählt Lerntage mit mehr als einer Runde, nicht Sessions', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('a'), profile('b')],
        sessions: [session('a', 5), session('a', 5), session('a', 4), session('b', 5)],
      })
    )
    // 3 Lerntage insgesamt (a/Tag5, a/Tag4, b/Tag5), davon einer doppelt
    expect(metric(r, 'voluntary_extra').base).toBe(3)
    expect(metric(r, 'voluntary_extra').hits).toBe(1)
  })
})

describe('Tote Anreize', () => {
  it('meldet Badges, die kein Nutzer besitzt', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('a')],
        sessions: [session('a', 3)],
        badges: [
          { id: 'b1', name: 'Erster Schritt' },
          { id: 'b2', name: 'Unerreichbar' },
        ],
        userBadges: [{ user_id: 'a', badge_id: 'b1' }],
      })
    )
    expect(metric(r, 'dead_badges').value).toBe(1)
    expect(metric(r, 'dead_badges').verdict).toBe('zu hoch')
    expect(r.badgeUsage.find((b) => b.name === 'Unerreichbar')?.holders).toBe(0)
  })

  it('meldet Fächer, die niemand anfasst', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('a')],
        sessions: [session('a', 3, { subject_id: 's1' })],
        subjects: [
          { id: 's1', name: 'BGP' },
          { id: 's2', name: 'LOP' },
        ],
      })
    )
    expect(metric(r, 'ignored_subjects').value).toBe(1)
  })
})

describe('Abwanderung', () => {
  it('listet verschwundene Nutzer mit den meisten Sessions zuerst', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('viel'), profile('wenig'), profile('aktiv')],
        sessions: [
          session('viel', 40),
          session('viel', 41),
          session('wenig', 40),
          session('aktiv', 1),
        ],
      })
    )
    expect(metric(r, 'lapsed_28d').hits).toBe(2)
    expect(r.lapsed[0].userId).toBe('viel')
    expect(r.lapsed[0].daysSinceLast).toBe(40)
  })
})

describe('Trefferquote am Rückkehrtag', () => {
  function answersOn(user: string, ago: number, correct: number, wrong: number): AnswerRow[] {
    const at = daysAgo(ago)
    const row = (ok: boolean) => ({ user_id: user, session_id: `s${ago}`, is_correct: ok, answered_at: at })
    return [...Array.from({ length: correct }, () => row(true)), ...Array.from({ length: wrong }, () => row(false))]
  }

  it('wertet nur Lerntage nach einer Pause von mindestens 7 Tagen', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('u1')],
        sessions: [session('u1', 30), session('u1', 29), session('u1', 3)],
        answers: [...answersOn('u1', 30, 20, 0), ...answersOn('u1', 29, 20, 0), ...answersOn('u1', 3, 16, 24)],
      })
    )
    const m = metric(r, 'return_day_accuracy')
    // Die 40 Antworten der beiden Tage vor der Pause dürfen die Quote nicht schönen.
    expect(m.base).toBe(40)
    expect(m.value).toBeCloseTo(0.4)
    expect(m.verdict).toBe('kritisch')
  })

  it('urteilt nicht, wenn niemand nach einer echten Pause zurückkam', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('u1')],
        sessions: [session('u1', 10), session('u1', 8)],
        answers: answersOn('u1', 8, 30, 10),
      })
    )
    expect(metric(r, 'return_day_accuracy').verdict).toBe('zu wenig daten')
  })
})

describe('Sessions außerhalb der Schulzeit', () => {
  /** NOW liegt in der Sommerzeit (MESZ, UTC+2) — Berliner Stunde minus 2 ergibt UTC. */
  function sessionAt(user: string, ago: number, berlinHourWanted: number): SessionRow {
    const day = daysAgo(ago).slice(0, 10)
    return session(user, ago, { completed_at: `${day}T${String(berlinHourWanted - 2).padStart(2, '0')}:30:00Z` })
  }

  it('zählt 8 Uhr zur Schulzeit und 14 Uhr bereits danach', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('u1')],
        sessions: [
          ...Array.from({ length: 30 }, (_, i) => sessionAt('u1', i + 1, 8)),
          ...Array.from({ length: 6 }, (_, i) => sessionAt('u1', i + 40, 14)),
        ],
      })
    )
    const m = metric(r, 'after_school')
    expect(m.hits).toBe(6)
    expect(m.base).toBe(36)
    expect(m.verdict).toBe('kritisch')
  })

  it('sieht eine App, die den Klassenraum verlassen hat, als in Ordnung an', () => {
    const r = analyzeEngagement(
      input({
        profiles: [profile('u1')],
        sessions: [
          ...Array.from({ length: 12 }, (_, i) => sessionAt('u1', i + 1, 11)),
          ...Array.from({ length: 24 }, (_, i) => sessionAt('u1', i + 20, 17)),
        ],
      })
    )
    expect(metric(r, 'after_school').verdict).toBe('ok')
  })
})

describe('Leerer Datensatz', () => {
  it('stürzt nicht ab und urteilt nicht', () => {
    const r = analyzeEngagement(input({ profiles: [] }))
    expect(r.metrics.every((m) => m.verdict === 'zu wenig daten' || m.kind === 'count')).toBe(true)
  })
})
