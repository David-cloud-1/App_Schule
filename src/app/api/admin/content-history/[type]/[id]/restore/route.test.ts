import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('../../../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn(), writeAuditLog: vi.fn() }))
import { requireTeacherOrAdmin, writeAuditLog } from '../../../../_lib/auth'

function makeRequest(body?: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

const params = { params: Promise.resolve({ type: 'question', id: 'q-1' }) }

function setup(rpcResult: { error?: { message: string } | null } = {}) {
  const rpc = vi.fn().mockResolvedValue({ error: rpcResult.error ?? null })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'a@a.de' },
    supabase: { rpc } as never,
    role: 'admin',
    isSuperAdmin: true,
    isDepartmentAdmin: false,
    suggestedDepartmentId: 'dept-1',
  })
  return { rpc }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/admin/content-history/[type]/[id]/restore', () => {
  it('lehnt unbekannte Inhaltstypen ab', async () => {
    setup()
    const res = await POST(makeRequest({ version_number: 1 }), {
      params: Promise.resolve({ type: 'nonsense', id: 'q-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('lehnt einen Body ohne version_number ab', async () => {
    setup()
    const res = await POST(makeRequest({}), params)
    expect(res.status).toBe(400)
  })

  it('ruft restore_content_version mit den richtigen Parametern auf und loggt die Wiederherstellung', async () => {
    const { rpc } = setup()
    const res = await POST(makeRequest({ version_number: 3 }), params)
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('restore_content_version', {
      p_content_type: 'question',
      p_content_id: 'q-1',
      p_version_number: 3,
    })
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action_type: 'question.restore', object_id: 'q-1' })
    )
  })

  it('meldet 403, wenn die Datenbank-Funktion die Berechtigung verweigert', async () => {
    setup({ error: { message: 'nicht berechtigt' } })
    const res = await POST(makeRequest({ version_number: 1 }), params)
    expect(res.status).toBe(403)
  })

  it('meldet 404, wenn die Version nicht existiert', async () => {
    setup({ error: { message: 'Version nicht gefunden' } })
    const res = await POST(makeRequest({ version_number: 99 }), params)
    expect(res.status).toBe(404)
  })
})
