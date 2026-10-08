import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'

vi.mock('../../_lib/auth', () => ({ requireAdmin: vi.fn(), writeAuditLog: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireAdmin } from '../../_lib/auth'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `q${i}`)

function setup(draftIds: string[], questionsImpl: (chunk: string[]) => { data?: unknown; error?: unknown }) {
  const inCalls: string[][] = []
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'graded_assessments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'a1', status: 'draft', title: 'LN', part: 1, department_id: 'dept',
              opens_at: new Date(Date.now() - 1000).toISOString(),
              draft_question_ids: draftIds, exam_question_sets: null,
            },
          }),
          update,
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockImplementation((_c: string, chunk: string[]) => {
          inCalls.push(chunk)
          return Promise.resolve(questionsImpl(chunk))
        }),
      }
    }),
  }
  vi.mocked(requireAdmin).mockResolvedValue({
    error: null, user: { id: 'u' }, supabase, role: 'admin', isSuperAdmin: true, departmentId: 'dept',
  } as never)
  return { inCalls, update }
}

const open = () =>
  PATCH(
    new NextRequest('http://localhost/api/admin/assessments/a1', {
      method: 'PATCH', body: JSON.stringify({ action: 'open' }), headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ id: 'a1' }) },
  )

describe('PATCH /api/admin/assessments/[id] – open', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks large selections in chunks of 100 and freezes the draft ids', async () => {
    const all = ids(250)
    const { inCalls, update } = setup(all, (chunk) => ({
      data: chunk.map((id) => ({ id, type: 'multiple_choice', is_active: true })),
    }))
    const res = await open()
    expect(res.status).toBe(200)
    expect(inCalls.map((c) => c.length)).toEqual([100, 100, 50])
    expect((await res.json()).removedCount).toBe(0)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'open', question_ids_snapshot: all }))
  })

  it('reports a failed question lookup as 500 instead of "0 active questions"', async () => {
    setup(ids(10), () => ({ data: null, error: { message: 'boom' } }))
    const res = await open()
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toMatch(/0 aktive/)
  })

  it('rejects when fewer than 5 active questions remain and names the count', async () => {
    setup(ids(6), (chunk) => ({
      data: chunk.map((id, i) => ({ id, type: 'multiple_choice', is_active: i < 3 })),
    }))
    const res = await open()
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nur 3 aktive/)
  })

  it('removes deactivated questions and reports how many', async () => {
    const { update } = setup(ids(8), (chunk) => ({
      data: chunk.map((id, i) => ({ id, type: 'multiple_choice', is_active: i !== 0 })),
    }))
    const res = await open()
    expect((await res.json()).removedCount).toBe(1)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ question_ids_snapshot: ids(8).slice(1) }))
  })
})
