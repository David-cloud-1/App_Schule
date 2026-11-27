import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'

vi.mock('../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn(), writeAuditLog: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/assessment-submit', () => ({ finalizeOverdueAttempts: vi.fn().mockResolvedValue(0) }))

import { requireTeacherOrAdmin } from '../../_lib/auth'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `q${i}`)

function setup(draftIds: string[], questionsImpl: (chunk: string[]) => { data?: unknown; error?: unknown }, extra: Record<string, unknown> = {}) {
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
              draft_question_ids: draftIds, exam_question_sets: null, ...extra,
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
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null, user: { id: 'u' }, supabase, role: 'admin', isSuperAdmin: true, isDepartmentAdmin: false, suggestedDepartmentId: 'dept',
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

describe('PATCH /api/admin/assessments/[id] – open mit Gruppen (PROJ-76)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('friert die Reihenfolge beider Gruppen beim Öffnen ein und setzt den Zähler zurück', async () => {
    const all = ids(6)
    const { update } = setup(
      all,
      (chunk) => ({
        data: chunk.map((id) => ({
          id, type: 'multiple_choice', is_active: true,
          answer_options: [1, 2, 3].map((n) => ({ id: `${id}-o${n}`, option_text: `Option ${n}`, display_order: n })),
        })),
      }),
      { groups_enabled: true, group_mix_seed: 123 },
    )
    const res = await open()
    expect(res.status).toBe(200)
    const payload = update.mock.calls[0][0] as { group_orders: { A: { questionOrder: string[] }; B: { questionOrder: string[] } }; group_join_counter: number }
    expect(payload.group_orders.A.questionOrder).toEqual(all)
    expect([...payload.group_orders.B.questionOrder].sort()).toEqual([...all].sort())
    expect(payload.group_orders.B.questionOrder).not.toEqual(all)
    expect(payload.group_join_counter).toBe(0)
  })

  it('ohne Gruppen entsteht keine gespeicherte Reihenfolge', async () => {
    const { update } = setup(ids(6), (chunk) => ({ data: chunk.map((id) => ({ id, type: 'multiple_choice', is_active: true })) }))
    await open()
    expect(update.mock.calls[0][0]).not.toHaveProperty('group_orders')
  })
})

// ── PROJ-134: Beitritt verlängern, Schließen ohne Wettlauf ───────────────────

function setupAblauf(assessment: Record<string, unknown>, updatedRows: { id: string }[] = [{ id: 'a1' }]) {
  const chain: Record<string, unknown> = {}
  const updates: Record<string, unknown>[] = []
  chain.eq = vi.fn(() => chain)
  chain.select = vi.fn(() => Promise.resolve({ data: updatedRows, error: null }))
  chain.then = (resolve: (v: unknown) => void) => resolve({ error: null })
  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'a1', title: 'LN', part: 1, department_id: 'dept', exam_question_sets: null, ...assessment },
      }),
      update: vi.fn((patch: Record<string, unknown>) => {
        updates.push(patch)
        return chain
      }),
    })),
  }
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null, user: { id: 'u' }, supabase, role: 'teacher', isSuperAdmin: false, isDepartmentAdmin: false, suggestedDepartmentId: 'dept',
  } as never)
  return { updates }
}

const patch = (body: unknown) =>
  PATCH(
    new NextRequest('http://localhost/api/admin/assessments/a1', {
      method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ id: 'a1' }) },
  )

describe('PATCH /api/admin/assessments/[id] – verlängern (PROJ-134)', () => {
  beforeEach(() => vi.clearAllMocks())

  const future = (min: number) => new Date(Date.now() + min * 60000).toISOString()

  it('verlängert „Beitritt bis“ bei einem offenen Nachweis', async () => {
    const closesAt = future(10)
    const { updates } = setupAblauf({ status: 'open', closes_at: closesAt })
    const res = await patch({ action: 'extend_join', closesAt: future(70) })
    expect(res.status).toBe(200)
    expect(updates).toHaveLength(1)
    expect(Object.keys(updates[0])).toEqual(['closes_at'])
  })

  it('lehnt eine Verkürzung ab', async () => {
    const { updates } = setupAblauf({ status: 'open', closes_at: future(60) })
    const res = await patch({ action: 'extend_join', closesAt: future(30) })
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('lehnt das Verlängern nach dem automatischen Schließen ab', async () => {
    setupAblauf({ status: 'closed', closes_at: future(-30), auto_closed_at: future(-20) })
    const res = await patch({ action: 'extend_join', closesAt: future(60) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/automatisch geschlossen/)
  })

  it('meldet einen Wettlauf (Stand hat sich geändert) als 409', async () => {
    setupAblauf({ status: 'open', closes_at: future(10) }, [])
    const res = await patch({ action: 'extend_join', closesAt: future(70) })
    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/admin/assessments/[id] – schließen (PROJ-134)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ist nach dem automatischen Schließen kein Fehler und schreibt keinen zweiten Eintrag', async () => {
    const { updates } = setupAblauf({ status: 'closed', closes_at: '2026-11-27T09:00:00Z', auto_closed_at: '2026-11-27T09:05:00Z' })
    const res = await patch({ action: 'close' })
    expect(res.status).toBe(200)
    expect((await res.json()).alreadyClosed).toBe(true)
    expect(updates).toHaveLength(0)
  })

  it('meldet „bereits geschlossen“, wenn jemand gleichzeitig geschlossen hat', async () => {
    setupAblauf({ status: 'open', closes_at: '2026-11-27T09:00:00Z' }, [])
    const res = await patch({ action: 'close' })
    expect(res.status).toBe(200)
    expect((await res.json()).alreadyClosed).toBe(true)
  })
})
