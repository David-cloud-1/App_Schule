import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH, DELETE } from './route'

vi.mock('../../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn(), writeAuditLog: vi.fn() }))

import { requireTeacherOrAdmin } from '../../../_lib/auth'

const OWNER = 'teacher-uuid'
const QID = '6f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a01'

interface Opts {
  role?: 'teacher' | 'admin'
  question?: { id: string; is_private: boolean; owner_id: string | null } | null
  usedByOpen?: boolean
  updateError?: unknown
  deleteError?: unknown
}

function setup(opts: Opts = {}) {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: opts.updateError ?? null }) })
  const del = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: opts.deleteError ?? null }) })
  const insert = vi.fn().mockResolvedValue({ error: null })

  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'questions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: opts.question !== undefined ? opts.question : { id: QID, is_private: true, owner_id: OWNER },
          }),
          update,
          delete: del,
        }
      }
      if (table === 'graded_assessments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          contains: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: opts.usedByOpen ? [{ id: 'a1' }] : [] }),
        }
      }
      if (table === 'answer_options') {
        return {
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          insert,
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null, user: { id: opts.role === 'admin' ? 'super-admin' : OWNER, email: 'a@a.com' }, supabase,
    role: opts.role ?? 'teacher', isSuperAdmin: opts.role === 'admin', isDepartmentAdmin: false, suggestedDepartmentId: null,
  } as never)

  return { supabase, update, del, insert }
}

const ctx = { params: Promise.resolve({ id: QID }) }
const patchReq = (body: unknown) =>
  new NextRequest(`http://localhost/api/admin/assessments/questions/${QID}`, {
    method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  })
const deleteReq = () => new NextRequest(`http://localhost/api/admin/assessments/questions/${QID}`, { method: 'DELETE' })

describe('PATCH /api/admin/assessments/questions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for a pool (non-private) question', async () => {
    setup({ question: { id: QID, is_private: false, owner_id: null } })
    const res = await PATCH(patchReq({ question_text: 'Neu' }), ctx)
    expect(res.status).toBe(404)
  })

  it("returns 404 for someone else's private question", async () => {
    setup({ question: { id: QID, is_private: true, owner_id: 'other-teacher' } })
    const res = await PATCH(patchReq({ question_text: 'Neu' }), ctx)
    expect(res.status).toBe(404)
  })

  it('allows the super-admin to edit any private question', async () => {
    const { update } = setup({ role: 'admin', question: { id: QID, is_private: true, owner_id: 'some-teacher' } })
    const res = await PATCH(patchReq({ question_text: 'Neu' }), ctx)
    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ question_text: 'Neu' })
  })

  it('returns 400 for an empty body', async () => {
    setup()
    expect((await PATCH(patchReq({}), ctx)).status).toBe(400)
  })

  it('rejects an answer set without exactly one correct option', async () => {
    setup()
    const res = await PATCH(patchReq({ answers: [{ text: 'A', is_correct: true }, { text: 'B', is_correct: true }] }), ctx)
    expect(res.status).toBe(400)
  })

  it('returns 409 while an open assessment uses the question', async () => {
    setup({ usedByOpen: true })
    const res = await PATCH(patchReq({ question_text: 'Neu' }), ctx)
    expect(res.status).toBe(409)
  })

  it('updates text and replaces the answers', async () => {
    const { update, insert } = setup()
    const res = await PATCH(patchReq({ question_text: 'Neu', answers: [{ text: 'A', is_correct: true }, { text: 'B', is_correct: false }] }), ctx)
    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ question_text: 'Neu' })
    expect(insert).toHaveBeenCalledWith([
      { question_id: QID, option_text: 'A', is_correct: true, display_order: 1 },
      { question_id: QID, option_text: 'B', is_correct: false, display_order: 2 },
    ])
  })

  it('returns 500 when saving fails', async () => {
    setup({ updateError: { message: 'x' } })
    const res = await PATCH(patchReq({ question_text: 'Neu' }), ctx)
    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/admin/assessments/questions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for a pool question', async () => {
    setup({ question: { id: QID, is_private: false, owner_id: null } })
    expect((await DELETE(deleteReq(), ctx)).status).toBe(404)
  })

  it("returns 404 for someone else's private question", async () => {
    setup({ question: { id: QID, is_private: true, owner_id: 'other-teacher' } })
    expect((await DELETE(deleteReq(), ctx)).status).toBe(404)
  })

  it('returns 409 while an open assessment uses the question', async () => {
    setup({ usedByOpen: true })
    expect((await DELETE(deleteReq(), ctx)).status).toBe(409)
  })

  it('deletes the question (cascades to answer_options/question_subjects)', async () => {
    const { del } = setup()
    const res = await DELETE(deleteReq(), ctx)
    expect(res.status).toBe(200)
    expect(del).toHaveBeenCalled()
  })

  it('returns 500 when deleting fails', async () => {
    setup({ deleteError: { message: 'x' } })
    expect((await DELETE(deleteReq(), ctx)).status).toBe(500)
  })
})
