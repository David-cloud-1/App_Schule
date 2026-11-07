import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const rpc = vi.fn()
const writeAuditLog = vi.fn(async () => {})

vi.mock('../../../_lib/auth', () => ({
  requireTeacherOrAdmin: vi.fn(),
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...(args as [])),
}))
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { POST } from './route'

const Q = '550e8400-e29b-41d4-a716-446655440001'
const ctx = (id = Q) => ({ params: Promise.resolve({ questionId: id }) })
const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'teacher-1', email: 't@x.de' },
    supabase: { rpc },
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  } as never)
})

describe('POST /api/admin/question-reports/[questionId]/close', () => {
  it('gibt die Antwort der Anmeldeprüfung weiter', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    } as never)
    const res = await POST(req({ result: 'korrigiert' }), ctx())
    expect(res.status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('lehnt eine ungültige Fragen-Kennung mit 404 ab', async () => {
    const res = await POST(req({ result: 'korrigiert' }), ctx('abc'))
    expect(res.status).toBe(404)
  })

  it('lehnt ein ungültiges Ergebnis mit 400 ab', async () => {
    const res = await POST(req({ result: 'offen' }), ctx())
    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('schließt ab und schreibt das Protokoll', async () => {
    rpc.mockResolvedValue({ data: { closed: 2, rewarded: 2 }, error: null })
    const res = await POST(req({ result: 'korrigiert', response: 'Danke' }), ctx())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ closed: 2, rewarded: 2 })
    expect(rpc).toHaveBeenCalledWith('close_question_reports', {
      p_question_id: Q,
      p_result: 'korrigiert',
      p_response: 'Danke',
      p_silent: false,
      p_report_ids: null,
    })
    expect(writeAuditLog).toHaveBeenCalledTimes(1)
  })

  it('protokolliert nichts, wenn nichts mehr offen war', async () => {
    rpc.mockResolvedValue({ data: { closed: 0, rewarded: 0 }, error: null })
    const res = await POST(req({ result: 'nicht_uebernommen' }), ctx())
    expect(res.status).toBe(200)
    expect(writeAuditLog).not.toHaveBeenCalled()
  })

  it('meldet fehlende Rechte der Datenbank als 403', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'FORBIDDEN' } })
    const res = await POST(req({ result: 'korrigiert' }), ctx())
    expect(res.status).toBe(403)
  })
})
