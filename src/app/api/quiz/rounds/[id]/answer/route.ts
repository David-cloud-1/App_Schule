import { NextRequest, NextResponse } from 'next/server'
import { RoundAnswerRequestSchema, type RoundAnswerResponse } from '@/lib/quiz-round'
import { BLITZ_ANSWER_WINDOW_MS, applyAnswer } from '@/lib/quiz-round-rules'
import { mutateRound } from '@/lib/quiz-round-server'
import { RoundIdSchema, badRequest, errorResponse, readJson, requireUser } from '../../route-helpers'

/**
 * PROJ-129: eine Antwort gegen den Rundenzettel prüfen.
 * Wiederholbar: dieselbe Anfrage zweimal liefert dieselbe Antwort.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, denied } = await requireUser()
  if (denied) return denied

  const { id } = await params
  if (!RoundIdSchema.safeParse(id).success) return badRequest('round id')

  const json = await readJson(request)
  if (!json.ok) return json.res
  const parsed = RoundAnswerRequestSchema.safeParse(json.body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  const out = await mutateRound<RoundAnswerResponse>(
    id,
    user.id,
    (slip) => applyAnswer(slip, parsed.data),
    // Blitzrunde: nach 60 s (+ Puffer) zählt keine neue Antwort mehr
    (row) =>
      row.kind === 'blitz' &&
      !row.slip.questions[parsed.data.question_index]?.answered &&
      Date.now() - Date.parse(row.created_at) > BLITZ_ANSWER_WINDOW_MS
        ? { status: 410, message: 'Zeit ist abgelaufen' }
        : null,
  )
  if ('response' in out) return NextResponse.json(out.response)
  return errorResponse(out)
}
