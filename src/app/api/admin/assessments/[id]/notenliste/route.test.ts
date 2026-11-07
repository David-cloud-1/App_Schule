import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { IHK_DEFAULT_SCALE } from '@/lib/graded-assessments'

vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({ get: () => undefined }) }))
vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
vi.mock('@/lib/answer-key', () => ({
  fetchAnswerKey: vi.fn().mockResolvedValue(
    new Map([['q1', { explanation: null, sampleAnswer: null, options: new Map([['a', true], ['b', false]]) }]]),
  ),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const ctx = { params: Promise.resolve({ id: 'as-1' }) }
const req = (q = '') => new NextRequest(new URL(`http://localhost/api/admin/assessments/as-1/notenliste${q}`))

function setup(o: { user?: { id: string } | null; role?: string; assessment?: unknown; sessions?: unknown[] } = {}) {
  const profile = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: o.role ?? 'teacher', department_id: null }, error: null }),
  }
  const assessment = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: o.assessment === undefined
        ? { title: 'Prüfung 1', part: 1, grading_scale: IHK_DEFAULT_SCALE, excluded_question_ids: [] }
        : o.assessment,
      error: null,
    }),
  }
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: o.user === undefined ? { id: 'u1' } : o.user } }) },
    from: vi.fn((t: string) => (t === 'profiles' ? profile : assessment)),
  } as never)
  const result = Promise.resolve({ data: o.sessions ?? [], error: null })
  const sessionsBuilder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: result.then.bind(result),
  }
  vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn(() => sessionsBuilder) } as never)
}

const done = (id: string, name: string, answer = 'a') => ({
  id, user_id: id, participant_name: name,
  started_at: '2026-10-01T08:00:00Z', ended_at: '2026-10-01T08:30:00Z', status: 'completed', excluded_from_grading: false,
  results_json: {
    parts: { '1': { questions: [{
      id: 'q1', question_text: 'F', type: 'multiple_choice', difficulty: 'easy', part: 1,
      answer_options: [{ id: 'a', option_text: 'A', display_order: 1 }, { id: 'b', option_text: 'B', display_order: 2 }],
    }] } },
    submitted_answers: { q1: answer },
  },
})

describe('GET /api/admin/assessments/[id]/notenliste', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 ohne Anmeldung', async () => {
    setup({ user: null })
    expect((await GET(req(), ctx)).status).toBe(401)
  })
  it('403 für Azubis', async () => {
    setup({ role: 'student' })
    expect((await GET(req(), ctx)).status).toBe(403)
  })
  it('400 bei unbekannter Spalte oder Sortierung', async () => {
    setup()
    expect((await GET(req('?columns=geheim'), ctx)).status).toBe(400)
    expect((await GET(req('?sort=zufall'), ctx)).status).toBe(400)
  })
  it('404 ohne Zugriff auf den Nachweis', async () => {
    setup({ assessment: null })
    expect((await GET(req(), ctx)).status).toBe(404)
  })
  it('409 ohne Abgaben', async () => {
    setup({ sessions: [] })
    expect((await GET(req(), ctx)).status).toBe(409)
  })
  it('200 mit CSV, BOM, gewählten Spalten und Dateinamen', async () => {
    setup({ sessions: [done('s1', 'Anna Beispiel'), done('s2', 'Ben Adler', 'b')] })
    const res = await GET(req('?columns=name,grade&sort=name&split=1'), ctx)
    expect(res.status).toBe(200)
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]) // UTF-8-BOM für Excel
    const text = new TextDecoder().decode(bytes)
    expect(text.startsWith('Name;Note\r\n')).toBe(true)
    expect(text).toContain('Adler, Ben;6')
    expect(text).toContain('Beispiel, Anna;1')
    expect(text.indexOf('Adler')).toBeLessThan(text.indexOf('Beispiel'))
    const cd = res.headers.get('Content-Disposition') ?? ''
    expect(cd).toContain('attachment')
    expect(cd).toMatch(/Notenliste_Pr/)
    expect(cd).toMatch(/\.csv/)
  })
})
