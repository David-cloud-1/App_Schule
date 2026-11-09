import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const maybeSingle = vi.fn()
const chain = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle }
chain.select.mockReturnValue(chain)
chain.eq.mockReturnValue(chain)
chain.is.mockReturnValue(chain)

vi.mock('../../../_lib/auth', () => ({
  requireContentAdmin: vi.fn(),
  assertCanAdminQuestion: vi.fn(async () => null),
}))
vi.mock('@/lib/answer-key', () => ({
  attachAnswerKey: vi.fn(async (rows: unknown[]) => rows),
}))
import { requireContentAdmin, assertCanAdminQuestion } from '../../../_lib/auth'
import { GET } from './route'

const Q = '550e8400-e29b-41d4-a716-446655440001'
const ctx = (id = Q) => ({ params: Promise.resolve({ questionId: id }) })
const req = {} as NextRequest

beforeEach(() => {
  vi.clearAllMocks()
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.is.mockReturnValue(chain)
  vi.mocked(requireContentAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1' },
    supabase: { from: () => chain },
  } as never)
  vi.mocked(assertCanAdminQuestion).mockResolvedValue(null)
})

describe('GET /api/admin/question-reports/[questionId]/review', () => {
  it('gibt die Antwort der Anmeldeprüfung weiter', async () => {
    vi.mocked(requireContentAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    } as never)
    expect((await GET(req, ctx())).status).toBe(403)
  })

  it('lehnt ungültige IDs mit 404 ab', async () => {
    expect((await GET(req, ctx('abc'))).status).toBe(404)
  })

  it('gibt 404, wenn die Frage nicht (mehr) existiert', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })
    const res = await GET(req, ctx())
    expect(res.status).toBe(404)
  })

  it('gibt die Frage mit nach Reihenfolge sortierten Antworten zurück', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: Q,
        version_number: 3,
        answer_options: [
          { id: 'b', option_text: 'B', display_order: 2, is_correct: true },
          { id: 'a', option_text: 'A', display_order: 1, is_correct: false },
        ],
      },
      error: null,
    })
    const res = await GET(req, ctx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.question.version_number).toBe(3)
    expect(body.question.answer_options.map((o: { id: string }) => o.id)).toEqual(['a', 'b'])
  })

  it('meldet Datenbankfehler als 500 ohne technische Details', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(req, ctx())
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })
})
