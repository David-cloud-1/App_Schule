import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH, DELETE } from './route'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({ get: () => undefined }) }))
vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'
const QID_1 = '880e8400-e29b-41d4-a716-446655440001'
const QID_2 = '880e8400-e29b-41d4-a716-446655440002'

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}
const ctx = { params: Promise.resolve({ id: 'set-1' }) }

let lastWrites: ReturnType<typeof chainMock>['writes'] = []

function setup({
  user = { id: ADMIN_ID } as unknown,
  role = 'department_admin',
  ownDepartment = 'dept-sped',
  setDepartment = 'dept-sped' as string | null,
  setExists = true,
} = {}) {
  const mock = chainMock(
    (table, calls) => {
      if (table === 'profiles') return { data: { role, department_id: ownDepartment } }
      if (table === 'exam_question_sets') {
        if (hasCall(calls, 'update')) return { data: { id: 'set-1', name: 'Neu', question_ids: [QID_1, QID_2] } }
        if (!setExists) return { data: null }
        return { data: { part: 1, department_id: setDepartment } }
      }
      return {}
    },
    { auth: { getUser: () => Promise.resolve({ data: { user } }) } },
  )
  lastWrites = mock.writes
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
}

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/admin/exam-sets/[id]', () => {
  it('returns 401 without a login', async () => {
    setup({ user: null })
    expect((await PATCH(makeRequest({ name: 'x' }), ctx)).status).toBe(401)
  })

  it('returns 403 for a student', async () => {
    setup({ role: 'student' })
    expect((await PATCH(makeRequest({ name: 'x' }), ctx)).status).toBe(403)
  })

  it('returns 404 for an unknown set', async () => {
    setup({ setExists: false })
    expect((await PATCH(makeRequest({ name: 'x' }), ctx)).status).toBe(404)
  })

  it('hides a set of another department and writes nothing', async () => {
    setup({ setDepartment: 'dept-tourismus' })
    const res = await PATCH(makeRequest({ question_ids: [QID_1] }), ctx)
    expect(res.status).toBe(404)
    expect(lastWrites).toHaveLength(0)
  })

  it('replaces the questions of a set in the own department', async () => {
    setup()
    const res = await PATCH(makeRequest({ name: 'Neu', question_ids: [QID_1, QID_2], duration_minutes: 45 }), ctx)
    expect(res.status).toBe(200)
    expect(lastWrites.find((w) => w.table === 'exam_question_sets')?.payload).toEqual({
      name: 'Neu',
      question_ids: [QID_1, QID_2],
      duration_minutes: 45,
    })
    expect((await res.json()).set.question_ids).toEqual([QID_1, QID_2])
  })

  it('still toggles is_active on its own', async () => {
    setup()
    const res = await PATCH(makeRequest({ is_active: true }), ctx)
    expect(res.status).toBe(200)
    expect(lastWrites[0].payload).toEqual({ is_active: true })
  })

  it('rejects an empty question list, non-UUID ids and oversized lists', async () => {
    setup()
    expect((await PATCH(makeRequest({ question_ids: [] }), ctx)).status).toBe(400)
    expect((await PATCH(makeRequest({ question_ids: ['kein-uuid'] }), ctx)).status).toBe(400)
    expect((await PATCH(makeRequest({ question_ids: Array(1001).fill(QID_1) }), ctx)).status).toBe(400)
    expect(lastWrites).toHaveLength(0)
  })
})

describe('DELETE /api/admin/exam-sets/[id]', () => {
  it('deletes a set of the own department', async () => {
    setup()
    const res = await DELETE({} as NextRequest, ctx)
    expect(res.status).toBe(200)
    expect(lastWrites[0]).toMatchObject({ table: 'exam_question_sets', method: 'delete' })
  })

  it('hides a set of another department', async () => {
    setup({ setDepartment: 'dept-tourismus' })
    expect((await DELETE({} as NextRequest, ctx)).status).toBe(404)
    expect(lastWrites).toHaveLength(0)
  })
})
