import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn(() => ({})) }))
vi.mock('@/lib/push-send', () => ({ configureWebPush: vi.fn(), sendPush: vi.fn() }))
vi.mock('@/lib/push-reminder-job', () => ({ runReminderJob: vi.fn() }))

import { GET } from './route'
import { configureWebPush } from '@/lib/push-send'
import { runReminderJob } from '@/lib/push-reminder-job'

const SECRET = 'geheim-1234567890'
const DI_19 = new Date('2026-11-24T18:30:00Z') // Dienstag 19:30 Berlin
const MO_19 = new Date('2026-11-23T18:30:00Z')

function call(opts: { auth?: string | null; query?: string } = {}) {
  const headers = new Headers()
  if (opts.auth !== null) headers.set('authorization', opts.auth ?? `Bearer ${SECRET}`)
  return GET(new Request(`https://spedilern.vercel.app/api/cron/push-erinnerung${opts.query ?? ''}`, { headers }))
}

const jobResult = { dry: false, users: 3, wouldSend: 2, sentUsers: 2, devicesOk: 2, devicesGone: 0, devicesFailed: 0, skipped: {} }

describe('GET /api/cron/push-erinnerung', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', SECRET)
    vi.useFakeTimers()
    vi.setSystemTime(DI_19)
    vi.mocked(configureWebPush).mockReturnValue(true)
    vi.mocked(runReminderJob).mockResolvedValue(jobResult as never)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it.each([
    ['ohne Kopfzeile', null],
    ['falsches Geheimnis', 'Bearer falsch'],
    ['ohne Bearer', SECRET],
    ['leeres Bearer', 'Bearer '],
  ])('401 %s', async (_n, auth) => {
    const res = await call({ auth })
    expect(res.status).toBe(401)
    expect(runReminderJob).not.toHaveBeenCalled()
  })

  it('401, wenn CRON_SECRET gar nicht gesetzt ist (nie offen)', async () => {
    vi.stubEnv('CRON_SECRET', '')
    expect((await call({ auth: 'Bearer ' })).status).toBe(401)
    expect((await call({ auth: 'Bearer undefined' })).status).toBe(401)
  })

  it('Dienstag 19 Uhr Berlin: läuft und meldet nur Zahlen', async () => {
    const res = await call()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, ausgefuehrt: true, sentUsers: 2 })
    expect(runReminderJob).toHaveBeenCalledWith(expect.objectContaining({ dry: false }))
  })

  it('Montag: kein Termin, nichts passiert', async () => {
    vi.setSystemTime(MO_19)
    const body = await (await call()).json()
    expect(body).toMatchObject({ ok: true, ausgefuehrt: false })
    expect(runReminderJob).not.toHaveBeenCalled()
  })

  it('zweiter Cron-Eintrag zur falschen Stunde (Dienstag 18 Uhr Berlin): nichts passiert', async () => {
    vi.setSystemTime(new Date('2026-11-24T17:30:00Z'))
    expect((await (await call()).json()).ausgefuehrt).toBe(false)
    expect(runReminderJob).not.toHaveBeenCalled()
  })

  it('Trockenlauf läuft zu jeder Zeit, ohne Schlüssel und sendet nichts', async () => {
    vi.setSystemTime(MO_19)
    vi.mocked(configureWebPush).mockReturnValue(false)
    const res = await call({ query: '?dry=1' })
    expect(res.status).toBe(200)
    expect(runReminderJob).toHaveBeenCalledWith(expect.objectContaining({ dry: true }))
  })

  it('fehlende VAPID-Schlüssel: 500 mit klarem Hinweis, kein Versand', async () => {
    vi.mocked(configureWebPush).mockReturnValue(false)
    const res = await call()
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('VAPID')
    expect(runReminderJob).not.toHaveBeenCalled()
  })

  it('Fehler im Job: 500 ohne technische Details', async () => {
    vi.mocked(runReminderJob).mockRejectedValue(new Error('connection refused db-host-intern'))
    const res = await call()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('db-host-intern')
  })
})
