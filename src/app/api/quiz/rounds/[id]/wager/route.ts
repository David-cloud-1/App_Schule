import { NextRequest, NextResponse } from 'next/server'
import { RoundWagerRequestSchema, type RoundWagerResponse } from '@/lib/quiz-round'
import { applyWager } from '@/lib/quiz-round-rules'
import { mutateRound } from '@/lib/quiz-round-server'
import { RoundIdSchema, badRequest, errorResponse, readJson, requireUser } from '../../route-helpers'

/** PROJ-129: Wette auf die letzte Frage annehmen oder ablehnen (vor deren Antwort). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, denied } = await requireUser()
  if (denied) return denied

  const { id } = await params
  if (!RoundIdSchema.safeParse(id).success) return badRequest('round id')

  const json = await readJson(request)
  if (!json.ok) return json.res
  const parsed = RoundWagerRequestSchema.safeParse(json.body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  const out = await mutateRound<RoundWagerResponse>(id, user.id, (slip) => applyWager(slip, parsed.data.accept))
  if ('response' in out) return NextResponse.json(out.response)
  return errorResponse(out)
}
