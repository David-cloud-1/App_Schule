/**
 * PROJ-129: Browser-Aufrufe für Runden mit Rundenzettel.
 * Alle Server-Wege sind wiederholbar, deshalb wird ein reiner Netzfehler
 * einmal still wiederholt, bevor die Oberfläche „Nochmal versuchen“ zeigt.
 */
import type {
  BlitzRoundResult,
  BlitzRoundStart,
  QuizRoundResult,
  RoundAnswerRequest,
  RoundAnswerResponse,
  RoundJokerResponse,
  RoundWagerResponse,
} from '@/lib/quiz-round'

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number }

async function postJson<T>(url: string, body?: unknown, retries = 1): Promise<ApiResult<T>> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      if (!res.ok) return { ok: false, status: res.status }
      return { ok: true, data: (await res.json()) as T }
    } catch (err) {
      if (attempt >= retries) {
        console.error('[quiz-round-api]', url, err)
        return { ok: false, status: 0 }
      }
    }
  }
}

const base = (roundId: string) => `/api/quiz/rounds/${encodeURIComponent(roundId)}`

export function sendRoundAnswer(roundId: string, req: RoundAnswerRequest) {
  return postJson<RoundAnswerResponse>(`${base(roundId)}/answer`, req)
}

export function sendRoundJoker(roundId: string, questionIndex: number) {
  return postJson<RoundJokerResponse>(`${base(roundId)}/joker`, { question_index: questionIndex })
}

export function sendRoundWager(roundId: string, accept: boolean) {
  return postJson<RoundWagerResponse>(`${base(roundId)}/wager`, { accept })
}

export function finishQuizRound(roundId: string) {
  return postJson<QuizRoundResult>(`${base(roundId)}/finish`)
}

export function finishBlitzRound(roundId: string) {
  return postJson<BlitzRoundResult>(`${base(roundId)}/finish`)
}

export function startBlitzRound() {
  // Kein stiller zweiter Versuch: ein Start legt einen neuen Rundenzettel an.
  return postJson<BlitzRoundStart>('/api/quiz/rounds', { kind: 'blitz' }, 0)
}
