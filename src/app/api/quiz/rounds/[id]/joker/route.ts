import { NextRequest, NextResponse } from 'next/server'
import { RoundJokerRequestSchema, type RoundJokerResponse } from '@/lib/quiz-round'
import { applyJoker } from '@/lib/quiz-round-rules'
import { mutateRound, reservedJokerCoins } from '@/lib/quiz-round-server'
import { createServiceClient } from '@/lib/supabase-server'
import { RoundIdSchema, badRequest, errorResponse, readJson, requireUser } from '../../route-helpers'

/**
 * PROJ-129: Joker „Zwei weg“. Prüft den aktuellen Münzstand; abgebucht wird
 * erst beim Abrechnen der Runde (keine Abbuchung ohne gespeicherte Runde).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, denied } = await requireUser()
  if (denied) return denied

  const { id } = await params
  if (!RoundIdSchema.safeParse(id).success) return badRequest('round id')

  const json = await readJson(request)
  if (!json.ok) return json.res
  const parsed = RoundJokerRequestSchema.safeParse(json.body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  const service = createServiceClient()
  const [{ data: profile, error }, reservedElsewhere] = await Promise.all([
    service.from('profiles').select('coin_balance').eq('id', user.id).single(),
    reservedJokerCoins(service, user.id, id),
  ])
  if (error || reservedElsewhere === null) {
    if (error) console.error('[POST /api/quiz/rounds/joker] profile:', error)
    return NextResponse.json({ error: 'Münzstand konnte nicht geladen werden' }, { status: 500 })
  }
  // QA BUG-5: Joker anderer offener Runden (zweiter Tab) sind schon vorgemerkt
  const balance = ((profile?.coin_balance as number | null) ?? 0) - reservedElsewhere

  const out = await mutateRound<RoundJokerResponse>(id, user.id, (slip, row) =>
    row.kind !== 'quiz'
      ? { error: 'conflict', message: 'Joker gibt es nur im normalen Quiz' }
      : applyJoker(slip, parsed.data.question_index, balance),
  )
  if ('response' in out) return NextResponse.json(out.response)
  return errorResponse(out)
}
