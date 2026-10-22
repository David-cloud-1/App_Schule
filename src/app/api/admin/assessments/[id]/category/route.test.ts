import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'

vi.mock('../../../_lib/auth', () => ({ requireAdmin: vi.fn(), writeAuditLog: vi.fn() }))

import { requireAdmin, writeAuditLog } from '../../../_lib/auth'

const SUBJECT_ID = '6f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a01'

function makeRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/admin/assessments/a1/category', {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function setup(opts: { status?: string; found?: boolean; subjectFound?: boolean; classes?: string[]; updateError?: unknown } = {}) {
  const updateEq = vi.fn().mockResolvedValue({ error: opts.updateError ?? null })
  const update = vi.fn().mockReturnValue({ eq: updateEq })
  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'subjects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.subjectFound === false ? null : { id: SUBJECT_ID }, error: null }),
        }
      }
      if (table === 'graded_assessments') {
        const builder: Record<string, unknown> = {
          update,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          // Nachweis laden (.maybeSingle) bzw. verwendete Klassen (.not als Abschluss)
          maybeSingle: vi.fn().mockResolvedValue({
            data: opts.found === false ? null : { id: 'a1', title: 'LN', status: opts.status ?? 'closed', department_id: 'dept' },
          }),
          not: vi.fn().mockResolvedValue({ data: (opts.classes ?? []).map((c) => ({ class_name: c })), error: null }),
        }
        return builder
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
  vi.mocked(requireAdmin).mockResolvedValue({
    error: null, user: { id: 'admin', email: 'a@a.com' }, supabase: supabase as never,
    role: 'admin', isSuperAdmin: true, departmentId: 'dept',
  })
  return { update, updateEq }
}

const params = { params: Promise.resolve({ id: 'a1' }) }

describe('PATCH /api/admin/assessments/[id]/category', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt den Fehler von requireAdmin zurück (401/403)', async () => {
    const { NextResponse } = await import('next/server')
    vi.mocked(requireAdmin).mockResolvedValue({ error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, supabase: null })
    const res = await PATCH(makeRequest({ className: 'SP11a' }), params)
    expect(res.status).toBe(401)
  })

  it('lehnt einen leeren Body ab', async () => {
    setup()
    const res = await PATCH(makeRequest({}), params)
    expect(res.status).toBe(400)
  })

  it('lehnt eine zu lange Klasse ab', async () => {
    setup()
    const res = await PATCH(makeRequest({ className: 'x'.repeat(31) }), params)
    expect(res.status).toBe(400)
  })

  it('lehnt ein ungültiges Schuljahr ab', async () => {
    setup()
    const res = await PATCH(makeRequest({ schoolYear: '2026/30' }), params)
    expect(res.status).toBe(400)
  })

  it('liefert 404 für einen unbekannten oder fremden Nachweis', async () => {
    const { update } = setup({ found: false })
    const res = await PATCH(makeRequest({ className: 'SP11a' }), params)
    expect(res.status).toBe(404)
    expect(update).not.toHaveBeenCalled()
  })

  it('lehnt ein Fach aus einem anderen Bereich ab', async () => {
    const { update } = setup({ subjectFound: false })
    const res = await PATCH(makeRequest({ subjectId: SUBJECT_ID }), params)
    expect(res.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('speichert die Ablage auch bei einem geschlossenen Nachweis und vereinheitlicht die Klasse', async () => {
    const { update, updateEq } = setup({ status: 'closed', classes: ['SP11a'] })
    const res = await PATCH(makeRequest({ className: ' sp11a ', subjectId: SUBJECT_ID, schoolYear: '2026/27' }), params)
    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ class_name: 'SP11a', subject_id: SUBJECT_ID, school_year: '2026/27' })
    expect(updateEq).toHaveBeenCalledWith('id', 'a1')
    expect(writeAuditLog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      action_type: 'graded_assessment.category', object_id: 'a1', department_id: 'dept',
    }))
  })

  it('entfernt Klasse und Fach mit null', async () => {
    const { update } = setup()
    const res = await PATCH(makeRequest({ className: null, subjectId: null }), params)
    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ class_name: null, subject_id: null })
  })

  it('ändert nie Prüfungsdaten (nur Ablage-Spalten)', async () => {
    const { update } = setup()
    await PATCH(makeRequest({ className: 'SP11a', title: 'gehackt', opensAt: '2020-01-01T00:00:00Z' }), params)
    const written = Object.keys(update.mock.calls[0][0] as object)
    expect(written.every((k) => ['class_name', 'subject_id', 'school_year'].includes(k))).toBe(true)
  })

  it('meldet 500, wenn das Speichern fehlschlägt', async () => {
    setup({ updateError: { message: 'x' } })
    const res = await PATCH(makeRequest({ className: 'SP11a' }), params)
    expect(res.status).toBe(500)
  })
})
