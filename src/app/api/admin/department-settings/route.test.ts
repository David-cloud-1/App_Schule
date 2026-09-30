import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from './route'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

function makeRequest(body?: unknown) {
  const url = new URL('http://localhost/api/admin/department-settings')
  return new NextRequest(url, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

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

function makeSupabase(role: 'admin' | 'department_admin' = 'department_admin') {
  const { client } = chainMock((table) => {
    if (table === 'profiles') return { data: { role, department_id: 'dept-sped' } }
    if (table === 'departments') return { data: departmentRow }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } }) },
  })
  return client
}

function makeServiceClient(updateError: unknown = null) {
  const { client } = chainMock((table) => {
    if (table === 'departments') return { error: updateError }
    if (table === 'admin_audit_log') return {}
    if (table === 'profiles') return { data: { department_id: 'dept-sped' } }
    return {}
  })
  return client
}

describe('GET /api/admin/department-settings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the editable fields of the admin\'s own department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('dept-sped')
    expect(body.currencyName).toBe('Frachtmünzen')
  })
})

describe('PATCH /api/admin/department-settings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when no fields are provided', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('department_admin can update the allowed branding fields', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('department_admin') as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ currency_name: 'Reisetaler', hof_name: 'Reisebüro' }))
    expect(res.status).toBe(200)
  })

  it('returns 500 when the update fails', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient({ message: 'DB error' }) as never)
    const res = await PATCH(makeRequest({ currency_name: 'Reisetaler' }))
    expect(res.status).toBe(500)
  })
})
