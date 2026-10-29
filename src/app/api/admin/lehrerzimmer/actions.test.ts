import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../_lib/auth'

import { POST as helpful } from './helpful/route'
import { POST as hide } from './hide/route'
import { POST as resolve } from './reports/resolve/route'
import { PUT as setSolution } from './posts/[id]/solution/route'
import { POST as reply } from './posts/[id]/replies/route'
import { POST as restorePost } from './posts/[id]/restore/route'
import { PATCH as editReply, DELETE as deleteReply } from './replies/[id]/route'
import { POST as restoreReply } from './replies/[id]/restore/route'
import { GET as navCounts } from './nav-counts/route'
import { POST as visit } from './visit/route'
import { GET as trash } from './trash/route'

const ID = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const rpc = vi.fn()
const json = (body: unknown, method = 'POST') =>
  new NextRequest('http://localhost/x', { method, body: JSON.stringify(body) })

function login() {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { rpc } as never,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  login()
})

describe('Anmeldung', () => {
  it('jede Schnittstelle gibt ohne Anmeldung 401 und fragt die Datenbank nicht', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    })
    const results = await Promise.all([
      helpful(json({ target_type: 'post', target_id: ID })),
      hide(json({ target_type: 'post', target_id: ID, hidden: true })),
      resolve(json({ target_type: 'post', target_id: ID, action: 'dismiss' })),
      setSolution(json({ reply_id: ID }, 'PUT'), ctx(ID)),
      reply(json({ body: 'Hallo' }), ctx(ID)),
      restorePost(json({}), ctx(ID)),
      editReply(json({ body: 'Hallo' }, 'PATCH'), ctx(ID)),
      deleteReply(json({}, 'DELETE'), ctx(ID)),
      restoreReply(json({}), ctx(ID)),
      navCounts(),
      visit(),
      trash(),
    ])
    expect(results.map((r) => r.status)).toEqual(Array(12).fill(401))
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('Hilfreich', () => {
  it('schaltet um und gibt Zustand und Zahl zurück', async () => {
    rpc.mockResolvedValue({ data: { helpful: true, count: 4 }, error: null })
    const res = await helpful(json({ target_type: 'reply', target_id: ID }))
    expect(await res.json()).toEqual({ helpful: true, count: 4 })
    expect(rpc).toHaveBeenCalledWith('forum_toggle_helpful', { p_target_type: 'reply', p_target_id: ID })
  })

  it('gibt 403 für Eigenes und 400 für ungültiges Ziel', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM03', message: 'Für Eigenes kannst du nicht „hilfreich“ geben.' } })
    expect((await helpful(json({ target_type: 'post', target_id: ID }))).status).toBe(403)
    expect((await helpful(json({ target_type: 'user', target_id: ID }))).status).toBe(400)
  })
})

describe('Moderation', () => {
  it('Ausblenden: gibt 403 für Nicht-Admins (Datenbank lehnt ab)', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM03', message: 'Das dürfen nur Admins.' } })
    expect((await hide(json({ target_type: 'post', target_id: ID, hidden: true }))).status).toBe(403)
  })

  it('Ausblenden: reicht den Zustand durch', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect((await hide(json({ target_type: 'reply', target_id: ID, hidden: false }))).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('forum_set_hidden', { p_target_type: 'reply', p_target_id: ID, p_hidden: false })
  })

  it('Ausblenden: gibt 400, wenn „hidden“ fehlt', async () => {
    expect((await hide(json({ target_type: 'post', target_id: ID }))).status).toBe(400)
  })

  it('Meldungen bearbeiten: nur hide oder dismiss', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect((await resolve(json({ target_type: 'post', target_id: ID, action: 'dismiss' }))).status).toBe(200)
    expect((await resolve(json({ target_type: 'post', target_id: ID, action: 'delete' }))).status).toBe(400)
  })
})

describe('Lösung', () => {
  it('markiert und nimmt zurück', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect((await setSolution(json({ reply_id: OTHER }, 'PUT'), ctx(ID))).status).toBe(200)
    expect(rpc).toHaveBeenLastCalledWith('forum_set_solution', { p_post_id: ID, p_reply_id: OTHER })
    expect((await setSolution(json({ reply_id: null }, 'PUT'), ctx(ID))).status).toBe(200)
    expect(rpc).toHaveBeenLastCalledWith('forum_set_solution', { p_post_id: ID, p_reply_id: null })
  })

  it('gibt 403, wenn nicht der Fragesteller', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM03', message: 'Nur wer die Frage gestellt hat, kann eine Lösung markieren.' } })
    expect((await setSolution(json({ reply_id: OTHER }, 'PUT'), ctx(ID))).status).toBe(403)
  })

  it('gibt 404 bei ungültiger Beitrags-Kennung', async () => {
    expect((await setSolution(json({ reply_id: null }, 'PUT'), ctx('nope'))).status).toBe(404)
  })
})

describe('Antworten', () => {
  it('legt eine Antwort an (201)', async () => {
    rpc.mockResolvedValue({ data: OTHER, error: null })
    const res = await reply(json({ body: '  Danke für den Tipp!  ' }), ctx(ID))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: OTHER })
    expect(rpc).toHaveBeenCalledWith('forum_create_reply', { p_post_id: ID, p_body: 'Danke für den Tipp!' })
  })

  it('gibt 404, wenn der Beitrag inzwischen gelöscht wurde', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM02', message: 'Dieser Beitrag wurde inzwischen gelöscht.' } })
    const res = await reply(json({ body: 'Hallo' }), ctx(ID))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toContain('gelöscht')
  })

  it('gibt 400 bei leerer oder zu langer Antwort', async () => {
    expect((await reply(json({ body: '   ' }), ctx(ID))).status).toBe(400)
    expect((await reply(json({ body: 'x'.repeat(3001) }), ctx(ID))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('bearbeitet und löscht eigene Antworten, gibt 403 bei fremden', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect((await editReply(json({ body: 'Neu' }, 'PATCH'), ctx(ID))).status).toBe(200)
    expect((await deleteReply(json({}, 'DELETE'), ctx(ID))).status).toBe(200)
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM03', message: 'Du kannst nur eigene Antworten löschen.' } })
    expect((await deleteReply(json({}, 'DELETE'), ctx(ID))).status).toBe(403)
  })
})

describe('Papierkorb', () => {
  it('stellt Beiträge und Antworten wieder her', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect((await restorePost(json({}), ctx(ID))).status).toBe(200)
    expect(rpc).toHaveBeenLastCalledWith('forum_restore_post', { p_id: ID })
    expect((await restoreReply(json({}), ctx(ID))).status).toBe(200)
    expect(rpc).toHaveBeenLastCalledWith('forum_restore_reply', { p_id: ID })
  })

  it('gibt 404, wenn nichts im Papierkorb liegt', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM02', message: 'Dieser Beitrag liegt nicht im Papierkorb.' } })
    expect((await restorePost(json({}), ctx(ID))).status).toBe(404)
  })

  it('listet den Papierkorb', async () => {
    rpc.mockResolvedValue({ data: [{ kind: 'post', id: ID }], error: null })
    expect((await (await trash()).json()).items).toHaveLength(1)
  })
})

describe('Zähler', () => {
  it('liefert die Seitenleisten-Zähler ohne Zwischenspeicher', async () => {
    rpc.mockResolvedValue({ data: { new_posts: 2, new_replies: 1, open_reports: 0 }, error: null })
    const res = await navCounts()
    expect(await res.json()).toEqual({ new_posts: 2, new_replies: 1, open_reports: 0 })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('merkt sich den Besuch der Übersicht', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect((await visit()).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('forum_mark_overview_visited', undefined)
  })
})
