import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const DEPT_TOUR = '22222222-2222-4222-8222-222222222222'

function makeRequest(body: unknown) {
  const url = new URL('http://localhost/api/admin/context/department')
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makeSupabase(role: 'admin' | 'department_admin', deptExists = true) {
  const { client } = chainMock((table) => {
    if (table === 'profiles') return { data: { role, department_id: 'dept-sped' } }
    if (table === 'departments') return { data: deptExists ? { id: DEPT_TOUR } : null }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } }) },
  })
  return client
}

describe('POST /api/admin/context/department', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 for a department_admin (no switcher)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('department_admin') as never)
    const res = await POST(makeRequest({ department_id: DEPT_TOUR }))
    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin', false) as never)
    const res = await POST(makeRequest({ department_id: DEPT_TOUR }))
    expect(res.status).toBe(404)
  })

  it('returns 400 for a non-uuid payload', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin') as never)
    const res = await POST(makeRequest({ department_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('sets the switcher cookie for a super-admin on a valid department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin') as never)
    const res = await POST(makeRequest({ department_id: DEPT_TOUR }))
    expect(res.status).toBe(200)
    const cookie = res.cookies.get('admin_department_id')
    expect(cookie?.value).toBe(DEPT_TOUR)
  })
})
