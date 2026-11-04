import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { POST } from './route'

const DEPT = '11111111-1111-4111-8111-111111111111'

function makeSupabase(role: string | null) {
  const { client } = chainMock(
    (table) => {
      if (table === 'profiles') return { data: role ? { role, department_id: DEPT } : null }
      if (table === 'departments') return { data: [{ id: DEPT }] }
      return {}
    },
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: role ? { id: 'u1', email: 'a@a.de' } : null } }) } }
  )
  return client
}

function req(body: unknown) {
  return new NextRequest('http://localhost/api/admin/context/bereich', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as never)
})

describe('POST /api/admin/context/bereich (PROJ-70)', () => {
  it('lehnt Azubis ab', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('student') as never)
    expect((await POST(req({ bereich: 'alle' }))).status).toBe(403)
  })

  it('lässt eine Lehrkraft „Alle Bereiche“ wählen und setzt nur das neue Cookie', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('teacher') as never)
    const res = await POST(req({ bereich: 'alle' }))
    expect(res.status).toBe(200)
    expect(res.cookies.get('admin_bereich')?.value).toBe('alle')
    expect(res.cookies.get('admin_department_id')).toBeUndefined()
  })

  it('setzt für den Super-Admin bei einem konkreten Bereich auch das alte Cookie', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin') as never)
    const res = await POST(req({ bereich: DEPT }))
    expect(res.cookies.get('admin_bereich')?.value).toBe(DEPT)
    expect(res.cookies.get('admin_department_id')?.value).toBe(DEPT)
  })

  it('lässt eine Lehrkraft das Konto-Cookie des Super-Admins nicht setzen', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('teacher') as never)
    const res = await POST(req({ bereich: DEPT }))
    expect(res.cookies.get('admin_bereich')?.value).toBe(DEPT)
    expect(res.cookies.get('admin_department_id')).toBeUndefined()
  })

  it('meldet 404 für einen unbekannten Bereich und 400 für Unsinn', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('teacher') as never)
    expect((await POST(req({ bereich: '22222222-2222-4222-8222-222222222222' }))).status).toBe(404)
    expect((await POST(req({ bereich: 'irgendwas' }))).status).toBe(400)
  })
})
