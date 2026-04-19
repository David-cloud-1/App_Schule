import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '550e8400-e29b-41d4-a716-446655440001'

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

function makeSupabaseMock({
  user = { id: ADMIN_ID } as unknown,
  role = 'admin',
  sets = [] as unknown[],
  insertedSet = { id: 'set-1' } as unknown,
  dbError = null as unknown,
} = {}) {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role }, error: null }),
            }),
          }),
        }
      }
      if (table === 'exam_question_sets') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: sets, error: dbError }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: insertedSet, error: dbError }),
            }),
          }),
        }
      }
      return {}
    },
  }
}

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

  it('returns 403 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ user: null }) as never)
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/admin/exam-sets', () => {
  const validBody = {
    name: 'KSK Prüfungsset 2026',
    part: 2,
    question_ids: ['880e8400-e29b-41d4-a716-446655440001'],
    is_active: false,
  }

  it('creates exam set for admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
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

  it('returns 400 for invalid part number', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ ...validBody, part: 5 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty question_ids', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ ...validBody, question_ids: [] }))
    expect(res.status).toBe(400)
  })
})
