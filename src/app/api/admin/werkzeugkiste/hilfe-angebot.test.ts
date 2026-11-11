import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock, eqValue, type ChainResolver } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { GET, PUT } from './hilfe-angebot/route'

/** Gemerktes Angebot des Assistenten „Schritt für Schritt“ (PROJ-87) */

let db: ReturnType<typeof chainMock>

function anmelden(resolver: ChainResolver) {
  db = chainMock(resolver)
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'l@schule.de' },
    supabase: db.client,
    role: 'teacher',
    isSuperAdmin: false,
  } as never)
}

function abgelehnt(status: number) {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: NextResponse.json({ error: 'x' }, { status }),
    user: null,
    supabase: null,
  } as never)
}

const get = (query = '?werkzeug=skript') => GET(new Request(`http://t/api/admin/werkzeugkiste/hilfe-angebot${query}`))
const put = (body: unknown) =>
  PUT(new Request('http://t/api/admin/werkzeugkiste/hilfe-angebot', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }))

beforeEach(() => {
  vi.clearAllMocks()
  anmelden(() => ({ data: null }))
})

describe('GET /hilfe-angebot', () => {
  it('meldet „nicht beantwortet“, solange keine Zeile da ist', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ werkzeug: 'skript', beantwortet: false, antwort: null })
  })

  it('liefert die gemerkte Antwort und fragt nur die eigene Zeile ab', async () => {
    anmelden(() => ({ data: { antwort: 'nein' } }))
    const res = await get()
    expect(await res.json()).toEqual({ werkzeug: 'skript', beantwortet: true, antwort: 'nein' })
    const q = db.queries[0]
    expect(q.table).toBe('werkzeug_hilfe_angebot')
    expect(eqValue(q.calls, 'owner_id')).toBe('u1')
    expect(eqValue(q.calls, 'werkzeug')).toBe('skript')
  })

  it('lehnt ein fehlendes oder unbekanntes Werkzeug mit 400 ab', async () => {
    expect((await get('')).status).toBe(400)
    expect((await get('?werkzeug=gibtsnicht')).status).toBe(400)
  })

  it('antwortet bei Datenbankfehler mit verständlichem Text und 500', async () => {
    anmelden(() => ({ error: { message: 'boom' } }))
    const res = await get()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })

  it('401 ohne Anmeldung, 403 für Azubis', async () => {
    abgelehnt(401)
    expect((await get()).status).toBe(401)
    abgelehnt(403)
    expect((await get()).status).toBe(403)
  })
})

describe('PUT /hilfe-angebot', () => {
  it('speichert „ja“ als eine Zeile je Konto und Werkzeug', async () => {
    const res = await put({ werkzeug: 'skript', antwort: 'ja' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ werkzeug: 'skript', beantwortet: true, antwort: 'ja' })
    expect(db.writes).toHaveLength(1)
    expect(db.writes[0].method).toBe('upsert')
    expect(db.writes[0].payload).toMatchObject({ owner_id: 'u1', werkzeug: 'skript', antwort: 'ja' })
    const opts = db.queries[0].calls.find((c) => c.method === 'upsert')!.args[1]
    expect(opts).toEqual({ onConflict: 'owner_id,werkzeug' })
  })

  it('nimmt die Konto-ID nie aus dem Body', async () => {
    await put({ werkzeug: 'skript', antwort: 'nein', owner_id: 'fremd' })
    expect(db.writes[0].payload).toMatchObject({ owner_id: 'u1', antwort: 'nein' })
  })

  it('lehnt ungültige Antworten und Werkzeuge mit 400 ab, ohne zu schreiben', async () => {
    for (const body of [
      { werkzeug: 'skript', antwort: 'vielleicht' },
      { werkzeug: 'skript' },
      { werkzeug: 'gibtsnicht', antwort: 'ja' },
      { antwort: 'ja' },
    ]) {
      expect((await put(body)).status).toBe(400)
    }
    expect(db.writes).toHaveLength(0)
  })

  it('lehnt kaputtes JSON mit 400 ab', async () => {
    const res = await PUT(new Request('http://t', { method: 'PUT', body: '{kaputt' }))
    expect(res.status).toBe(400)
  })

  it('antwortet bei Datenbankfehler mit verständlichem Text und 500', async () => {
    anmelden(() => ({ error: { message: 'boom' } }))
    const res = await put({ werkzeug: 'skript', antwort: 'ja' })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })

  it('401 ohne Anmeldung, 403 für Azubis, nichts wird geschrieben', async () => {
    abgelehnt(401)
    expect((await put({ werkzeug: 'skript', antwort: 'ja' })).status).toBe(401)
    abgelehnt(403)
    expect((await put({ werkzeug: 'skript', antwort: 'ja' })).status).toBe(403)
    expect(db.writes).toHaveLength(0)
  })
})
