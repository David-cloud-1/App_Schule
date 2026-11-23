import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuizRoundClient } from './quiz-round-client'
import type { QuizRoundStart } from '@/lib/quiz-round'

vi.mock('@/components/reminder-opt-in-card', () => ({ ReminderOptInCard: () => null }))

const start: QuizRoundStart = {
  round_id: 'r1',
  coin_balance: 12,
  joker: { enabled: true, price: 5, max_per_round: 2 },
  questions: [
    {
      index: 0,
      id: 'q0',
      question_text: 'Was regelt der Frachtvertrag?',
      difficulty: 'mittel',
      form: 'classic',
      options: [
        { id: 'a0', option_text: 'Beförderung' },
        { id: 'a1', option_text: 'Lagerung' },
        { id: 'a2', option_text: 'Verzollung' },
        { id: 'a3', option_text: 'Versicherung' },
      ],
    },
    {
      index: 1,
      id: 'q1',
      question_text: 'Wer stellt den Frachtbrief aus?',
      difficulty: 'leicht',
      form: 'true_false',
      proposal_option_id: 'b1',
      options: [
        { id: 'b0', option_text: 'Absender' },
        { id: 'b1', option_text: 'Empfänger' },
      ],
    },
    {
      index: 2,
      id: 'q2',
      question_text: 'Letzte Frage?',
      difficulty: 'schwer',
      form: 'classic',
      options: [
        { id: 'c0', option_text: 'Ja' },
        { id: 'c1', option_text: 'Nein' },
      ],
    },
  ],
}

type Call = { url: string; body: unknown }
let calls: Call[]

function json(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }))
}

beforeEach(() => {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ url, body })
      if (url.endsWith('/joker')) return json({ removed_option_ids: ['a2', 'a3'], jokers_used: 1, coins_reserved: 5 })
      if (url.endsWith('/wager')) return json({ accepted: body.accept, stake: 4 })
      if (url.endsWith('/finish'))
        return json({
          score: 2,
          total: 3,
          xp_earned: 25,
          new_total_xp: 525,
          new_streak: 3,
          leveled_up: false,
          old_level: 3,
          new_level: 3,
          new_badges: [],
          coins_earned: 7,
          coins: { answers: 2, round_bonus: 0, joker_cost: 5, wager: { stake: 4, won: true, delta: 4 } },
        })
      if (url.endsWith('/answer')) {
        if (body.question_index === 0)
          return json({ status: 'resolved', correct: true, correct_option_id: 'a0', explanation: 'Weil HGB.' })
        if (body.question_index === 1)
          return json({
            status: 'resolved',
            correct: true,
            correct_option_id: 'b0',
            explanation: 'Der Absender.',
            wager_offer: { stake: 4 },
          })
        return json({ status: 'resolved', correct: true, correct_option_id: 'c0', explanation: null })
      }
      return json({ error: 'unknown' }, 404)
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('QuizRoundClient', () => {
  it('spielt eine Runde mit Joker, Wischfrage und Wette durch', async () => {
    render(<QuizRoundClient start={start} subject={{ id: 's', code: 'STG', name: 'STG', color: '#58CC02' }} totalAvailable={50} />)

    // Frage 1: Joker streicht zwei Optionen
    fireEvent.click(screen.getByRole('button', { name: /zwei falsche Antworten streichen/ }))
    await screen.findByRole('button', { name: 'Verzollung (vom Joker gestrichen)' })
    expect(screen.getByLabelText('7 Münzen')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Beförderung' }))
    await screen.findByText('Richtig!')
    expect(screen.getByText('Weil HGB.')).toBeInTheDocument()
    expect(calls.find((c) => c.url.endsWith('/answer'))?.body).toEqual({ kind: 'choice', question_index: 0, option_id: 'a0' })

    // Frage 2: Richtig/Falsch, kein Joker
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText('Wischfrage')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /zwei falsche Antworten/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Stimmt nicht/ }))
    await screen.findByText('Richtig eingeschätzt!')
    expect(screen.getByText('Die Antwort stimmt nicht. Richtig ist: Absender')).toBeInTheDocument()

    // Vor der letzten Frage: Wett-Angebot
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    await screen.findByText('Letzte Frage – wetten?')
    fireEvent.click(screen.getByRole('button', { name: 'Einsetzen: 4 → 8' }))
    await screen.findByText('Wette läuft: 4 → 8 Münzen')
    expect(calls.find((c) => c.url.endsWith('/wager'))?.body).toEqual({ accept: true })

    // Wettfrage: ohne Joker
    expect(screen.queryByRole('button', { name: /zwei falsche Antworten/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ja' }))
    await screen.findByText('Richtig!')
    fireEvent.click(screen.getByRole('button', { name: 'Ergebnisse anzeigen' }))

    expect(await screen.findByTestId('wager-outcome')).toHaveTextContent('Wette gewonnen: +4 Münzen')
    expect(screen.getByText('Joker: −5 Münzen')).toBeInTheDocument()
    expect(screen.getByText('+7')).toBeInTheDocument()
    // Der Browser schickt beim Abrechnen nichts mit – der Server rechnet allein
    expect(calls.find((c) => c.url.endsWith('/finish'))?.body).toBeUndefined()
  })

  it('zeigt bei Netzfehler „Nochmal versuchen“ und sendet dieselbe Antwort erneut', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation(() => json({ status: 'resolved', correct: false, correct_option_id: 'a0', explanation: null }))
    vi.stubGlobal('fetch', fetchMock)

    render(<QuizRoundClient start={start} subject={{ id: 's', code: 'STG', name: 'STG', color: '#58CC02' }} totalAvailable={50} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lagerung' }))
    const retry = await screen.findByRole('button', { name: 'Nochmal versuchen' })
    fireEvent.click(retry)
    await screen.findByText('Leider falsch!')
    expect(screen.getByText('Richtig ist: Beförderung')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  })

  it('schickt die Lösung nie mit den Fragen in den Browser', () => {
    const serialized = JSON.stringify(start)
    expect(serialized).not.toContain('is_correct')
    expect(serialized).not.toContain('correct_option_id')
  })
})
