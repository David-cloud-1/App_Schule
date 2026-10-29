import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET, PATCH, DELETE } from './route'

vi.mock('../../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../../../_lib/auth'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const rpc = vi.fn()
const req = (method = 'GET', body?: unknown) =>
  new NextRequest(`http://localhost/api/admin/lehrerzimmer/posts/${ID}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { rpc } as never,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  })
})

describe('GET /posts/[id]', () => {
  it('gibt 401 ohne Anmeldung', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    })
    expect((await GET(req(), ctx(ID))).status).toBe(401)
  })

  it('gibt 404 bei ungültiger Kennung, ohne die Datenbank zu fragen', async () => {
    expect((await GET(req(), ctx('abc'))).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('gibt 404, wenn der Beitrag nicht sichtbar ist (gelöscht, ausgeblendet, fremd)', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect((await GET(req(), ctx(ID))).status).toBe(404)
    expect(rpc).toHaveBeenCalledTimes(1) // kein „gelesen“ für Unsichtbares
  })

  it('liefert den Beitrag und markiert ihn als gelesen', async () => {
    const thread = { post: { id: ID }, replies: [] }
    rpc.mockResolvedValueOnce({ data: thread, error: null }).mockResolvedValueOnce({ data: null, error: null })
    const res = await GET(req(), ctx(ID))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(thread)
    expect(rpc).toHaveBeenNthCalledWith(1, 'forum_get_thread', { p_post_id: ID })
    expect(rpc).toHaveBeenNthCalledWith(2, 'forum_mark_read', { p_post_id: ID })
  })

  it('zeigt den Beitrag auch, wenn das Markieren als gelesen scheitert', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc
      .mockResolvedValueOnce({ data: { post: { id: ID }, replies: [] }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'XX000', message: 'boom' } })
    expect((await GET(req(), ctx(ID))).status).toBe(200)
  })
})

describe('PATCH /posts/[id]', () => {
  const body = { category: 'tipp', title: 'Neuer Titel hier', body: 'Neuer, langer genug Text.' }

  it('bearbeitet den eigenen Beitrag', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const res = await PATCH(req('PATCH', body), ctx(ID))
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('forum_update_post', expect.objectContaining({ p_id: ID, p_category: 'tipp' }))
  })

  it('gibt 403 bei fremdem Beitrag', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM03', message: 'Du kannst nur eigene Beiträge bearbeiten.' } })
    expect((await PATCH(req('PATCH', body), ctx(ID))).status).toBe(403)
  })

  it('gibt 404, wenn der Beitrag inzwischen gelöscht wurde', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM02', message: 'Dieser Beitrag wurde inzwischen gelöscht.' } })
    expect((await PATCH(req('PATCH', body), ctx(ID))).status).toBe(404)
  })

  it('gibt 400 bei ungültiger Eingabe', async () => {
    expect((await PATCH(req('PATCH', { ...body, title: 'x' }), ctx(ID))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('DELETE /posts/[id]', () => {
  it('löscht (Papierkorb)', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect((await DELETE(req('DELETE'), ctx(ID))).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('forum_delete_post', { p_id: ID })
  })

  it('gibt 403 bei fremdem Beitrag', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM03', message: 'Du kannst nur eigene Beiträge löschen.' } })
    expect((await DELETE(req('DELETE'), ctx(ID))).status).toBe(403)
  })
})
