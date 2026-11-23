import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
vi.mock('@/lib/badges', () => ({ checkAndAwardBadges: vi.fn(async () => []), toBadgeDisplay: vi.fn() }))
vi.mock('@/lib/quiz-round-server', async (orig) => {
  const real = await orig<typeof import('@/lib/quiz-round-server')>()
  return {
    ...real,
    mutateRound: vi.fn(),
    claimRoundForFinish: vi.fn(),
    releaseRound: vi.fn(),
    storeRoundResult: vi.fn(),
  }
})

import { createClient, createServiceClient } from '@/lib/supabase-server'
import { claimRoundForFinish, mutateRound, releaseRound, storeRoundResult, type RoundRow } from '@/lib/quiz-round-server'
import { applyAnswer, applyJoker, buildSlipQuestion, type RoundSlip } from '@/lib/quiz-round-rules'
import { POST as answerPOST } from './[id]/answer/route'
import { POST as jokerPOST } from './[id]/joker/route'
import { POST as wagerPOST } from './[id]/wager/route'
import { POST as finishPOST } from './[id]/finish/route'
import { POST as startPOST } from './route'

const USER = { id: '11111111-1111-4111-8111-111111111111' }
const ROUND = '22222222-2222-4222-8222-222222222222'
const O = (q: number, n: number) => `00000000-0000-4000-8000-0000000000${q}${n}`
const params = (id = ROUND) => ({ params: Promise.resolve({ id }) })
const req = (body: unknown) => ({ json: () => Promise.resolve(body) }) as unknown as NextRequest

function slip(n: number): RoundSlip {
  return {
    variants: true,
    jokers_used: 0,
    wager: null,
    questions: Array.from({ length: n }, (_, q) =>
      buildSlipQuestion(
        {
          id: `q${q}`,
          question_text: `F${q}`,
          difficulty: 'x',
          explanation: `E${q}`,
          options: [0, 1, 2, 3].map((o) => ({ id: O(q, o), option_text: `o${o}` })),
          correct_option_id: O(q, 0),
        },
        'classic',
      ),
    ),
  }
}

function signedIn(user: typeof USER | null = USER, extra: Record<string, unknown> = {}) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user } })) },
    ...extra,
  } as never)
}

/** Service-Client, der jede Kette mit `result` beantwortet und Einfügungen merkt */
function service(profile: Record<string, unknown>) {
  const inserts: Record<string, unknown[]> = {}
  const updates: Record<string, unknown[]> = {}
  const client = {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {}
      const self = () => chain
      Object.assign(chain, {
        select: vi.fn(self),
        eq: vi.fn(self),
        insert: vi.fn((rows: unknown) => {
          ;(inserts[table] ??= []).push(rows)
          return chain
        }),
        update: vi.fn((patch: unknown) => {
          ;(updates[table] ??= []).push(patch)
          return chain
        }),
        single: vi.fn(async () =>
          table === 'profiles' ? { data: profile, error: null } : { data: { id: 'session-1' }, error: null },
        ),
        then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
      })
      return chain
    }),
  }
  vi.mocked(createServiceClient).mockReturnValue(client as never)
  return { inserts, updates }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/quiz/rounds/[id]/answer', () => {
  it('401 ohne Anmeldung', async () => {
    signedIn(null)
    const res = await answerPOST(req({}), params())
    expect(res.status).toBe(401)
  })

  it('400 bei ungültiger Runden-ID oder Anfrage', async () => {
    signedIn()
    expect((await answerPOST(req({ kind: 'choice', question_index: 0, option_id: O(0, 0) }), params('abc'))).status).toBe(400)
    expect((await answerPOST(req({ kind: 'choice', question_index: -1, option_id: 'x' }), params())).status).toBe(400)
    expect((await answerPOST(req({ kind: 'raten' }), params())).status).toBe(400)
    // is_correct des Browsers ist kein Teil des Vertrags
    expect((await answerPOST(req({ kind: 'true_false', question_index: 0 }), params())).status).toBe(400)
  })

  it('prüft die Antwort gegen den Zettel und gibt erst dann die Lösung heraus', async () => {
    signedIn()
    vi.mocked(mutateRound).mockImplementation(async (_id, _u, fn) => {
      const out = fn(slip(3), {} as RoundRow)
      return 'error' in out ? out : { response: out.response }
    })
    const res = await answerPOST(req({ kind: 'choice', question_index: 1, option_id: O(1, 2) }), params())
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'resolved', correct: false, correct_option_id: O(1, 0), explanation: 'E1' })
    expect(mutateRound).toHaveBeenCalledWith(ROUND, USER.id, expect.any(Function), expect.any(Function))
  })

  it('Blitzrunde: Antwort nach Ablauf der Zeit → 410', async () => {
    signedIn()
    vi.mocked(mutateRound).mockImplementation(async (_id, _u, fn, check) => {
      const blocked = check?.({ kind: 'blitz', created_at: new Date(Date.now() - 120_000).toISOString(), slip: slip(3) } as RoundRow)
      if (blocked) return blocked
      const out = fn(slip(3), {} as RoundRow)
      return 'error' in out ? out : { response: out.response }
    })
    const res = await answerPOST(req({ kind: 'choice', question_index: 0, option_id: O(0, 0) }), params())
    expect(res.status).toBe(410)
  })

  it('reicht 404/410 der Runde durch', async () => {
    signedIn()
    vi.mocked(mutateRound).mockResolvedValue({ status: 410, message: 'Runde ist abgelaufen' })
    expect((await answerPOST(req({ kind: 'choice', question_index: 0, option_id: O(0, 0) }), params())).status).toBe(410)
  })
})

describe('POST /api/quiz/rounds/[id]/joker', () => {
  it('402 bei zu wenig Münzen (Stand vom Server, nicht vom Browser)', async () => {
    signedIn()
    service({ coin_balance: 3 })
    vi.mocked(mutateRound).mockImplementation(async (_id, _u, fn) => {
      const out = fn(slip(3), { kind: 'quiz' } as RoundRow)
      return 'error' in out ? out : { response: out.response }
    })
    const res = await jokerPOST(req({ question_index: 0 }), params())
    expect(res.status).toBe(402)
  })

  it('liefert zwei falsche Optionen bei genug Münzen', async () => {
    signedIn()
    service({ coin_balance: 50 })
    vi.mocked(mutateRound).mockImplementation(async (_id, _u, fn) => {
      const out = fn(slip(3), { kind: 'quiz' } as RoundRow)
      return 'error' in out ? out : { response: out.response }
    })
    const res = await jokerPOST(req({ question_index: 0 }), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.removed_option_ids).toHaveLength(2)
    expect(body.removed_option_ids).not.toContain(O(0, 0))
  })

  it('409 in der Blitzrunde', async () => {
    signedIn()
    service({ coin_balance: 50 })
    vi.mocked(mutateRound).mockImplementation(async (_id, _u, fn) => {
      const out = fn(slip(3), { kind: 'blitz' } as RoundRow)
      return 'error' in out ? out : { response: out.response }
    })
    expect((await jokerPOST(req({ question_index: 0 }), params())).status).toBe(409)
  })
})

describe('POST /api/quiz/rounds/[id]/wager', () => {
  it('400 ohne gültige Angabe, 409 ohne Angebot', async () => {
    signedIn()
    expect((await wagerPOST(req({ accept: 'ja' }), params())).status).toBe(400)
    vi.mocked(mutateRound).mockImplementation(async (_id, _u, fn) => {
      const out = fn(slip(3), {} as RoundRow)
      return 'error' in out ? out : { response: out.response }
    })
    expect((await wagerPOST(req({ accept: true }), params())).status).toBe(409)
  })
})

describe('POST /api/quiz/rounds/[id]/finish', () => {
  function playedRound(): RoundRow {
    let s = slip(6)
    const j = applyJoker(s, 0, 100)
    if ('error' in j) throw new Error()
    s = j.slip
    for (let i = 0; i < 6; i++) {
      const r = applyAnswer(s, { kind: 'choice', question_index: i, option_id: O(i, i === 5 ? 1 : 0) })
      if ('error' in r) throw new Error(r.message)
      s = r.slip
    }
    return { id: ROUND, user_id: USER.id, kind: 'quiz', blitz_form: null, subject_id: null, slip: s, version: 7, created_at: '', finished_at: '', result: null }
  }

  it('rechnet allein aus dem Zettel ab und bucht Joker beim Abrechnen', async () => {
    signedIn()
    const db = service({ total_xp: 0, current_streak: 0, longest_streak: 0, last_session_date: null, coin_balance: 20 })
    vi.mocked(claimRoundForFinish).mockResolvedValue({ row: playedRound() })

    const res = await finishPOST(new Request('http://x'), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    // 5 richtige (1 mit Joker) = 5 Münzen + 3 Bonus − 5 Joker = 3; 50 XP
    expect(body).toMatchObject({
      score: 5,
      total: 6,
      xp_earned: 50,
      coins_earned: 3,
      coins: { answers: 5, round_bonus: 3, joker_cost: 5, wager: null },
    })
    const answers = db.inserts.quiz_answers[0] as { presentation: string }[]
    expect(answers.map((a) => a.presentation)).toEqual(['joker', 'classic', 'classic', 'classic', 'classic', 'classic'])
    expect(db.updates.profiles[0]).toMatchObject({ coin_balance: 23, total_xp: 50 })
    expect(storeRoundResult).toHaveBeenCalled()
  })

  it('zweiter Aufruf liefert das gespeicherte Ergebnis ohne neue Buchung', async () => {
    signedIn()
    const db = service({})
    vi.mocked(claimRoundForFinish).mockResolvedValue({ result: { score: 9 } })
    const res = await finishPOST(new Request('http://x'), params())
    expect(await res.json()).toEqual({ score: 9 })
    expect(db.inserts.quiz_sessions).toBeUndefined()
  })

  it('ohne beantwortete Frage → 409 und die Runde bleibt offen', async () => {
    signedIn()
    service({})
    const row = playedRound()
    row.slip = slip(3)
    vi.mocked(claimRoundForFinish).mockResolvedValue({ row })
    const res = await finishPOST(new Request('http://x'), params())
    expect(res.status).toBe(409)
    expect(releaseRound).toHaveBeenCalled()
  })

  it('abgelaufene Runde → 410', async () => {
    signedIn()
    service({})
    vi.mocked(claimRoundForFinish).mockResolvedValue({ status: 410, message: 'abgelaufen' })
    expect((await finishPOST(new Request('http://x'), params())).status).toBe(410)
  })
})

describe('POST /api/quiz/rounds (Blitzrunde starten)', () => {
  it('400 bei falschem Typ, 409 wenn heute schon gespielt', async () => {
    const blitzChain = {
      select: vi.fn(() => blitzChain),
      eq: vi.fn(() => blitzChain),
      maybeSingle: vi.fn(async () => ({ data: { id: 'x' } })),
    }
    signedIn(USER, { from: vi.fn(() => blitzChain) })
    expect((await startPOST(req({ kind: 'quiz' }))).status).toBe(400)
    expect((await startPOST(req({ kind: 'blitz' }))).status).toBe(409)
  })
})
