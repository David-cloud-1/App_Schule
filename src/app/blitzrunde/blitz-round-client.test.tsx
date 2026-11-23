import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BlitzRoundClient } from './blitz-round-client'

function json(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }))
}

const q = (i: number) => ({
  index: i,
  id: `q${i}`,
  question_text: `Frage ${i}`,
  difficulty: 'mittel',
  form: 'true_false' as const,
  proposal_option_id: `p${i}`,
  options: [{ id: `p${i}`, option_text: `Vorschlag ${i}` }],
})

afterEach(() => vi.unstubAllGlobals())

describe('BlitzRoundClient', () => {
  it('zeigt sofort die nächste Karte und rechnet nach der letzten Karte ab', async () => {
    const calls: { url: string; body: unknown }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined
        calls.push({ url, body })
        if (url === '/api/quiz/rounds') return json({ round_id: 'b1', form: 'true_false', seconds: 60, questions: [q(0), q(1)] })
        if (url.endsWith('/answer'))
          return json({ status: 'resolved', correct: body.question_index === 0, correct_option_id: 'x', explanation: null })
        if (url.endsWith('/finish'))
          return json({
            form: 'true_false',
            correct_count: 1,
            wrong_count: 1,
            points: 0,
            coins_earned: 10,
            xp_earned: 0,
            new_coin_balance: 50,
            new_total_xp: 100,
            new_streak: 2,
          })
        return json({}, 404)
      }),
    )

    render(<BlitzRoundClient />)
    await screen.findByText('Vorschlag 0')
    fireEvent.click(screen.getByRole('button', { name: /^Stimmt$/ }))
    // Ohne auf den Server zu warten: nächste Karte
    expect(screen.getByText('Vorschlag 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Stimmt nicht/ }))

    expect(await screen.findByTestId('blitz-points')).toHaveTextContent('0')
    expect(screen.getByText('1 richtig − 1 falsch')).toBeInTheDocument()
    expect(calls.filter((c) => c.url.endsWith('/answer')).map((c) => c.body)).toEqual([
      { kind: 'true_false', question_index: 0, says_true: true },
      { kind: 'true_false', question_index: 1, says_true: false },
    ])
    expect(calls.filter((c) => c.url.endsWith('/finish'))).toHaveLength(1)
  })

  it('meldet „Heute schon erledigt“, wenn der Server 409 sagt', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json({ error: 'schon gespielt' }, 409)))
    render(<BlitzRoundClient />)
    expect(await screen.findByText('Heute schon erledigt!')).toBeInTheDocument()
  })
})
