import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET, POST } from './route'

vi.mock('../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../../_lib/auth'

const ID = '11111111-1111-4111-8111-111111111111'
const rpc = vi.fn()

function asTeacher() {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { rpc } as never,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  })
}

function get(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/lehrerzimmer/posts')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

function post(body: unknown) {
  return new NextRequest('http://localhost/api/admin/lehrerzimmer/posts', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const valid = { category: 'frage', title: 'Wie erkläre ich Incoterms?', body: 'Hat jemand eine gute Übung dazu?' }

beforeEach(() => {
  vi.clearAllMocks()
  asTeacher()
})

describe('GET /api/admin/lehrerzimmer/posts', () => {
  it('gibt 401 ohne Anmeldung', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    })
    expect((await GET(get())).status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('gibt 403 für Azubis (keine Lehrer-Rolle)', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    })
    expect((await GET(get())).status).toBe(403)
  })

  it('reicht Filter an die Datenbank durch und liefert 20 + hasMore', async () => {
    rpc.mockResolvedValue({ data: Array.from({ length: 21 }, (_, i) => ({ id: `p${i}` })), error: null })
    const res = await GET(get({ category: 'frage', only_open: '1', sort: 'helpful', offset: '20', q: 'Frachtbrief' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(20)
    expect(json.hasMore).toBe(true)
    expect(rpc).toHaveBeenCalledWith('forum_list_posts', expect.objectContaining({
      p_category: 'frage',
      p_only_open: true,
      p_mine: false,
      p_sort: 'helpful',
      p_offset: 20,
      p_limit: 21,
      p_query: 'Frachtbrief',
    }))
  })

  it('hasMore ist false bei einer vollen letzten Seite ohne Rest', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }], error: null })
    const json = await (await GET(get())).json()
    expect(json.items).toHaveLength(2)
    expect(json.hasMore).toBe(false)
  })

  it('gibt 400 bei ungültigem Filter', async () => {
    expect((await GET(get({ sort: 'zufall' }))).status).toBe(400)
    expect((await GET(get({ department_id: 'kein-uuid' }))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('gibt 500 mit allgemeinem Text bei unbekanntem Datenbankfehler', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockResolvedValue({ data: null, error: { code: '42P01', message: 'relation does not exist' } })
    const res = await GET(get())
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toContain('relation')
  })
})

describe('POST /api/admin/lehrerzimmer/posts', () => {
  it('legt einen Beitrag an (201)', async () => {
    rpc.mockResolvedValue({ data: ID, error: null })
    const res = await POST(post({ ...valid, department_id: null, subject_id: null }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: ID })
    expect(rpc).toHaveBeenCalledWith('forum_create_post', {
      p_category: 'frage',
      p_title: valid.title,
      p_body: valid.body,
      p_department_id: null,
      p_subject_id: null,
    })
  })

  it('gibt 400 bei zu kurzem Titel, ohne die Datenbank zu fragen', async () => {
    const res = await POST(post({ ...valid, title: 'Hi' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Titel')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('gibt 400 bei kaputtem JSON', async () => {
    expect((await POST(post('{kaputt'))).status).toBe(400)
  })

  it('gibt 429 beim Flut-Schutz der Datenbank', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM01', message: 'Bitte kurz warten.' } })
    const res = await POST(post(valid))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toBe('Bitte kurz warten.')
  })

  it('gibt 403 ohne Lehrer-Rolle (Datenbank lehnt ab)', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM03', message: 'Kein Zugang zum Lehrerzimmer.' } })
    expect((await POST(post(valid))).status).toBe(403)
  })
})
