import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'
import { GET as statusGET } from './status/route'
import { POST as subscribePOST } from './subscribe/route'
import { POST as unsubscribePOST } from './unsubscribe/route'
import { POST as declinePOST } from './decline/route'

const USER = { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abcdefghijklmnop'
const KEYS = { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) }

function authAs(user: unknown) {
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } } as never)
}

/** Kleiner Nachbau des Abfrage-Builders: jede Methode gibt sich selbst zurück, `await` liefert das Ergebnis */
function builder(result: Record<string, unknown> = { data: null, error: null }) {
  const calls: { method: string; args: unknown[] }[] = []
  const proxy: Record<string, unknown> = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (resolve: (v: unknown) => unknown) => resolve(result)
        if (prop === 'maybeSingle') return () => Promise.resolve(result)
        return (...args: unknown[]) => {
          calls.push({ method: prop, args })
          return proxy
        }
      },
    },
  )
  return { proxy, calls }
}

function serviceWith(tables: Record<string, ReturnType<typeof builder>[]>) {
  const used: Record<string, number> = {}
  const from = vi.fn((table: string) => {
    const list = tables[table] ?? [builder()]
    const i = used[table] ?? 0
    used[table] = i + 1
    return list[Math.min(i, list.length - 1)].proxy
  })
  vi.mocked(createServiceClient).mockReturnValue({ from } as never)
  return from
}

function req(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}
const badJson = { json: () => Promise.reject(new Error('x')) } as unknown as NextRequest

beforeEach(() => vi.clearAllMocks())

describe('GET /api/push/status', () => {
  it('401 ohne Anmeldung', async () => {
    authAs(null)
    expect((await statusGET()).status).toBe(401)
  })

  it('meldet aktiv, wenn ein Gerät angemeldet ist', async () => {
    authAs(USER)
    serviceWith({
      push_subscriptions: [builder({ count: 2, error: null })],
      push_reminder_state: [builder({ data: { declined_at: '2026-11-01T10:00:00Z', decline_count: 1 }, error: null })],
    })
    const res = await statusGET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ enabled: true, declined_at: '2026-11-01T10:00:00Z', decline_count: 1 })
  })

  it('neues Konto: aus, nie abgelehnt', async () => {
    authAs(USER)
    serviceWith({ push_subscriptions: [builder({ count: 0, error: null })], push_reminder_state: [builder({ data: null, error: null })] })
    expect(await (await statusGET()).json()).toEqual({ enabled: false, declined_at: null, decline_count: 0 })
  })

  it('Datenbankfehler: 500 ohne technische Details', async () => {
    authAs(USER)
    serviceWith({ push_subscriptions: [builder({ count: null, error: { message: 'secret detail' } })], push_reminder_state: [builder()] })
    const res = await statusGET()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret detail')
  })
})

describe('POST /api/push/subscribe', () => {
  const valid = { subscription: { endpoint: ENDPOINT, expirationTime: null, keys: KEYS } }

  it('401 ohne Anmeldung', async () => {
    authAs(null)
    expect((await subscribePOST(req(valid))).status).toBe(401)
  })

  it('400 bei kaputtem JSON', async () => {
    authAs(USER)
    expect((await subscribePOST(badJson)).status).toBe(400)
  })

  it.each([
    ['ohne Schlüssel', { subscription: { endpoint: ENDPOINT } }],
    ['Schlüssel zu kurz', { subscription: { endpoint: ENDPOINT, keys: { p256dh: 'x', auth: 'y' } } }],
    ['fremde Adresse (SSRF)', { subscription: { endpoint: 'https://evil.example.com/push', keys: KEYS } }],
    ['interne Adresse (SSRF)', { subscription: { endpoint: 'https://169.254.169.254/latest', keys: KEYS } }],
    ['kein https', { subscription: { endpoint: 'http://fcm.googleapis.com/fcm/send/abcdefghijk', keys: KEYS } }],
    ['leerer Body', {}],
  ])('400 %s, ohne Datenbankzugriff', async (_n, body) => {
    authAs(USER)
    const from = serviceWith({})
    expect((await subscribePOST(req(body))).status).toBe(400)
    expect(from).not.toHaveBeenCalled()
  })

  it('speichert das Gerät für das angemeldete Konto (Konto kommt nie aus dem Body)', async () => {
    authAs(USER)
    const subs = builder({ data: null, error: null })
    const list = builder({ data: [{ id: '1' }], error: null })
    const state = builder()
    serviceWith({ push_subscriptions: [subs, list], push_reminder_state: [state] })
    const res = await subscribePOST(req({ ...valid, user_id: 'fremde-id' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ enabled: true })
    const upsert = subs.calls.find((c) => c.method === 'upsert')!
    expect(upsert.args[0]).toMatchObject({ user_id: USER.id, endpoint: ENDPOINT, p256dh: KEYS.p256dh, auth: KEYS.auth })
    expect(upsert.args[1]).toEqual({ onConflict: 'endpoint' })
    // Abklingen wird beim Wiedereinschalten zurückgesetzt
    expect(state.calls.find((c) => c.method === 'upsert')!.args[0]).toMatchObject({ user_id: USER.id, ignored_in_a_row: 0 })
  })

  it('mehr als 5 Geräte: das älteste fliegt raus', async () => {
    authAs(USER)
    const ids = ['1', '2', '3', '4', '5', '6', '7'].map((id) => ({ id }))
    const subs = builder({ data: null, error: null })
    const list = builder({ data: ids, error: null })
    const del = builder()
    serviceWith({ push_subscriptions: [subs, list, del], push_reminder_state: [builder()] })
    await subscribePOST(req(valid))
    const inCall = del.calls.find((c) => c.method === 'in')!
    expect(inCall.args).toEqual(['id', ['6', '7']])
  })

  it('Speicherfehler: 500 ohne technische Details', async () => {
    authAs(USER)
    serviceWith({ push_subscriptions: [builder({ data: null, error: { message: 'duplicate key secret' } })] })
    const res = await subscribePOST(req(valid))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
})

describe('POST /api/push/unsubscribe', () => {
  it('401 ohne Anmeldung', async () => {
    authAs(null)
    expect((await unsubscribePOST(req({ endpoint: ENDPOINT }))).status).toBe(401)
  })

  it('400 ohne Adresse', async () => {
    authAs(USER)
    expect((await unsubscribePOST(req({}))).status).toBe(400)
  })

  it('löscht nur die eigene Zeile dieses Geräts und meldet, ob noch ein Gerät übrig ist', async () => {
    authAs(USER)
    const del = builder({ data: null, error: null })
    const count = builder({ count: 1, error: null })
    serviceWith({ push_subscriptions: [del, count] })
    const res = await unsubscribePOST(req({ endpoint: ENDPOINT }))
    expect(await res.json()).toEqual({ enabled: true })
    expect(del.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([
      ['user_id', USER.id],
      ['endpoint', ENDPOINT],
    ])
  })

  it('letztes Gerät abgemeldet: aus', async () => {
    authAs(USER)
    serviceWith({ push_subscriptions: [builder({ data: null, error: null }), builder({ count: 0, error: null })] })
    expect(await (await unsubscribePOST(req({ endpoint: ENDPOINT }))).json()).toEqual({ enabled: false })
  })
})

describe('POST /api/push/decline', () => {
  it('401 ohne Anmeldung', async () => {
    authAs(null)
    expect((await declinePOST()).status).toBe(401)
  })

  it('zählt die Ablehnung hoch', async () => {
    authAs(USER)
    const read = builder({ data: { decline_count: 1 }, error: null })
    const write = builder({ data: null, error: null })
    serviceWith({ push_reminder_state: [read, write] })
    const res = await declinePOST()
    expect(res.status).toBe(200)
    const upsert = write.calls.find((c) => c.method === 'upsert')!
    expect(upsert.args[0]).toMatchObject({ user_id: USER.id, decline_count: 2 })
    expect((upsert.args[0] as { declined_at: string }).declined_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('erste Ablehnung: Zähler 1', async () => {
    authAs(USER)
    const write = builder()
    serviceWith({ push_reminder_state: [builder({ data: null, error: null }), write] })
    await declinePOST()
    expect(write.calls.find((c) => c.method === 'upsert')!.args[0]).toMatchObject({ decline_count: 1 })
  })
})
