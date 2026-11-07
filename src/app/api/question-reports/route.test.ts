import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'
import { GET, POST } from './route'

const USER = { id: 'user-1' }
const Q = '550e8400-e29b-41d4-a716-446655440001'

function post(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

function setup(opts: { user?: unknown; rpc?: { data?: unknown; error?: unknown }; rows?: unknown[] }) {
  const rpc = vi.fn(async () => opts.rpc ?? { data: 'report-id', error: null })
  const { client } = chainMock(() => ({ data: opts.rows ?? [], error: null }))
  const supabase = Object.assign(client, {
    auth: { getUser: async () => ({ data: { user: opts.user === undefined ? USER : opts.user } }) },
    rpc,
  })
  vi.mocked(createClient).mockResolvedValue(supabase as never)
  return { rpc }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/question-reports', () => {
  it('verlangt eine Anmeldung', async () => {
    setup({ user: null })
    const res = await POST(post({ question_id: Q, reason: 'veraltet' }))
    expect(res.status).toBe(401)
  })

  it('lehnt ungültige Eingaben ab, ohne die Datenbank zu fragen', async () => {
    const { rpc } = setup({})
    const res = await POST(post({ question_id: Q, reason: 'sonstiges' }))
    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('ruft report_question mit den geprüften Werten auf', async () => {
    const { rpc } = setup({})
    const res = await POST(post({ question_id: Q, reason: 'veraltet', note: ' kurz ' }))
    expect(res.status).toBe(201)
    expect(rpc).toHaveBeenCalledWith('report_question', {
      p_question_id: Q,
      p_reason: 'veraltet',
      p_note: 'kurz',
      p_option_id: null,
    })
  })

  it('übersetzt Fehler der Datenbank-Funktion', async () => {
    setup({ rpc: { error: { code: '23505', message: 'ALREADY_REPORTED' } } })
    const res = await POST(post({ question_id: Q, reason: 'veraltet' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('schon gemeldet')
  })

  it('zeigt bei unbekannten Fehlern keinen technischen Text', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setup({ rpc: { error: { code: 'XX000', message: 'relation does not exist' } } })
    const res = await POST(post({ question_id: Q, reason: 'veraltet' }))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('relation')
  })
})

describe('GET /api/question-reports', () => {
  it('verlangt eine Anmeldung', async () => {
    setup({ user: null })
    expect((await GET()).status).toBe(401)
  })

  it('blendet bei stillem Schließen die Rückmeldung aus und markiert Ungelesenes', async () => {
    setup({
      rows: [
        { id: 'a', status: 'korrigiert', silent: true, response_text: 'geheim', feedback_read_at: null },
        { id: 'b', status: 'nicht_uebernommen', silent: false, response_text: 'ok', feedback_read_at: null },
        { id: 'c', status: 'offen', silent: false, response_text: null, feedback_read_at: null },
        { id: 'd', status: 'korrigiert', silent: false, response_text: null, feedback_read_at: '2026-11-01T00:00:00Z' },
      ],
    })
    const body = await (await GET()).json()
    const byId = Object.fromEntries(body.items.map((i: { id: string }) => [i.id, i]))
    expect(byId.a.response_text).toBeNull()
    expect(byId.a.unread).toBe(false)
    expect(byId.b.unread).toBe(true)
    expect(byId.c.unread).toBe(false)
    expect(byId.d.unread).toBe(false)
  })
})
