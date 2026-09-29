import { describe, it, expect } from 'vitest'
import { chainMock, hasCall, selectArg } from '@/test/supabase-chain-mock'
import { checkAndAwardBadges, fetchBadgeDefinitions, isBadgeEarned, type BadgeDefinition, type BadgeStats } from './badges'

// ── Testdaten: die 15 Badges, wie sie die Migration 20260929_proj22 anlegt ────

const SPED = 'dept-sped'
const TOUR = 'dept-tour'
const S = { BGP: 'sub-bgp', KSK: 'sub-ksk', STG: 'sub-stg', LOP: 'sub-lop', PUG: 'sub-pug' }

function badge(id: string, rule: BadgeDefinition['rule'], threshold: number | null, subject_id: string | null = null, sort_order = 0): BadgeDefinition {
  return { id, name: id, description: id, icon: '🏅', sort_order, rule, threshold, subject_id }
}

const SPED_BADGES: BadgeDefinition[] = [
  badge('first_step', 'sessions', 1, null, 1),
  badge('on_the_way', 'sessions', 10, null, 2),
  badge('learning_pro', 'sessions', 50, null, 3),
  badge('fire_starter', 'streak', 3, null, 4),
  badge('week_warrior', 'streak', 7, null, 5),
  badge('month_master', 'streak', 30, null, 6),
  badge('all_rounder', 'all_rounder', 10, null, 7),
  badge('bgp_expert', 'subject_expert', 100, S.BGP, 8),
  badge('ksk_expert', 'subject_expert', 100, S.KSK, 9),
  badge('stg_expert', 'subject_expert', 100, S.STG, 10),
  badge('lop_expert', 'subject_expert', 100, S.LOP, 11),
  badge('perfectionist', 'perfect_session', null, null, 12),
  badge('level_10', 'level', 10, null, 13),
  badge('level_25', 'level', 25, null, 14),
  badge('exam_ready', 'level', 50, null, 15),
]
const byId = (id: string) => SPED_BADGES.find((b) => b.id === id)!

const ALL_SPED_SUBJECTS = Object.values(S)

function stats(over: Partial<BadgeStats> = {}): BadgeStats {
  return {
    totalSessions: 0,
    streak: 0,
    level: 1,
    hasPerfectSession: false,
    correctPerSubject: {},
    activeSubjectIds: ALL_SPED_SUBJECTS,
    ...over,
  }
}

// ── isBadgeEarned: die Regeln ────────────────────────────────────────────────

describe('isBadgeEarned', () => {
  it.each([
    ['first_step', { totalSessions: 1 }, true],
    ['first_step', { totalSessions: 0 }, false],
    ['on_the_way', { totalSessions: 10 }, true],
    ['on_the_way', { totalSessions: 9 }, false],
    ['learning_pro', { totalSessions: 50 }, true],
    ['fire_starter', { streak: 3 }, true],
    ['week_warrior', { streak: 6 }, false],
    ['week_warrior', { streak: 7 }, true],
    ['month_master', { streak: 30 }, true],
    ['level_10', { level: 10 }, true],
    ['level_25', { level: 24 }, false],
    ['exam_ready', { level: 50 }, true],
    ['perfectionist', { hasPerfectSession: true }, true],
    ['perfectionist', { hasPerfectSession: false }, false],
  ] as const)('%s bei %o → %s', (id, over, expected) => {
    expect(isBadgeEarned(byId(id), stats(over))).toBe(expected)
  })

  it('Fach-Experte zählt nur das eigene Fach', () => {
    expect(isBadgeEarned(byId('ksk_expert'), stats({ correctPerSubject: { [S.KSK]: 100 } }))).toBe(true)
    expect(isBadgeEarned(byId('ksk_expert'), stats({ correctPerSubject: { [S.KSK]: 99, [S.BGP]: 500 } }))).toBe(false)
  })

  describe('Allrounder', () => {
    const ten = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, 10]))

    it('verlangt 10 richtige in JEDEM aktiven Fach — inkl. PUG (Änderung PROJ-22)', () => {
      const withoutPug = ten([S.BGP, S.KSK, S.STG, S.LOP])
      expect(isBadgeEarned(byId('all_rounder'), stats({ correctPerSubject: withoutPug }))).toBe(false)
      expect(isBadgeEarned(byId('all_rounder'), stats({ correctPerSubject: ten(ALL_SPED_SUBJECTS) }))).toBe(true)
    })

    it('ignoriert inaktive Fächer (nicht in activeSubjectIds)', () => {
      const active = [S.BGP, S.KSK]
      expect(isBadgeEarned(byId('all_rounder'), stats({ activeSubjectIds: active, correctPerSubject: ten(active) }))).toBe(true)
    })

    it('gibt es ohne aktive Fächer nicht', () => {
      expect(isBadgeEarned(byId('all_rounder'), stats({ activeSubjectIds: [] }))).toBe(false)
    })
  })
})

// ── Datenbank-Ersatz ─────────────────────────────────────────────────────────

interface Db {
  existing?: string[]
  sessions?: number
  correct?: { subject_id: string }[]
  allSessions?: { score: number; total: number }[]
  department?: string | null
  subjectsOfDepartment?: string[]
  badges?: (BadgeDefinition & { subjects: { department_id: string } | null })[]
  userBadgesError?: boolean
  insertError?: boolean
}

function db(opts: Db = {}) {
  const {
    existing = [],
    sessions = 0,
    correct = [],
    allSessions = [],
    department = SPED,
    subjectsOfDepartment = ALL_SPED_SUBJECTS,
    badges = SPED_BADGES.map((b) => ({ ...b, subjects: b.subject_id ? { department_id: SPED } : null })),
    userBadgesError = false,
    insertError = false,
  } = opts
  return chainMock((table, calls) => {
    if (table === 'user_badges') {
      if (hasCall(calls, 'insert')) return { error: insertError ? { message: 'insert error' } : null }
      return userBadgesError
        ? { data: null, error: { message: 'DB error' } }
        : { data: existing.map((badge_id) => ({ badge_id })) }
    }
    if (table === 'profiles') return { data: { department_id: department } }
    if (table === 'badges') return { data: badges }
    if (table === 'subjects') return { data: subjectsOfDepartment.map((id) => ({ id })) }
    if (table === 'quiz_sessions') {
      return selectArg(calls) === 'score, total' ? { data: allSessions } : { count: sessions }
    }
    if (table === 'quiz_answers') return { data: correct.map((c) => ({ quiz_sessions: c })) }
    return {}
  })
}

const USER_ID = 'user-1'
const ctx = { streak: 0, level: 1, sessionScore: 0, sessionTotal: 0 }
const ids = (badges: { id: string }[]) => badges.map((b) => b.id)

// ── checkAndAwardBadges ──────────────────────────────────────────────────────

describe('checkAndAwardBadges', () => {
  it('vergibt neu verdiente Badges und speichert sie', async () => {
    const { client, writes: inserts } = db({ sessions: 10 })
    const awarded = await checkAndAwardBadges(client, USER_ID, { ...ctx, streak: 3, level: 10, sessionScore: 5, sessionTotal: 5 })
    expect(ids(awarded).sort()).toEqual(['fire_starter', 'first_step', 'level_10', 'on_the_way', 'perfectionist'])
    expect(inserts).toHaveLength(1)
    expect((inserts[0].payload as { badge_id: string }[]).map((r) => r.badge_id)).toHaveLength(5)
  })

  it('vergibt keine Badges doppelt', async () => {
    const { client } = db({ sessions: 1, existing: ['first_step'] })
    expect(ids(await checkAndAwardBadges(client, USER_ID, ctx))).not.toContain('first_step')
  })

  it('zählt richtige Antworten je Fach über das Fach der Sitzung', async () => {
    const correct = Array.from({ length: 100 }, () => ({ subject_id: S.STG }))
    const { client } = db({ correct })
    expect(ids(await checkAndAwardBadges(client, USER_ID, ctx))).toEqual(['stg_expert'])
  })

  it('Allrounder nur mit allen aktiven Fächern des Bereichs', async () => {
    const correct = ALL_SPED_SUBJECTS.flatMap((subject_id) => Array.from({ length: 10 }, () => ({ subject_id })))
    const { client } = db({ correct })
    expect(ids(await checkAndAwardBadges(client, USER_ID, ctx))).toContain('all_rounder')

    const { client: withoutPug } = db({ correct: correct.filter((c) => c.subject_id !== S.PUG) })
    expect(ids(await checkAndAwardBadges(withoutPug, USER_ID, ctx))).not.toContain('all_rounder')
  })

  it('zieht Perfektionist rückwirkend aus früheren Sitzungen, zeigt aber kein Popup', async () => {
    const { client, writes: inserts } = db({ allSessions: [{ score: 3, total: 5 }, { score: 5, total: 5 }] })
    const awarded = await checkAndAwardBadges(client, USER_ID, { ...ctx, isRetroactive: true })
    expect(awarded).toEqual([])
    expect((inserts[0].payload as { badge_id: string; is_retroactive: boolean }[])).toEqual([
      expect.objectContaining({ badge_id: 'perfectionist', is_retroactive: true }),
    ])
  })

  it('Perfektionist nicht bei leerer Sitzung', async () => {
    const { client } = db()
    expect(ids(await checkAndAwardBadges(client, USER_ID, { ...ctx, sessionScore: 0, sessionTotal: 0 }))).not.toContain('perfectionist')
  })

  it('bietet Fach-Badges anderer Bereiche nicht an', async () => {
    const tourBadge = { ...badge('rvt_expert', 'subject_expert', 1, 'sub-rvt'), subjects: { department_id: TOUR } }
    const badges = [...SPED_BADGES.map((b) => ({ ...b, subjects: b.subject_id ? { department_id: SPED } : null })), tourBadge]
    const { client } = db({ badges, correct: [{ subject_id: 'sub-rvt' }] })
    expect(ids(await checkAndAwardBadges(client, USER_ID, ctx))).not.toContain('rvt_expert')
  })

  it('liefert [] ohne Absturz, wenn user_badges nicht lesbar ist', async () => {
    const { client } = db({ sessions: 5, userBadgesError: true })
    expect(await checkAndAwardBadges(client, USER_ID, ctx)).toEqual([])
  })

  it('liefert [] ohne Absturz, wenn das Speichern scheitert', async () => {
    const { client } = db({ sessions: 5, insertError: true })
    expect(await checkAndAwardBadges(client, USER_ID, ctx)).toEqual([])
  })

  it('liefert [], wenn alles schon verdient ist', async () => {
    const { client, writes: inserts } = db({ sessions: 100, existing: SPED_BADGES.map((b) => b.id) })
    expect(await checkAndAwardBadges(client, USER_ID, { ...ctx, level: 60, streak: 40 })).toEqual([])
    expect(inserts).toHaveLength(0)
  })
})

describe('fetchBadgeDefinitions', () => {
  it('liefert allgemeine Badges plus Fach-Badges des Bereichs', async () => {
    const badges = [
      { ...badge('first_step', 'sessions', 1), subjects: null },
      { ...badge('bgp_expert', 'subject_expert', 100, S.BGP), subjects: { department_id: SPED } },
      { ...badge('rvt_expert', 'subject_expert', 100, 'sub-rvt'), subjects: { department_id: TOUR } },
    ]
    const { client } = chainMock(() => ({ data: badges }))
    expect(ids(await fetchBadgeDefinitions(client, SPED))).toEqual(['first_step', 'bgp_expert'])
    expect(ids(await fetchBadgeDefinitions(client, TOUR))).toEqual(['first_step', 'rvt_expert'])
  })

  it('gibt die Hilfsspalte subjects nicht weiter', async () => {
    const { client } = chainMock(() => ({ data: [{ ...badge('first_step', 'sessions', 1), subjects: null }] }))
    const [first] = await fetchBadgeDefinitions(client, SPED)
    expect(first).not.toHaveProperty('subjects')
  })
})
