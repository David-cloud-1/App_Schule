import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
import { createClient, createServiceClient } from '@/lib/supabase-server'

const TARGET_ID = '550e8400-e29b-41d4-a716-446655440099'
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const DEPT = '11111111-1111-4111-8111-111111111111'
const TARGET = {
  id: TARGET_ID,
  display_name: 'Anna Test',
  department_id: DEPT,
  total_xp: 1200,
  current_streak: 6,
  longest_streak: 9,
  coin_balance: 45,
}

function call(body: unknown, id = TARGET_ID) {
  const req = new NextRequest(`http://localhost/api/admin/users/${id}/reset-progress`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
  return POST(req, { params: Promise.resolve({ id }) })
}

function adminClient(role: 'admin' | 'department_admin' = 'admin') {
  const mock = chainMock(
    (table) => (table === 'profiles' ? { data: { role, department_id: DEPT } } : {}),
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.de' } } }) } },
  )
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
  return mock
}

function serviceClient(opts: { failTable?: string; target?: unknown } = {}) {
  const mock = chainMock((table, calls) => {
    const isDelete = calls.some((c) => c.method === 'delete')
    const isUpdate = calls.some((c) => c.method === 'update')
    if (table === 'profiles' && !isUpdate) return { data: opts.target === undefined ? TARGET : opts.target }
    if (opts.failTable === table && (isDelete || isUpdate)) return { error: { message: 'boom' } }
    if (isDelete) return { count: 3 }
    return {}
  })
  Object.assign(mock.client, { auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: 'anna@x.de' } } }) } } })
  vi.mocked(createServiceClient).mockReturnValue(mock.client as never)
  return mock
}

describe('POST /api/admin/users/[id]/reset-progress (PROJ-59)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('403 für den Bereichs-Admin, ohne etwas zu löschen', async () => {
    adminClient('department_admin')
    const svc = serviceClient()
    expect((await call({ confirmName: 'Anna Test' })).status).toBe(403)
    expect(svc.writes).toHaveLength(0)
  })

  it('400 beim eigenen Konto', async () => {
    adminClient()
    const svc = serviceClient()
    expect((await call({ confirmName: 'Ich' }, ADMIN_ID)).status).toBe(400)
    expect(svc.writes).toHaveLength(0)
  })

  it('400 ohne passende Bestätigung, es wird nichts gelöscht', async () => {
    adminClient()
    const svc = serviceClient()
    expect((await call({ confirmName: 'anna test' })).status).toBe(400)
    expect((await call({})).status).toBe(400)
    expect(svc.writes).toHaveLength(0)
  })

  it('setzt zurück: löscht den Lernverlauf, nullt das Profil, schont Leistungsnachweise und protokolliert die alten Werte', async () => {
    const admin = adminClient()
    const svc = serviceClient()
    const res = await call({ confirmName: ' Anna Test ' })
    expect(res.status).toBe(200)

    const deletedTables = svc.writes.filter((w) => w.method === 'delete').map((w) => w.table)
    expect(deletedTables).toEqual([
      'quiz_answers', 'quiz_sessions', 'user_badges', 'blitz_rounds', 'blitz_starts',
      'betrieb_platzierungen', 'user_shop_items', 'exam_sessions',
    ])
    // Prüfungssimulationen nur ohne Nachweis-Id: Leistungsnachweise bleiben
    const examQuery = svc.queries.find((q) => q.table === 'exam_sessions')
    expect(examQuery?.calls).toContainEqual({ method: 'is', args: ['assessment_id', null] })
    expect(svc.writes.some((w) => w.table === 'graded_assessments')).toBe(false)

    expect(svc.writes.find((w) => w.table === 'profiles' && w.method === 'update')?.payload).toEqual({
      total_xp: 0, current_streak: 0, longest_streak: 0, last_session_date: null, coin_balance: 0,
    })
    const log = admin.writes.find((w) => w.table === 'admin_audit_log')
    expect(log?.payload).toMatchObject({
      action_type: 'user.progress_reset',
      object_id: TARGET_ID,
      details: { old: { total_xp: 1200, current_streak: 6, longest_streak: 9, coin_balance: 45 } },
    })
  })

  it('bei Abbruch bleibt das Profil unverändert, es gibt kein Protokoll und ein Hinweis zum Wiederholen', async () => {
    const admin = adminClient()
    const svc = serviceClient({ failTable: 'user_shop_items' })
    const res = await call({ confirmName: 'Anna Test' })
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('noch einmal')
    expect(svc.writes.some((w) => w.table === 'profiles' && w.method === 'update')).toBe(false)
    expect(admin.writes.find((w) => w.table === 'admin_audit_log')).toBeUndefined()
  })

  it('ohne Anzeigenamen gilt die E-Mail als Bestätigung', async () => {
    adminClient()
    serviceClient({ target: { ...TARGET, display_name: null } })
    expect((await call({ confirmName: 'anna@x.de' })).status).toBe(200)
  })
})
