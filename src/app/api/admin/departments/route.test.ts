import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

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

function makeSupabase(role: 'admin' | 'department_admin' = 'admin', insertError: unknown = null) {
  const { client } = chainMock((table, calls) => {
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
  return client
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

  it('lists all departments for the super-admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin') as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.departments).toHaveLength(1)
    expect(body.departments[0].code).toBe('SPED')
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
