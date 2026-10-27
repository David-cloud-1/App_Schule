import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'
import { POST, DELETE } from './route'

vi.mock('../../../_lib/auth', () => ({ requireAdmin: vi.fn(), writeAuditLog: vi.fn() }))
import { requireAdmin, writeAuditLog } from '../../../_lib/auth'

const params = { params: Promise.resolve({ type: 'question', id: 'q-1' }) }

beforeEach(() => vi.clearAllMocks())

function authAs(opts: { isSuperAdmin: boolean; deletedAt?: string | null }) {
  const deletedAt = opts.deletedAt === undefined ? '2026-10-27T00:00:00Z' : opts.deletedAt
  const { client, writes } = chainMock(() => ({
    data: { deleted_at: deletedAt },
  }))
  vi.mocked(requireAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'a@a.de' },
    supabase: client,
    role: opts.isSuperAdmin ? 'admin' : 'department_admin',
    isSuperAdmin: opts.isSuperAdmin,
    departmentId: 'dept-1',
  })
  return { writes }
}

describe('POST /api/admin/trash/[type]/[id] — Wiederherstellen', () => {
  it('setzt deleted_at zurück auf null', async () => {
    const { writes } = authAs({ isSuperAdmin: false })
    const res = await POST({} as unknown as NextRequest, params)
    expect(res.status).toBe(200)
    expect(writes.find((w) => w.table === 'questions')?.payload).toEqual({ deleted_at: null })
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action_type: 'question.restore_from_trash' })
    )
  })
})

describe('DELETE /api/admin/trash/[type]/[id] — endgültig entfernen', () => {
  it('verweigert Bereichs-Admins das endgültige Löschen', async () => {
    authAs({ isSuperAdmin: false })
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(403)
  })

  it('lehnt ab, wenn der Inhalt gar nicht im Papierkorb liegt', async () => {
    authAs({ isSuperAdmin: true, deletedAt: null })
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(400)
  })

  it('löscht endgültig, wenn Super-Admin und im Papierkorb', async () => {
    const { writes } = authAs({ isSuperAdmin: true })
    const res = await DELETE({} as unknown as NextRequest, params)
    expect(res.status).toBe(200)
    expect(writes.some((w) => w.table === 'questions' && w.method === 'delete')).toBe(true)
  })
})
