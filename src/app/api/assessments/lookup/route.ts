import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { effectiveAssessmentStatus, normalizeAccessCode } from '@/lib/graded-assessments'

const Schema = z.object({ code: z.string().min(1).max(20) })

const WINDOW_MINUTES = 10
const MAX_ATTEMPTS = 10

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const code = normalizeAccessCode(parsed.data.code)

  const service = createServiceClient()

  // Rate limit: max MAX_ATTEMPTS failed lookups per user per WINDOW_MINUTES.
  // A database-backed counter, not an external service — matches the
  // low-budget constraint documented in the architecture decision.
  const { data: attempts } = await service
    .from('assessment_lookup_attempts')
    .select('window_start, attempt_count')
    .eq('user_id', user.id)
    .maybeSingle()

  const now = new Date()
  const windowExpired = !attempts || now.getTime() - new Date(attempts.window_start).getTime() > WINDOW_MINUTES * 60_000
  const currentCount = windowExpired ? 0 : attempts!.attempt_count

  if (currentCount >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Zu viele Versuche. Bitte kurz warten.' }, { status: 429 })
  }

  const { data: assessment } = await service
    .from('graded_assessments')
    .select('id, title, duration_minutes, status, opens_at, closes_at, question_ids_snapshot, exam_set_id')
    .eq('access_code', code)
    .maybeSingle()

  if (!assessment) {
    await service.from('assessment_lookup_attempts').upsert({
      user_id: user.id,
      window_start: windowExpired ? now.toISOString() : (attempts?.window_start ?? now.toISOString()),
      attempt_count: currentCount + 1,
    })
    return NextResponse.json({ error: 'Code nicht gefunden.' }, { status: 404 })
  }

  const { data: existingSession } = await supabase
    .from('exam_sessions')
    .select('id, status')
    .eq('assessment_id', assessment.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const questionCount = assessment.question_ids_snapshot?.length ?? 0
  const status = effectiveAssessmentStatus(
    assessment.status as 'draft' | 'open' | 'closed',
    assessment.opens_at,
    assessment.closes_at,
    now,
  )

  return NextResponse.json({
    id: assessment.id,
    title: assessment.title,
    questionCount,
    durationMinutes: assessment.duration_minutes,
    status,
    needsName: !existingSession,
    existingSessionId: existingSession?.id ?? null,
    existingSessionStatus: existingSession?.status === 'in_progress' ? 'in_progress' : 'completed',
  })
}
