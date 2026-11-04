import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { GET as listPeople } from './route'
import { GET as preview } from './[id]/preview/route'
import { POST as revert } from './[id]/revert/route'

const PERSON = '33333333-3333-4333-8333-333333333333'
const FROM = '2026-11-01T00:00:00.000Z'
const TO = '2026-11-05T00:00:00.000Z'
const ctx = { params: Promise.resolve({ id: PERSON }) }

type Rpc = (name: string, args: Record<string, unknown>) => { data?: unknown; error?: unknown }

function makeSupabase(role: string | null, rpcImpl: Rpc = () => ({ data: [] })) {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => ({ data: null, error: null, ...rpcImpl(name, args) }))
  const table = (name: string) => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'maybeSingle', 'single', 'insert']) b[m] = () => b
    b.then = (f: (v: unknown) => unknown) =>
      Promise.resolve({
        data: name === 'profiles' ? (role ? { role, department_id: 'd1' } : null) : [],
        error: null,
      }).then(f)
    return b
  }
  return {
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: role ? { id: 'u1', email: 'a@a.de' } : null } }) },
      from: vi.fn(table),
      rpc,
    },
    rpc,
  }
}

const url = (q: string) => `http://localhost/x?${q}`
const post = (body: unknown) =>
  new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as never)
})

describe('Auswertung je Person (PROJ-70)', () => {
  it('ist nur für den Super-Admin', async () => {
    for (const role of ['teacher', 'department_admin']) {
      vi.mocked(createClient).mockResolvedValue(makeSupabase(role).client as never)
      expect((await listPeople(new NextRequest(url(`from=${FROM}&to=${TO}`)))).status).toBe(403)
    }
  })

  it('prüft den Zeitraum', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin').client as never)
    expect((await listPeople(new NextRequest(url(`from=${TO}&to=${FROM}`)))).status).toBe(400)
    expect((await listPeople(new NextRequest(url('from=2020-01-01T00:00:00Z&to=2026-01-01T00:00:00Z')))).status).toBe(400)
    expect((await listPeople(new NextRequest(url('from=gestern')))).status).toBe(400)
  })

  it('liefert die Zählung je Person', async () => {
    const { client, rpc } = makeSupabase('admin', () => ({
      data: [{ person_id: null, person_label: 'Qualitäts-Korrekturlauf', angelegt: 1, geaendert: '4', geloescht: 0, wiederhergestellt: 0 }],
    }))
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await listPeople(new NextRequest(url(`from=${FROM}&to=${TO}`)))
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('content_changes_per_person', { p_from: FROM, p_to: TO, p_department_id: null })
    const body = await res.json()
    expect(body.people[0]).toMatchObject({ name: 'Qualitäts-Korrekturlauf', created: 1, updated: 4 })
  })
})

describe('Vorschau der Sammel-Rücknahme (PROJ-70)', () => {
  it('ist nur für den Super-Admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('teacher').client as never)
    expect((await preview(new NextRequest(url(`from=${FROM}&to=${TO}`)), ctx)).status).toBe(403)
  })

  it('zählt Betroffene und nennt Konflikte einzeln', async () => {
    const plan = [
      { content_type: 'question', content_id: 'q1', title: 'A?', action: 'restore', conflict: false },
      { content_type: 'question', content_id: 'q2', title: 'B?', action: 'restore', conflict: true },
      { content_type: 'topic', content_id: 't1', title: 'Thema', action: 'trash', conflict: false },
      { content_type: 'topic', content_id: 't2', title: 'Weg', action: 'skip', conflict: false },
    ]
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin', () => ({ data: plan })).client as never)
    const res = await preview(new NextRequest(url(`from=${FROM}&to=${TO}`)), ctx)
    const body = await res.json()
    expect(body).toMatchObject({ total: 3, toRestore: 2, toTrash: 1, conflictCount: 1, skippedCount: 1 })
    expect(body.conflicts).toEqual([{ contentType: 'question', contentId: 'q2', title: 'B?' }])
  })
})

describe('Sammel-Rücknahme ausführen (PROJ-70)', () => {
  const plan = [
    { content_type: 'question', content_id: 'q1', action: 'restore', conflict: false },
    { content_type: 'question', content_id: 'q2', action: 'restore', conflict: true },
    { content_type: 'topic', content_id: 't1', action: 'skip', conflict: false },
  ]

  it('ist nur für den Super-Admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('department_admin').client as never)
    expect((await revert(post({ from: FROM, to: TO }), ctx)).status).toBe(403)
  })

  it('überspringt Konflikte standardmäßig und nimmt den Rest als einen Vorgang zurück', async () => {
    const { client, rpc } = makeSupabase('admin', (name) =>
      name === 'person_revert_plan' ? { data: plan } : { data: [{ r_batch: 'b1', r_done: 1, r_skipped: 0 }] }
    )
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await revert(post({ from: FROM, to: TO }), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ batchId: 'b1', restored: 1, skipped: 0 })
    const call = rpc.mock.calls.find((c) => c[0] === 'revert_person_changes')!
    expect(call[1]).toMatchObject({
      p_include_conflicts: false,
      p_items: [{ type: 'question', id: 'q1' }],
      p_batch: null,
    })
  })

  it('nimmt mit includeConflicts auch Konflikte zurück', async () => {
    const { client, rpc } = makeSupabase('admin', (name) =>
      name === 'person_revert_plan' ? { data: plan } : { data: [{ r_batch: 'b1', r_done: 2, r_skipped: 0 }] }
    )
    vi.mocked(createClient).mockResolvedValue(client as never)
    await revert(post({ from: FROM, to: TO, includeConflicts: true }), ctx)
    const call = rpc.mock.calls.find((c) => c[0] === 'revert_person_changes')!
    expect((call[1].p_items as unknown[]).length).toBe(2)
  })

  it('teilt große Rücknahmen in Stücke und hängt sie an denselben Vorgang', async () => {
    const big = Array.from({ length: 230 }, (_, i) => ({ content_type: 'question', content_id: `q${i}`, action: 'restore', conflict: false }))
    let n = 0
    const { client, rpc } = makeSupabase('admin', (name) =>
      name === 'person_revert_plan'
        ? { data: big }
        : { data: [{ r_batch: 'b1', r_done: n++ < 2 ? 100 : 30, r_skipped: 0 }] }
    )
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await revert(post({ from: FROM, to: TO }), ctx)
    expect(await res.json()).toEqual({ batchId: 'b1', restored: 230, skipped: 0 })
    const calls = rpc.mock.calls.filter((c) => c[0] === 'revert_person_changes')
    expect(calls).toHaveLength(3)
    expect(calls[0][1].p_batch).toBeNull()
    expect(calls[1][1].p_batch).toBe('b1')
    expect(calls[2][1].p_batch).toBe('b1')
  })

  it('meldet eine unterbrochene Rücknahme samt Vorgang und bisherigem Stand', async () => {
    const big = Array.from({ length: 150 }, (_, i) => ({ content_type: 'question', content_id: `q${i}`, action: 'restore', conflict: false }))
    let calls = 0
    const { client } = makeSupabase('admin', (name) => {
      if (name === 'person_revert_plan') return { data: big }
      return calls++ === 0 ? { data: [{ r_batch: 'b1', r_done: 100, r_skipped: 0 }] } : { error: { message: 'timeout' } }
    })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await revert(post({ from: FROM, to: TO }), ctx)
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ batchId: 'b1', restored: 100 })
  })
})
