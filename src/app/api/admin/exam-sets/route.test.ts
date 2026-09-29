import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '550e8400-e29b-41d4-a716-446655440001'

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

const SPED = 'dept-sped'
// Prüfungsteile der Spedition (Teil 1–3), wie in exam_parts hinterlegt
const EXAM_PARTS = [1, 2, 3].map((n) => ({
  id: `part-${n}`, code: `P${n}`, part_number: n, name: `Teil ${n}`, title: `Teil ${n}`, subtitle: '',
  short_label: `T${n}`, icon_name: 'BookOpen', color: '#fff', question_count: 15, duration_minutes: 90,
  open_question_share: '0', default_subject_id: null, exam_part_subjects: [],
}))

function makeSupabaseMock({
  user = { id: ADMIN_ID } as unknown,
  role = 'admin',
  sets = [] as unknown[],
  insertedSet = { id: 'set-1' } as unknown,
  dbError = null as unknown,
} = {}) {
  const mock = chainMock(
    (table, calls) => {
      if (table === 'profiles') return { data: { role, department_id: SPED } }
      if (table === 'exam_parts') return { data: EXAM_PARTS }
      if (table === 'exam_question_sets') {
        if (hasCall(calls, 'insert')) return { data: insertedSet, error: dbError }
        return { data: sets, error: dbError }
      }
      return {}
    },
    { auth: { getUser: () => Promise.resolve({ data: { user } }) } },
  )
  lastWrites = mock.writes
  return mock.client
}
let lastWrites: ReturnType<typeof chainMock>['writes'] = []

beforeEach(() => vi.clearAllMocks())

describe('GET /api/admin/exam-sets', () => {
  it('returns exam sets for admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ sets: [{ id: 'set-1', name: 'Test', part: 2, is_active: true }] }) as never)
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.sets).toHaveLength(1)
  })

  it('returns 403 for non-admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ role: 'user' }) as never)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ user: null }) as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })
})

describe('POST /api/admin/exam-sets', () => {
  const validBody = {
    name: 'KSK Prüfungsset 2026',
    part: 2,
    question_ids: ['880e8400-e29b-41d4-a716-446655440001'],
    is_active: false,
  }

  it('creates exam set for admin in the admin\'s department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
    expect(lastWrites.find((w) => w.table === 'exam_question_sets')?.payload).toMatchObject({ department_id: SPED, part: 2 })
  })

  it('returns 403 for non-admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ role: 'user' }) as never)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing name', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ ...validBody, name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for a part the department does not have', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ ...validBody, part: 5 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Prüfungsteil 5')
  })

  it('returns 400 for a non-positive part number', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ ...validBody, part: 0 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty question_ids', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ ...validBody, question_ids: [] }))
    expect(res.status).toBe(400)
  })
})
