import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { effectiveAssessmentStatus, normalizeAccessCode, shuffle } from '@/lib/graded-assessments'

const Schema = z.object({
  code: z.string().min(1).max(20),
  participantName: z.string().trim().min(3).max(120).optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bitte Vor- und Nachnamen eingeben.' }, { status: 400 })
  }

  // Idempotent re-join: same code leads back into the already-running (or
  // already-submitted) attempt instead of erroring — covers reconnects and
  // double-taps alike.
  const { data: existingSession } = await supabase
    .from('exam_sessions')
    .select('id')
    .eq('assessment_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existingSession) {
    return NextResponse.json({ sessionId: existingSession.id })
  }

  const service = createServiceClient()
  const { data: assessment } = await service
    .from('graded_assessments')
    .select('id, title, access_code, part, duration_minutes, status, opens_at, closes_at, question_ids_snapshot')
    .eq('id', id)
    .maybeSingle()

  if (!assessment || assessment.access_code !== normalizeAccessCode(parsed.data.code)) {
    return NextResponse.json({ error: 'Ungültiger Code.' }, { status: 404 })
  }

  const status = effectiveAssessmentStatus(assessment.status as 'draft' | 'open' | 'closed', assessment.opens_at, assessment.closes_at)
  if (status !== 'open') {
    return NextResponse.json({
      error: status === 'not_open' ? 'Dieser Leistungsnachweis ist noch nicht freigegeben.' : 'Der Beitritt ist beendet.',
    }, { status: 400 })
  }

  if (!parsed.data.participantName) {
    return NextResponse.json({ error: 'Bitte Vor- und Nachnamen eingeben.' }, { status: 400 })
  }

  const questionIds: string[] = assessment.question_ids_snapshot ?? []
  const { data: questionRows } = await supabase
    .from('questions')
    .select('id, question_text, type, difficulty, explanation, sample_answer, answer_options(id, option_text, is_correct, display_order)')
    .in('id', questionIds)
    .eq('is_active', true)

  if (!questionRows || questionRows.length < 5) {
    return NextResponse.json({ error: 'Die Fragen dieses Nachweises sind nicht mehr verfügbar.' }, { status: 400 })
  }

  // Fix a per-participant question and answer-option order at join time —
  // it stays stable across reconnects because it's baked into the stored
  // snapshot, not recomputed on every load.
  const shuffledQuestions = shuffle(questionRows).map((q) => ({
    ...q,
    part: assessment.part,
    answer_options: shuffle(q.answer_options ?? []).map((opt, idx) => ({ ...opt, display_order: idx + 1 })),
  }))

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .insert({
      user_id: user.id,
      parts_selected: [assessment.part],
      started_at: new Date().toISOString(),
      status: 'in_progress',
      assessment_id: assessment.id,
      participant_name: parsed.data.participantName,
      results_json: {
        durationMinutes: assessment.duration_minutes,
        assessment: { title: assessment.title, accessCode: assessment.access_code, released: false },
        parts: { [assessment.part]: shuffledQuestions },
      },
    })
    .select('id')
    .single()

  if (error) {
    // Unique violation on (assessment_id, user_id) — a concurrent request
    // from a second tab/device won the race. Return that session instead
    // of failing; enforces "one attempt" without a client-visible error.
    if (error.code === '23505') {
      const { data: raceSession } = await supabase
        .from('exam_sessions')
        .select('id')
        .eq('assessment_id', id)
        .eq('user_id', user.id)
        .single()
      if (raceSession) return NextResponse.json({ sessionId: raceSession.id })
    }
    return NextResponse.json({ error: 'Beitritt fehlgeschlagen.' }, { status: 500 })
  }

  return NextResponse.json({ sessionId: session.id })
}
