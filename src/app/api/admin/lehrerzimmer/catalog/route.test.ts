import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { GET } from './route'

vi.mock('../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../../_lib/auth'

type Result = { data: unknown[] | null; error: unknown }

function builder(result: Result) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'order']) b[m] = vi.fn().mockReturnValue(b)
  b.limit = vi.fn().mockResolvedValue(result)
  return b
}

function login(tables: Record<string, Result>, suggested: string | null = null) {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { from: vi.fn((t: string) => builder(tables[t])) } as never,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: suggested,
  })
}

const ok = (data: unknown[]): Result => ({ data, error: null })

beforeEach(() => vi.clearAllMocks())

describe('GET /api/admin/lehrerzimmer/catalog', () => {
  it('gibt 403 für Azubis', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    })
    expect((await GET()).status).toBe(403)
  })

  it('liefert Auswahl und die Bereiche der eigenen Zuständigkeiten', async () => {
    login({
      departments: ok([{ id: 'd1', name: 'Spedition', code: 'SPED' }]),
      subjects: ok([{ id: 's1', name: 'BGP', code: 'BGP', department_id: 'd1' }]),
      teacher_subject_assignments: ok([{ department_id: 'd1' }, { department_id: 'd1' }]),
    })
    const json = await (await GET()).json()
    expect(json.departments).toHaveLength(1)
    expect(json.subjects).toHaveLength(1)
    expect(json.own_department_ids).toEqual(['d1'])
  })

  it('nimmt bei Admins ohne Zuständigkeit den Arbeits-Bereich', async () => {
    login(
      { departments: ok([]), subjects: ok([]), teacher_subject_assignments: ok([]) },
      'dept-admin',
    )
    expect((await (await GET()).json()).own_department_ids).toEqual(['dept-admin'])
  })

  it('gibt 500 mit verständlichem Text, wenn eine Abfrage scheitert', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    login({
      departments: { data: null, error: { message: 'db down' } },
      subjects: ok([]),
      teacher_subject_assignments: ok([]),
    })
    const res = await GET()
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toContain('db down')
  })
})
