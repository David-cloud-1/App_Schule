import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'
import { GET } from './route'

vi.mock('../_lib/auth', () => ({ requireAdmin: vi.fn() }))
import { requireAdmin } from '../_lib/auth'

function makeRequest(url: string) {
  return new NextRequest(url)
}

beforeEach(() => vi.clearAllMocks())

function authAs(opts: { isSuperAdmin: boolean }) {
  const { client } = chainMock(() => ({
    data: [{ id: 'q-1', question_text: 'Alt', deleted_at: '2026-10-27T00:00:00Z' }],
  }))
  vi.mocked(requireAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'a@a.de' },
    supabase: client,
    role: opts.isSuperAdmin ? 'admin' : 'department_admin',
    isSuperAdmin: opts.isSuperAdmin,
    departmentId: 'dept-1',
  })
}

describe('GET /api/admin/trash', () => {
  it('lehnt einen unbekannten Inhaltstyp ab', async () => {
    authAs({ isSuperAdmin: true })
    const res = await GET(makeRequest('http://localhost/x?type=nonsense'))
    expect(res.status).toBe(400)
  })

  it('zeigt dem Super-Admin gelöschte Fragen', async () => {
    authAs({ isSuperAdmin: true })
    const res = await GET(makeRequest('http://localhost/x?type=question'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.items).toHaveLength(1)
  })

  it('zeigt einem Bereichs-Admin keine gelöschten Fragen (nur Super-Admin, bis PROJ-48)', async () => {
    authAs({ isSuperAdmin: false })
    const res = await GET(makeRequest('http://localhost/x?type=question'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.items).toEqual([])
  })
})
