import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { IHK_DEFAULT_SCALE } from '@/lib/graded-assessments'

vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({ get: () => undefined }) }))
vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))

import { createClient } from '@/lib/supabase-server'

const inserted: unknown[] = []

function setup(o: { user?: { id: string } | null; role?: string } = {}) {
  const profile = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: o.role ?? 'teacher', department_id: null }, error: null }),
  }
  const templates = {
    insert: vi.fn((row: unknown) => { inserted.push(row); return templates }),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
  }
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: o.user === undefined ? { id: 'u1' } : o.user } }) },
    from: vi.fn((t: string) => (t === 'profiles' ? profile : templates)),
  } as never)
}

const post = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/assessments/schluessel-vorlagen', {
    method: 'POST',
    body: JSON.stringify(body),
  })

describe('POST /api/admin/assessments/schluessel-vorlagen', () => {
  beforeEach(() => { vi.clearAllMocks(); inserted.length = 0 })

  it('401 ohne Anmeldung, 403 für Azubis', async () => {
    setup({ user: null })
    expect((await POST(post({ name: 'x', scale: IHK_DEFAULT_SCALE }))).status).toBe(401)
    setup({ role: 'student' })
    expect((await POST(post({ name: 'x', scale: IHK_DEFAULT_SCALE }))).status).toBe(403)
  })
  it('400 bei leerem oder zu langem Namen', async () => {
    setup()
    expect((await POST(post({ name: '  ', scale: IHK_DEFAULT_SCALE }))).status).toBe(400)
    expect((await POST(post({ name: 'x'.repeat(61), scale: IHK_DEFAULT_SCALE }))).status).toBe(400)
  })
  it('400 bei ungültigem Schlüssel', async () => {
    setup()
    const bad = IHK_DEFAULT_SCALE.map((b) => (b.grade === 3 ? { ...b, minPercent: 90 } : b))
    expect((await POST(post({ name: 'x', scale: bad }))).status).toBe(400)
    expect(inserted).toHaveLength(0)
  })
  it('201 und setzt den Besitzer serverseitig, privat als Standard', async () => {
    setup()
    const res = await POST(post({ name: ' Mein  Schlüssel ', scale: IHK_DEFAULT_SCALE, owner_id: 'fremd' }))
    expect(res.status).toBe(201)
    expect(inserted[0]).toMatchObject({ owner_id: 'u1', name: 'Mein Schlüssel', shared: false })
  })
})
