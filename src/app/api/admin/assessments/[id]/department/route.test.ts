import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'

vi.mock('../../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn(), writeAuditLog: vi.fn() }))

import { requireTeacherOrAdmin } from '../../../_lib/auth'

const OLD_DEPT = 'old-dept'
const NEW_DEPT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CREATOR = 'teacher-uuid'

interface AssessmentRow {
  id: string
  status: string
  department_id: string
  created_by: string
  draft_question_ids: string[] | null
  subject_id: string | null
}

function setup(opts: {
  assessment?: Partial<AssessmentRow>
  assessmentMissing?: boolean
  targetActive?: boolean
  questionRows?: { id: string; is_private: boolean; owner_id: string | null }[]
  subjectInNewDept?: boolean
}) {
  const assessment: AssessmentRow = {
    id: 'a1', status: 'draft', department_id: OLD_DEPT, created_by: CREATOR,
    draft_question_ids: ['pool-1', 'priv-1'], subject_id: null,
    ...opts.assessment,
  }
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'graded_assessments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.assessmentMissing ? null : assessment }),
          update,
        }
      }
      if (table === 'departments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.targetActive === false ? null : { id: NEW_DEPT } }),
        }
      }
      if (table === 'questions') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: opts.questionRows ?? [] }),
        }
      }
      if (table === 'subjects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.subjectInNewDept === false ? null : { id: 'subj-1' } }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null, user: { id: CREATOR, email: 'a@a.com' }, supabase,
    role: 'teacher', isSuperAdmin: false, isDepartmentAdmin: false, suggestedDepartmentId: null,
  } as never)

  return { supabase, update, assessment }
}

vi.mock('@/lib/exam-parts', () => ({
  fetchExamParts: vi.fn().mockResolvedValue([
    { partNumber: 1, subjects: [{ id: 's1', code: 'TOUR1' }] },
    { partNumber: 2, subjects: [{ id: 's2', code: 'TOUR2' }] },
  ]),
}))
vi.mock('@/lib/assessment-questions', () => ({
  fetchSelectableQuestions: vi.fn().mockResolvedValue([
    { id: 'priv-1', subject_codes: ['TOUR2'], isPrivate: true },
  ]),
  derivePartNumber: vi.fn().mockReturnValue(2),
}))

function request(body: unknown) {
  return PATCH(
    new NextRequest('http://localhost/api/admin/assessments/a1/department', {
      method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ id: 'a1' }) },
  )
}

describe('PATCH /api/admin/assessments/[id]/department', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the auth error untouched (e.g. 401/403)', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: new Response(null, { status: 401 }) as never, user: null, supabase: null,
    } as never)
    const res = await request({ departmentId: NEW_DEPT })
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid body', async () => {
    setup({})
    const res = await request({ departmentId: 'not-a-uuid' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the assessment is not visible (RLS)', async () => {
    setup({ assessmentMissing: true })
    const res = await request({ departmentId: NEW_DEPT })
    expect(res.status).toBe(404)
  })

  it('rejects once the assessment is no longer a draft', async () => {
    setup({ assessment: { status: 'open' } })
    const res = await request({ departmentId: NEW_DEPT })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nach dem Öffnen fest/)
  })

  it('rejects an inactive or unknown target department', async () => {
    setup({ targetActive: false })
    const res = await request({ departmentId: NEW_DEPT })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht verfügbar/)
  })

  it("drops pool questions, keeps the owner's own private questions, and recomputes the part", async () => {
    const { update } = setup({
      questionRows: [
        { id: 'pool-1', is_private: false, owner_id: null },
        { id: 'priv-1', is_private: true, owner_id: CREATOR },
      ],
    })
    const res = await request({ departmentId: NEW_DEPT })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, removedCount: 1 })
    expect(update).toHaveBeenCalledWith({
      department_id: NEW_DEPT,
      part: 2,
      draft_question_ids: ['priv-1'],
      subject_id: null,
    })
  })

  it('does not keep a private question owned by someone else', async () => {
    const { update } = setup({
      questionRows: [
        { id: 'pool-1', is_private: false, owner_id: null },
        { id: 'priv-1', is_private: true, owner_id: 'someone-else' },
      ],
    })
    const res = await request({ departmentId: NEW_DEPT })
    expect((await res.json()).removedCount).toBe(2)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ draft_question_ids: [] }))
  })

  it('clears the subject category when it does not belong to the new department', async () => {
    const { update } = setup({
      assessment: { subject_id: 'subj-old' },
      questionRows: [],
      subjectInNewDept: false,
    })
    await request({ departmentId: NEW_DEPT })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ subject_id: null }))
  })

  it('is a no-op when the target department equals the current one', async () => {
    const { update } = setup({ assessment: { department_id: NEW_DEPT } })
    const res = await request({ departmentId: NEW_DEPT })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, removedCount: 0 })
    expect(update).not.toHaveBeenCalled()
  })
})
