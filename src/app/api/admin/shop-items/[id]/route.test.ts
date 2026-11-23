import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from './route'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

// Schreiben läuft über den Dienstschlüssel (QA M1): derselbe Mock für beide Clients
function useClient(c: unknown) {
  vi.mocked(createClient).mockResolvedValue(c as never)
  vi.mocked(createServiceClient).mockReturnValue(c as never)
}

const ITEM_ID = '33333333-3333-4333-8333-333333333333'

function makeRequest(body?: unknown) {
  const url = new URL('http://localhost/api/admin/shop-items/' + ITEM_ID)
  return new NextRequest(url, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

function makeCtx(id = ITEM_ID) {
  return { params: Promise.resolve({ id }) }
}

function makeAdminSupabase(opts: {
  role?: string
  departmentId?: string
  itemDepartmentId?: string | null
  itemCategory?: string
  itemIconKey?: string
  updateError?: unknown
} = {}) {
  const { client } = chainMock((table, calls) => {
    if (table === 'profiles') {
      return { data: { role: opts.role ?? 'admin', department_id: opts.departmentId ?? 'dept-sped' } }
    }
    if (table === 'admin_audit_log') return {}
    if (table === 'departments') return { data: { id: 'dept-sped', code: 'SPED', hof_name: 'Speditionshof' } }
    if (table === 'shop_items') {
      if (hasCall(calls, 'update')) return { error: opts.updateError ?? null }
      // existence/department check via .select('department_id, category, icon_key').eq('id', id).maybeSingle()
      return {
        data:
          opts.itemDepartmentId === null
            ? null
            : {
                department_id: opts.itemDepartmentId ?? 'dept-sped',
                category: opts.itemCategory ?? 'fahrzeuge',
                icon_key: opts.itemIconKey ?? 'sattelschlepper-rot',
              },
      }
    }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid', email: 'a@a.com' } } }) },
  })
  return client
}

function makeUnauthSupabase() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

describe('PATCH /api/admin/shop-items/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    useClient(makeUnauthSupabase() as never)
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    useClient(makeAdminSupabase({ role: 'student' }) as never)
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(403)
  })

  it('returns 404 when the item does not exist', async () => {
    useClient(makeAdminSupabase({ itemDepartmentId: null }) as never)
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(404)
  })

  it('returns 400 when no fields are provided', async () => {
    useClient(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest({}), makeCtx())
    expect(res.status).toBe(400)
  })

  it('returns 400 for a non-positive price', async () => {
    useClient(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest({ price: 0 }), makeCtx())
    expect(res.status).toBe(400)
  })

  it('toggles is_active', async () => {
    useClient(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('updates name/description/price together', async () => {
    useClient(makeAdminSupabase() as never)
    const res = await PATCH(
      makeRequest({ name: 'Neu', description: 'Neue Beschreibung', price: 99 }),
      makeCtx(),
    )
    expect(res.status).toBe(200)
  })

  it('updates category and icon_key together when they match (PROJ-26)', async () => {
    useClient(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest({ category: 'gebaeude_deko', icon_key: 'hoftor' }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('returns 400 when a new icon_key does not match the existing category (PROJ-26)', async () => {
    useClient(
      makeAdminSupabase({ itemCategory: 'fahrzeuge', itemIconKey: 'sattelschlepper-rot' }) as never,
    )
    // Kategorie bleibt 'fahrzeuge' (nicht im Request), 'hoftor' gehört aber zu 'gebaeude_deko'.
    const res = await PATCH(makeRequest({ icon_key: 'hoftor' }), makeCtx())
    expect(res.status).toBe(400)
  })

  it('sets, changes and clears the manual rarity (null = automatic, PROJ-32)', async () => {
    for (const rarity_override of ['selten', 'episch', 'standard', null]) {
      useClient(makeAdminSupabase() as never)
      const res = await PATCH(makeRequest({ rarity_override }), makeCtx())
      expect(res.status).toBe(200)
    }
  })

  it('returns 400 for an unknown rarity value (PROJ-32)', async () => {
    useClient(makeAdminSupabase() as never)
    const res = await PATCH(makeRequest({ rarity_override: 'legendaer' }), makeCtx())
    expect(res.status).toBe(400)
  })

  it('returns 500 when the update fails', async () => {
    useClient(
      makeAdminSupabase({ updateError: { message: 'DB error' } }) as never,
    )
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(500)
  })

  it('a teacher gets 404 when the item belongs to another department than the scope bar (PROJ-127)', async () => {
    useClient(
      makeAdminSupabase({ role: 'teacher', departmentId: 'dept-sped', itemDepartmentId: 'dept-tour' }) as never,
    )
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(404)
  })

  it('a teacher can update an item in the chosen department (PROJ-127)', async () => {
    useClient(
      makeAdminSupabase({ role: 'teacher', departmentId: 'dept-sped', itemDepartmentId: 'dept-sped' }) as never,
    )
    const res = await PATCH(makeRequest({ is_active: false }), makeCtx())
    expect(res.status).toBe(200)
  })
})
