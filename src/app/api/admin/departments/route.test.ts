import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { chainMock, hasCall, selectArg } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const departmentRow = {
  id: 'dept-sped',
  code: 'SPED',
  slug: 'spedition',
  domain: 'spedilern.vercel.app',
  name: 'Speditionskaufleute',
  app_name: 'SpediLern',
  tagline: '',
  meta_title: 'SpediLern',
  meta_description: '',
  icon_name: 'Truck',
  currency_name: 'Frachtmünzen',
  hof_name: 'Speditionshof',
  hof_short_name: 'Hof',
  prompt_role: 'Experte',
  target_group: 'Azubis',
  prompt_notes: null,
  class_levels: [10, 11, 12],
  pseudonym_nouns: [],
}

function makeRequest(body?: unknown) {
  const url = new URL('http://localhost/api/admin/departments')
  return new NextRequest(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

let lastMock: ReturnType<typeof chainMock>

function makeSupabase(role: 'admin' | 'department_admin' = 'admin', insertError: unknown = null) {
  lastMock = chainMock((table, calls) => {
    if (table === 'profiles') return { data: { role, department_id: 'dept-sped' } }
    if (table === 'admin_audit_log') return {}
    if (table === 'departments') {
      if (hasCall(calls, 'insert')) return { data: { id: 'new-dept-uuid' }, error: insertError }
      return { data: [departmentRow], error: null }
    }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } }) },
  })
  return lastMock.client
}

const validCreateBody = {
  code: 'TOUR',
  slug: 'tourismus',
  name: 'Tourismuskaufleute',
  app_name: 'TouristikLern',
  meta_title: 'TouristikLern',
  currency_name: 'Reisetaler',
  hof_name: 'Reisebüro',
  prompt_role: 'Experte für Tourismus',
  target_group: 'angehende Tourismuskaufleute',
}

describe('GET /api/admin/departments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists departments for a department_admin too (read-only)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('department_admin') as never)
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("department_admin only gets the trimmed fields, not other departments' internal config (PROJ-24 BUG-3)", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('department_admin') as never)
    await GET()
    const list = lastMock.queries.find((q) => q.table === 'departments')!
    const requestedColumns = selectArg(list.calls)
    expect(requestedColumns).toBe('id, name, code, domain')
    expect(requestedColumns).not.toContain('prompt_notes')
    expect(requestedColumns).not.toContain('prompt_role')
  })

  it('lists all departments with full fields for the super-admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin') as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.departments).toHaveLength(1)
    expect(body.departments[0].code).toBe('SPED')
    expect(body.departments[0].promptNotes).toBeDefined()
  })
})

describe('POST /api/admin/departments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 for a department_admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('department_admin') as never)
    const res = await POST(makeRequest(validCreateBody))
    expect(res.status).toBe(403)
  })

  it('rejects a lowercase code', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin') as never)
    const res = await POST(makeRequest({ ...validCreateBody, code: 'tour' }))
    expect(res.status).toBe(400)
  })

  it('creates the department for a super-admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin') as never)
    const res = await POST(makeRequest(validCreateBody))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('new-dept-uuid')
  })

  it('returns 409 on a duplicate code/slug/domain', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin', { code: '23505' }) as never)
    const res = await POST(makeRequest(validCreateBody))
    expect(res.status).toBe(409)
  })
})
