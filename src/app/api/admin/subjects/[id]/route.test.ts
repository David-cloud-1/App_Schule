import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'
import { PATCH } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }))

import { createClient } from '@/lib/supabase-server'
import { revalidateTag } from 'next/cache'
import { SUBJECTS_CACHE_TAG } from '@/lib/departments-server'

function mock() {
  return chainMock(
    (table) => {
      if (table === 'profiles') return { data: { role: 'teacher', department_id: 'd1' } }
      if (table === 'departments') return { data: [{ id: 'd1' }] }
      if (table === 'subjects') return { data: { department_id: 'd1' } }
      return {}
    },
    { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) } },
  )
}

const patch = (body: unknown) =>
  PATCH(
    new NextRequest('http://localhost/api/admin/subjects/s1', { method: 'PATCH', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: 's1' }) },
  )

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/admin/subjects/[id] – Fach ausblenden (PROJ-131, B41)', () => {
  it('blendet auch ein Fach mit sichtbaren Fragen aus und leert den Zwischenspeicher der Azubi-Seite', async () => {
    const m = mock()
    vi.mocked(createClient).mockResolvedValue(m.client as never)
    const res = await patch({ is_active: false })
    expect(res.status).toBe(200)
    expect(m.writes.find((w) => w.table === 'subjects')?.payload).toEqual({ is_active: false })
    expect(m.writes.find((w) => w.table === 'admin_audit_log')?.payload).toMatchObject({ action_type: 'subject.deactivate' })
    expect(revalidateTag).toHaveBeenCalledWith(SUBJECTS_CACHE_TAG, { expire: 0 })
  })

  it('protokolliert Ausblenden auch mit expected_version als subject.deactivate (BUG-3)', async () => {
    const m = mock()
    vi.mocked(createClient).mockResolvedValue(m.client as never)
    const res = await patch({ is_active: false, expected_version: 1 })
    expect(res.status).toBe(200)
    expect(m.writes.find((w) => w.table === 'admin_audit_log')?.payload).toMatchObject({ action_type: 'subject.deactivate' })
  })

  it('leert den Zwischenspeicher beim Umbenennen nicht', async () => {
    vi.mocked(createClient).mockResolvedValue(mock().client as never)
    await patch({ name: 'Neu' })
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
