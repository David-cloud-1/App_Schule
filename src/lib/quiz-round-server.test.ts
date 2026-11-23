import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/answer-key', () => ({ fetchAnswerKey: vi.fn() }))

import { createServiceClient } from '@/lib/supabase-server'
import { fetchAnswerKey } from '@/lib/answer-key'
import { claimRoundForFinish, mutateRound, reservedJokerCoins, toSlipSources, type RoundRow } from './quiz-round-server'
import { applyAnswer, buildSlipQuestion } from './quiz-round-rules'

const USER = '11111111-1111-4111-8111-111111111111'
const ROUND = '22222222-2222-4222-8222-222222222222'
const O = (n: number) => `00000000-0000-4000-8000-00000000000${n}`

function makeRow(over: Partial<RoundRow> = {}): RoundRow {
  return {
    id: ROUND,
    user_id: USER,
    kind: 'quiz',
    blitz_form: null,
    subject_id: null,
    version: 0,
    created_at: new Date().toISOString(),
    finished_at: null,
    result: null,
    slip: {
      variants: true,
      jokers_used: 0,
      wager: null,
      questions: [
        buildSlipQuestion(
          {
            id: 'q1',
            question_text: 'Frage?',
            difficulty: 'leicht',
            explanation: 'weil',
            options: [0, 1, 2, 3].map((n) => ({ id: O(n), option_text: `o${n}` })),
            correct_option_id: O(0),
          },
          'classic',
        ),
      ],
    },
    ...over,
  }
}

/**
 * Kleiner Ersatz für den Service-Client: `quiz_rounds` mit Lesen und
 * versionsgeprüftem Update. `conflicts` = so oft scheitert das Update, weil
 * „jemand anderes“ die Version erhöht hat.
 */
function fakeService(row: RoundRow | null, conflicts = 0) {
  const state = { row, updates: 0, conflicts }
  const client = {
    from: vi.fn(() => {
      const filters: Record<string, unknown> = {}
      let patch: Record<string, unknown> | null = null
      const q = {
        select: vi.fn(() => q),
        eq: vi.fn((col: string, val: unknown) => {
          filters[col] = val
          return q
        }),
        is: vi.fn((col: string, val: unknown) => {
          filters[`is:${col}`] = val
          return q
        }),
        update: vi.fn((p: Record<string, unknown>) => {
          patch = p
          return q
        }),
        maybeSingle: vi.fn(async () => ({
          data: state.row && filters.id === state.row.id && filters.user_id === state.row.user_id ? state.row : null,
          error: null,
        })),
        then: (resolve: (v: unknown) => void) => {
          // Update-Kette endet mit .select(...) und wird awaited
          if (!patch || !state.row) return resolve({ data: [], error: null })
          if (state.conflicts > 0) {
            state.conflicts--
            state.row = { ...state.row, version: state.row.version + 1 }
            return resolve({ data: [], error: null })
          }
          if ('version' in filters && filters.version !== state.row.version) return resolve({ data: [], error: null })
          if ('is:finished_at' in filters && state.row.finished_at !== null) return resolve({ data: [], error: null })
          state.row = { ...state.row, ...(patch as Partial<RoundRow>) }
          state.updates++
          return resolve({ data: [state.row], error: null })
        },
      }
      return q
    }),
  }
  vi.mocked(createServiceClient).mockReturnValue(client as never)
  return state
}

beforeEach(() => vi.clearAllMocks())

describe('mutateRound', () => {
  const answer = (slip: RoundRow['slip']) => applyAnswer(slip, { kind: 'choice', question_index: 0, option_id: O(0) })

  it('speichert die Antwort mit erhöhter Version', async () => {
    const state = fakeService(makeRow())
    const out = await mutateRound(ROUND, USER, answer)
    expect(out).toMatchObject({ response: { status: 'resolved', correct: true } })
    expect(state.row?.version).toBe(1)
    expect(state.row?.slip.questions[0].answered).toBe(true)
  })

  it('liest bei gleichzeitiger Änderung neu und versucht es noch einmal', async () => {
    const state = fakeService(makeRow(), 2)
    const out = await mutateRound(ROUND, USER, answer)
    expect('response' in out).toBe(true)
    expect(state.updates).toBe(1)
  })

  it('fremde oder unbekannte Runde → 404', async () => {
    fakeService(makeRow({ user_id: '99999999-9999-4999-8999-999999999999' }))
    expect(await mutateRound(ROUND, USER, answer)).toMatchObject({ status: 404 })
  })

  it('älter als 3 Stunden oder schon abgerechnet → 410', async () => {
    fakeService(makeRow({ created_at: new Date(Date.now() - 4 * 3600_000).toISOString() }))
    expect(await mutateRound(ROUND, USER, answer)).toMatchObject({ status: 410 })
    fakeService(makeRow({ finished_at: new Date().toISOString() }))
    expect(await mutateRound(ROUND, USER, answer)).toMatchObject({ status: 410 })
  })

  it('ohne Änderung wird nichts gespeichert', async () => {
    const state = fakeService(makeRow())
    await mutateRound(ROUND, USER, answer)
    await mutateRound(ROUND, USER, answer)
    expect(state.updates).toBe(1)
  })
})

describe('claimRoundForFinish', () => {
  it('beansprucht einmal; danach kommt das gespeicherte Ergebnis', async () => {
    const state = fakeService(makeRow())
    const svc = createServiceClient()
    const first = await claimRoundForFinish(svc, ROUND, USER)
    expect('row' in first).toBe(true)
    state.row = { ...state.row!, result: { score: 1 } }
    expect(await claimRoundForFinish(svc, ROUND, USER)).toEqual({ result: { score: 1 } })
  })
})

describe('toSlipSources', () => {
  it('nimmt die Lösung vom Server und sortiert Fragen ohne genau eine richtige Option aus', async () => {
    vi.mocked(fetchAnswerKey).mockResolvedValue(
      new Map([
        ['a', { explanation: 'E', sampleAnswer: null, options: new Map([[O(0), true], [O(1), false]]) }],
        ['b', { explanation: null, sampleAnswer: null, options: new Map([[O(2), true], [O(3), true]]) }],
      ]),
    )
    const out = await toSlipSources([
      { id: 'a', question_text: 'A', explanation: null, difficulty: 'x', answer_options: [{ id: O(0), option_text: 'r' }, { id: O(1), option_text: 'f' }] },
      { id: 'b', question_text: 'B', explanation: null, difficulty: 'x', answer_options: [{ id: O(2), option_text: 'r' }, { id: O(3), option_text: 'r' }] },
    ])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ id: 'a', correct_option_id: O(0), explanation: 'E' })
  })
})

describe('reservedJokerCoins (QA BUG-5)', () => {
  function chainResult(result: { data: unknown; error: unknown }) {
    const calls: [string, unknown[]][] = []
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'gte', 'neq']) {
      chain[m] = vi.fn((...args: unknown[]) => {
        calls.push([m, args])
        return chain
      })
    }
    chain.limit = vi.fn(async () => result)
    return { client: { from: vi.fn(() => chain) } as never, calls }
  }

  it('summiert die Joker anderer offener Quiz-Runden × Preis', async () => {
    const { client, calls } = chainResult({ data: [{ jokers_used: 2 }, { jokers_used: 1 }, { jokers_used: null }], error: null })
    expect(await reservedJokerCoins(client, USER, ROUND)).toBe(15)
    expect(calls).toEqual(
      expect.arrayContaining([
        ['eq', ['user_id', USER]],
        ['eq', ['kind', 'quiz']],
        ['is', ['finished_at', null]],
        ['neq', ['id', ROUND]],
      ]),
    )
  })

  it('null bei Datenbankfehler (dann kein Joker)', async () => {
    const { client } = chainResult({ data: null, error: { message: 'kaputt' } })
    expect(await reservedJokerCoins(client, USER, ROUND)).toBeNull()
  })
})
