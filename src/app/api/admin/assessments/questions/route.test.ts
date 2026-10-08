import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from './route'
import { POST } from './import/route'

vi.mock('../../_lib/auth', () => ({ requireAdmin: vi.fn(), writeAuditLog: vi.fn() }))
vi.mock('@/lib/assessment-questions', () => ({ fetchSelectableQuestions: vi.fn() }))

import { requireAdmin } from '../../_lib/auth'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'

const unauth = { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, supabase: null }
const admin = { error: null, user: { id: 'u' }, supabase: {}, role: 'admin', isSuperAdmin: true, departmentId: 'dept' }

const post = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/assessments/questions/import', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  })

describe('GET /api/admin/assessments/questions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(unauth as never)
    expect((await GET()).status).toBe(401)
  })

  it('returns the selectable questions of the admin department across all subjects', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin as never)
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(fetchSelectableQuestions).toHaveBeenCalledWith(admin.supabase, 'dept')
    expect((await res.json()).questions).toEqual([])
  })

  it('returns 500 when loading fails', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin as never)
    vi.mocked(fetchSelectableQuestions).mockRejectedValue(new Error('boom'))
    expect((await GET()).status).toBe(500)
  })
})

describe('POST /api/admin/assessments/questions/import', () => {
  beforeEach(() => vi.clearAllMocks())

  const valid = { question_text: 'Frage?', options: ['A', 'B', 'C', 'D'], correct_index: 1, fach_code: null }

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(unauth as never)
    expect((await POST(post({ questions: [valid] }))).status).toBe(401)
  })

  it('rejects questions without a confirmed correct answer', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin as never)
    const res = await POST(post({ questions: [{ ...valid, correct_index: null }] }))
    expect(res.status).toBe(400)
  })

  it('rejects a correct_index outside the options', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin as never)
    const res = await POST(post({ questions: [{ ...valid, correct_index: 4 }] }))
    expect(res.status).toBe(400)
  })
})
