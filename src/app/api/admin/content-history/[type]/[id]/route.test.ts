import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'
import { GET } from './route'

vi.mock('../../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../../../_lib/auth'

function makeRequest(url: string) {
  return new NextRequest(url)
}

const VERSIONS = [
  {
    id: 'v2',
    version_number: 2,
    change_type: 'updated',
    data: { question_text: 'Neu' },
    changed_by: 'u1',
    changed_by_label: null,
    batch_id: null,
    created_at: '2026-10-27T12:00:00Z',
    profiles: { display_name: 'Frau Muster' },
  },
  {
    id: 'v1',
    version_number: 1,
    change_type: 'created',
    data: { question_text: 'Alt' },
    changed_by: null,
    changed_by_label: 'Stand bei Einführung',
    batch_id: null,
    created_at: '2026-01-01T00:00:00Z',
    profiles: null,
  },
]

beforeEach(() => vi.clearAllMocks())

function authAs(role: 'admin' | 'teacher' = 'admin') {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'a@a.de' },
    supabase: chainMock(() => ({ data: VERSIONS, count: VERSIONS.length })).client,
    role,
    isSuperAdmin: role === 'admin',
    isDepartmentAdmin: false,
    suggestedDepartmentId: 'dept-1',
  })
}

describe('GET /api/admin/content-history/[type]/[id]', () => {
  it('lehnt unbekannte Inhaltstypen ab', async () => {
    authAs()
    const res = await GET(makeRequest('http://localhost/x'), {
      params: Promise.resolve({ type: 'unknown', id: 'q-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('gibt Versionen neueste zuerst mit Namen der ändernden Person zurück', async () => {
    authAs()
    const res = await GET(makeRequest('http://localhost/x'), {
      params: Promise.resolve({ type: 'question', id: 'q-1' }),
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.versions).toHaveLength(2)
    expect(body.versions[0]).toMatchObject({ versionNumber: 2, changedByName: 'Frau Muster' })
    expect(body.versions[1]).toMatchObject({ versionNumber: 1, changedByName: 'Stand bei Einführung' })
  })

  it('gibt den Fehler von requireTeacherOrAdmin weiter', async () => {
    const { NextResponse } = await import('next/server')
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    })
    const res = await GET(makeRequest('http://localhost/x'), {
      params: Promise.resolve({ type: 'question', id: 'q-1' }),
    })
    expect(res.status).toBe(401)
  })
})
