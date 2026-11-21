import { describe, it, expect, vi } from 'vitest'
import { runReminderJob } from './push-reminder-job'
import type { PushDevice, PushSendResult } from './push-send'

// Dienstag 2026-11-24, 19:30 Berlin
const NOW = new Date('2026-11-24T18:30:00Z')

type Row = Record<string, unknown>
interface Db {
  push_subscriptions: Row[]
  profiles: Row[]
  push_reminder_state: Row[]
  quiz_sessions: Row[]
  blitz_rounds: Row[]
  exam_sessions: Row[]
  departments: Row[]
}

/**
 * Winziger In-Memory-Nachbau von Supabase: genug für select/in/gte/order/range,
 * upsert (mit ignoreDuplicates), update + or(...) + select, delete + in.
 */
function fakeService(db: Db) {
  const updates: Row[] = []
  const deletes: string[][] = []
  function from(table: keyof Db) {
    let op: 'select' | 'update' | 'delete' | 'upsert' = 'select'
    let patch: Row = {}
    const filters: ((r: Row) => boolean)[] = []
    let orFilter: ((r: Row) => boolean) | null = null
    let range: [number, number] | null = null
    let wantsSelect = false
    const api: Record<string, unknown> = {
      select: () => {
        wantsSelect = true
        return api
      },
      in: (col: string, vals: unknown[]) => (filters.push((r) => vals.includes(r[col])), api),
      eq: (col: string, v: unknown) => (filters.push((r) => r[col] === v), api),
      gte: (col: string, v: string) => (filters.push((r) => String(r[col]) >= v), api),
      limit: () => api,
      order: () => api,
      range: (a: number, b: number) => ((range = [a, b]), api),
      or: (expr: string) => {
        // nur: last_sent_date.is.null,last_sent_date.neq.<tag>
        const day = expr.split('neq.')[1]
        orFilter = (r) => r.last_sent_date == null || r.last_sent_date !== day
        return api
      },
      update: (p: Row) => ((op = 'update'), (patch = p), api),
      delete: () => ((op = 'delete'), api),
      upsert: (p: Row, opts?: { ignoreDuplicates?: boolean; onConflict?: string }) => {
        op = 'upsert'
        const key = opts?.onConflict ?? 'id'
        const existing = db[table].find((r) => r[key] === p[key])
        if (!existing) db[table].push({ ...p })
        else if (!opts?.ignoreDuplicates) Object.assign(existing, p)
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: unknown) => unknown) => {
        let rows = db[table].filter((r) => filters.every((f) => f(r)) && (!orFilter || orFilter(r)))
        if (op === 'update') {
          rows.forEach((r) => Object.assign(r, patch))
          updates.push({ table, ...patch })
          return resolve({ data: wantsSelect ? rows.map((r) => ({ ...r })) : null, error: null })
        }
        if (op === 'delete') {
          deletes.push(rows.map((r) => r.id as string))
          db[table] = db[table].filter((r) => !rows.includes(r))
          return resolve({ data: null, error: null })
        }
        if (range) rows = rows.slice(range[0], range[1] + 1)
        return resolve({ data: rows.map((r) => ({ ...r })), error: null })
      },
    }
    return api
  }
  return { client: { from: vi.fn(from) } as never, updates, deletes }
}

function baseDb(): Db {
  return {
    departments: [
      { id: 'd-sped', code: 'SPED', app_name: 'SpediLern', currency_name: 'Frachtmünzen', hof_name: 'Betrieb' },
      { id: 'd-tour', code: 'TOUR', app_name: 'TouristikLern', currency_name: 'Reisetaler', hof_name: 'Resort' },
    ],
    push_subscriptions: [],
    profiles: [],
    push_reminder_state: [],
    quiz_sessions: [],
    blitz_rounds: [],
    exam_sessions: [],
  }
}

function addUser(db: Db, id: string, o: { dept?: string; xp?: number; streak?: number; last?: string | null; devices?: number } = {}) {
  db.profiles.push({ id, department_id: o.dept ?? 'd-sped', current_streak: o.streak ?? 0, last_session_date: o.last === undefined ? '2026-11-17' : o.last, total_xp: o.xp ?? 100 })
  for (let i = 0; i < (o.devices ?? 1); i++) {
    db.push_subscriptions.push({ id: `${id}-dev${i}`, user_id: id, endpoint: `https://fcm.googleapis.com/fcm/send/${id}-${i}`, p256dh: 'p'.repeat(30), auth: 'a'.repeat(12) })
  }
}

const okSend = () => vi.fn(async (): Promise<PushSendResult> => 'ok')

describe('runReminderJob', () => {
  it('ohne angemeldete Geräte passiert nichts', async () => {
    const { client } = fakeService(baseDb())
    const send = okSend()
    const r = await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(r.users).toBe(0)
    expect(send).not.toHaveBeenCalled()
  })

  it('sendet an ein Konto mit zwei Geräten genau eine Meldung je Gerät und speichert den Tag', async () => {
    const db = baseDb()
    addUser(db, 'u1', { devices: 2 })
    const { client } = fakeService(db)
    const send = okSend()
    const r = await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(send).toHaveBeenCalledTimes(2)
    expect(r).toMatchObject({ sentUsers: 1, devicesOk: 2 })
    expect(db.push_reminder_state[0]).toMatchObject({ user_id: 'u1', last_sent_date: '2026-11-24', sent_count: 1 })
  })

  it('Doppelaufruf am selben Tag verschickt nichts mehr', async () => {
    const db = baseDb()
    addUser(db, 'u1')
    const { client } = fakeService(db)
    const send = okSend()
    await runReminderJob({ service: client, now: NOW, send, dry: false })
    await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('zwei gleichzeitige Läufe: nur einer bekommt den Tag', async () => {
    const db = baseDb()
    addUser(db, 'u1')
    const { client } = fakeService(db)
    const send = okSend()
    const [a, b] = await Promise.all([
      runReminderJob({ service: client, now: NOW, send, dry: false }),
      runReminderJob({ service: client, now: NOW, send, dry: false }),
    ])
    expect(send).toHaveBeenCalledTimes(1)
    expect(a.sentUsers + b.sentUsers).toBe(1)
  })

  it('wer heute schon gelernt hat (Blitzrunde), bekommt nichts', async () => {
    const db = baseDb()
    addUser(db, 'u1')
    db.blitz_rounds.push({ user_id: 'u1', calendar_day: '2026-11-24' })
    const { client } = fakeService(db)
    const send = okSend()
    const r = await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(send).not.toHaveBeenCalled()
    expect(r.skipped['heute-gelernt']).toBe(1)
  })

  it('Runde um 23:30 Berliner Zeit am Vortag zählt als Vortag, nicht als heute (Zeitzone)', async () => {
    const db = baseDb()
    addUser(db, 'u1')
    db.quiz_sessions.push({ user_id: 'u1', completed_at: '2026-11-23T22:45:00Z' }) // 23:45 Berlin am 23.
    const { client } = fakeService(db)
    const send = okSend()
    await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('Prüfungssimulation am selben Tag zählt als gelernt', async () => {
    const db = baseDb()
    addUser(db, 'u1')
    db.exam_sessions.push({ user_id: 'u1', started_at: '2026-11-24T09:00:00Z' })
    const { client } = fakeService(db)
    const send = okSend()
    await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(send).not.toHaveBeenCalled()
  })

  it('Konto ohne je gespielt zu haben bekommt nichts', async () => {
    const db = baseDb()
    addUser(db, 'u1', { xp: 0, last: null })
    const { client } = fakeService(db)
    const send = okSend()
    const r = await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(send).not.toHaveBeenCalled()
    expect(r.skipped['nie-gespielt']).toBe(1)
  })

  it('abgemeldetes Gerät (410) wird gelöscht, das andere bleibt', async () => {
    const db = baseDb()
    addUser(db, 'u1', { devices: 2 })
    const { client } = fakeService(db)
    const send = vi.fn(async (d: PushDevice): Promise<PushSendResult> => (d.endpoint.endsWith('-0') ? 'gone' : 'ok'))
    const r = await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(r).toMatchObject({ devicesOk: 1, devicesGone: 1, sentUsers: 1 })
    expect(db.push_subscriptions.map((s) => s.id)).toEqual(['u1-dev1'])
  })

  it('nur vorübergehender Fehler: nichts angekommen, alter Stand zurück, nächster Termin versucht es erneut', async () => {
    const db = baseDb()
    addUser(db, 'u1')
    db.push_reminder_state.push({ user_id: 'u1', last_sent_date: '2026-11-19', last_sent_at: '2026-11-19T18:00:00Z', sent_count: 4, ignored_in_a_row: 0 })
    db.quiz_sessions.push({ user_id: 'u1', completed_at: '2026-11-19T20:00:00Z' }) // reagiert → ignored bleibt 0
    const { client } = fakeService(db)
    const send = vi.fn(async (): Promise<PushSendResult> => 'error')
    const r = await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(r).toMatchObject({ sentUsers: 0, devicesFailed: 1 })
    expect(db.push_reminder_state[0]).toMatchObject({ last_sent_date: '2026-11-19', sent_count: 4, ignored_in_a_row: 0 })
    // und der Tag ist wieder frei
    const send2 = okSend()
    await runReminderJob({ service: client, now: NOW, send: send2, dry: false })
    expect(send2).toHaveBeenCalledTimes(1)
  })

  it('Streak-Text nur bei rettbarem Streak; Münz- und Hofname je Fachbereich', async () => {
    const db = baseDb()
    addUser(db, 'streak', { streak: 5, last: '2026-11-23' })
    addUser(db, 'tour', { dept: 'd-tour', last: '2026-11-10' })
    const { client } = fakeService(db)
    const seen: Record<string, { title: string; body: string; icon: string }> = {}
    const send = vi.fn(async (d: PushDevice, p: unknown): Promise<PushSendResult> => {
      seen[d.endpoint.includes('streak') ? 'streak' : 'tour'] = p as { title: string; body: string; icon: string }
      return 'ok'
    })
    await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(seen.streak.body).toContain('5-Tage-Streak')
    expect(seen.streak.title).toBe('SpediLern')
    expect(seen.tour.title).toBe('TouristikLern')
    expect(seen.tour.icon).toBe('/icons/tour-192.png')
    expect(seen.tour.body).not.toContain('Streak')
  })

  it('Trockenlauf zählt nur: nichts gesendet, nichts gespeichert', async () => {
    const db = baseDb()
    addUser(db, 'u1')
    addUser(db, 'u2')
    const { client } = fakeService(db)
    const send = okSend()
    const r = await runReminderJob({ service: client, now: NOW, send, dry: true })
    expect(r).toMatchObject({ dry: true, users: 2, wouldSend: 2, sentUsers: 0 })
    expect(send).not.toHaveBeenCalled()
    expect(db.push_reminder_state).toHaveLength(0)
  })

  it('gelöschtes Konto (Profil fehlt) wird übersprungen, ohne abzubrechen', async () => {
    const db = baseDb()
    addUser(db, 'u1')
    db.push_subscriptions.push({ id: 'x', user_id: 'geloescht', endpoint: 'https://fcm.googleapis.com/fcm/send/xxxxxxxxxxxxxxx', p256dh: 'p'.repeat(30), auth: 'a'.repeat(12) })
    const { client } = fakeService(db)
    const send = okSend()
    const r = await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(r.sentUsers).toBe(1)
  })

  it('viele Konten: alle werden bedient (Blockbildung über 100)', async () => {
    const db = baseDb()
    for (let i = 0; i < 230; i++) addUser(db, `u${i}`)
    const { client } = fakeService(db)
    const send = okSend()
    const r = await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(r).toMatchObject({ users: 230, sentUsers: 230 })
    expect(send).toHaveBeenCalledTimes(230)
  })

  it('Abklingen: 4× ignoriert → heute nichts, Zähler bleibt unverändert gespeichert', async () => {
    const db = baseDb()
    addUser(db, 'u1')
    db.push_reminder_state.push({ user_id: 'u1', last_sent_date: '2026-11-19', last_sent_at: null, sent_count: 8, ignored_in_a_row: 3 })
    const { client } = fakeService(db)
    const send = okSend()
    const r = await runReminderJob({ service: client, now: NOW, send, dry: false })
    expect(send).not.toHaveBeenCalled()
    expect(r.skipped.abgeklungen).toBe(1)
    expect(db.push_reminder_state[0]).toMatchObject({ last_sent_date: '2026-11-19', ignored_in_a_row: 3 })
  })
})
