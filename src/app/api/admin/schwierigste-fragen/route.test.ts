import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const rpc = vi.fn()
vi.mock('../_lib/auth', () => ({ requireContentAdmin: vi.fn() }))
import { requireContentAdmin } from '../_lib/auth'
import { GET } from './route'

const req = (qs = '') => new NextRequest(`http://localhost/api/admin/schwierigste-fragen${qs}`)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireContentAdmin).mockResolvedValue({
    error: null,
    user: { id: 't', email: 't@x.de' },
    supabase: { rpc },
    scopeDepartmentIds: ['d1'],
  } as never)
})

describe('GET /api/admin/schwierigste-fragen', () => {
  it('gibt die Anmeldeprüfung weiter', async () => {
    vi.mocked(requireContentAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    } as never)
    expect((await GET(req())).status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('lehnt ungültige Filter ab', async () => {
    expect((await GET(req('?class_level=9'))).status).toBe(400)
    expect((await GET(req('?days=7'))).status).toBe(400)
  })

  it('reicht Bereich und Filter an die Funktion, lässt Fragen ohne Antworten weg und kürzt Texte', async () => {
    rpc.mockResolvedValue({
      data: [
        { question_id: 'a', attempts: 3, question_text: 'x'.repeat(300) },
        { question_id: 'b', attempts: 0, question_text: 'y' },
      ],
      error: null,
    })
    const res = await GET(req('?class_level=11&days=30'))
    expect(rpc).toHaveBeenCalledWith('question_difficulty_stats', {
      p_department_ids: ['d1'],
      p_class_level: 11,
      p_days: 30,
      p_subject_id: null,
    })
    const body = await res.json()
    expect(body.totalQuestions).toBe(2)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].question_text.length).toBe(201)
  })

  it('antwortet bei Datenbankfehler mit 500 ohne Technik-Text', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const res = await GET(req())
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toMatch(/boom/)
  })

  it('gibt keinen Zeitstempel und bei sehr wenigen Antworten keine gewählte Option heraus (QA PROJ-74 B2)', async () => {
    const row = (id: string, attempts: number) => ({
      question_id: id,
      attempts,
      correct: 0,
      question_text: 'Frage',
      top_wrong_option_text: 'Option Y',
      top_wrong_count: attempts,
      last_changed_at: '2026-11-05T10:00:00Z',
      first_counted_at: '2026-11-01T14:03:22Z',
    })
    rpc.mockResolvedValue({ data: [row('wenig', 1), row('viel', 30)], error: null })
    const { items } = await (await GET(req())).json()
    for (const item of items) {
      expect(item).not.toHaveProperty('first_counted_at')
      expect(item.changed_after_answers).toBe(true)
    }
    const wenig = items.find((i: { question_id: string }) => i.question_id === 'wenig')
    const viel = items.find((i: { question_id: string }) => i.question_id === 'viel')
    expect(wenig.top_wrong_option_text).toBeNull()
    expect(wenig.top_wrong_count).toBe(0)
    expect(viel.top_wrong_option_text).toBe('Option Y')
  })
})
