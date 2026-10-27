import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'
import { POST, DELETE } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const params = { params: Promise.resolve({ type: 'question', id: 'q-1' }) }

beforeEach(() => vi.clearAllMocks())

function makeSupabase(opts: { role?: 'admin' | 'department_admin'; deletedAt?: string | null } = {}) {
  const { role = 'admin', deletedAt = '2026-10-27T00:00:00Z' } = opts
  const { client, writes } = chainMock((table) => {
    if (table === 'profiles') return { data: { role, department_id: 'dept-1' } }
    if (table === 'admin_audit_log') return {}
    if (table === 'questions') return { data: { deleted_at: deletedAt } }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.de' } } }) },
  })
  return { client, writes }
}

describe('POST /api/admin/trash/[type]/[id] — Wiederherstellen', () => {
  it('setzt deleted_at zurück auf null', async () => {
    const { client, writes } = makeSupabase({ role: 'department_admin' })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST({} as unknown as NextRequest, params)
    expect(res.status).toBe(200)
    expect(writes.find((w) => w.table === 'questions')?.payload).toEqual({ deleted_at: null })
  })
})

describe('DELETE /api/admin/trash/[type]/[id] — endgültig entfernen', () => {
  it('verweigert Bereichs-Admins das endgültige Löschen', async () => {
    const { client } = makeSupabase({ role: 'department_admin' })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(403)
  })

  it('lehnt ab, wenn der Inhalt gar nicht im Papierkorb liegt', async () => {
    const { client } = makeSupabase({ role: 'admin', deletedAt: null })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(400)
  })

  it('löscht endgültig, wenn Super-Admin und im Papierkorb', async () => {
    const { client, writes } = makeSupabase({ role: 'admin' })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(200)
    expect(writes.some((w) => w.table === 'questions' && w.method === 'delete')).toBe(true)
  })
})
