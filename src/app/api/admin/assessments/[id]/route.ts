import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { formatAccessCode, scoreAssessmentQuestions, validateGradingScale } from '@/lib/graded-assessments'

const ActionSchema = z.object({ action: z.enum(['open', 'close', 'release_results']) })

const EditSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(5).max(600).optional(),
  gradingScale: z.array(z.object({
    grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    minPercent: z.number().min(0).max(100),
  })).length(6).optional(),
})

async function loadAssessment(supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'], id: string) {
  const { data } = await supabase!
    .from('graded_assessments')
    .select('*, exam_question_sets(name, question_ids)')
    .eq('id', id)
    .single()
  return data
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const assessment = await loadAssessment(supabase, id)
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const service = createServiceClient()
  const { data: sessions } = await service
    .from('exam_sessions')
    .select('status')
    .eq('assessment_id', id)

  const live = {
    joined: sessions?.length ?? 0,
    inProgress: (sessions ?? []).filter((s) => s.status === 'in_progress').length,
    submitted: (sessions ?? []).filter((s) => s.status !== 'in_progress').length,
  }

  const set = assessment.exam_question_sets as unknown as { name: string; question_ids: string[] } | null

  return NextResponse.json({
    id: assessment.id,
    title: assessment.title,
    examSetId: assessment.exam_set_id,
    examSetName: set?.name ?? '—',
    part: assessment.part,
    status: assessment.status,
    accessCode: assessment.access_code,
    joinUrl: `${request.nextUrl.origin}/pruefung/${assessment.access_code}`,
    opensAt: assessment.opens_at,
    closesAt: assessment.closes_at,
    durationMinutes: assessment.duration_minutes,
    gradingScale: assessment.grading_scale,
    resultsReleasedAt: assessment.results_released_at,
    createdAt: assessment.created_at,
    questionCount: assessment.question_ids_snapshot?.length ?? set?.question_ids?.length ?? 0,
    live,
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const assessment = await loadAssessment(supabase, id)
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const actionParsed = ActionSchema.safeParse(body)
  if (actionParsed.success) {
    const { action } = actionParsed.data

    if (action === 'open') {
      if (assessment.status !== 'draft') {
        return NextResponse.json({ error: 'Nur ein Entwurf kann geöffnet werden.' }, { status: 400 })
      }
      const set = assessment.exam_question_sets as unknown as { question_ids: string[] } | null
      const snapshot = set?.question_ids ?? []
      if (snapshot.length < 5) {
        return NextResponse.json({ error: 'Das zugrunde liegende Set hat zu wenige Fragen.' }, { status: 400 })
      }
      const { error } = await supabase
        .from('graded_assessments')
        .update({ status: 'open', question_ids_snapshot: snapshot })
        .eq('id', id)
      if (error) return NextResponse.json({ error: 'Öffnen fehlgeschlagen.' }, { status: 500 })
      await writeAuditLog(supabase, { admin_id: user.id, action_type: 'graded_assessment.open', object_type: 'graded_assessment', object_id: id, object_label: assessment.title })
      return NextResponse.json({ success: true })
    }

    if (action === 'close') {
      if (assessment.status !== 'open') {
        return NextResponse.json({ error: 'Nur ein offener Nachweis kann geschlossen werden.' }, { status: 400 })
      }
      const { error } = await supabase.from('graded_assessments').update({ status: 'closed' }).eq('id', id)
      if (error) return NextResponse.json({ error: 'Schließen fehlgeschlagen.' }, { status: 500 })
      await writeAuditLog(supabase, { admin_id: user.id, action_type: 'graded_assessment.close', object_type: 'graded_assessment', object_id: id, object_label: assessment.title })
      return NextResponse.json({ success: true })
    }

    // release_results
    if (assessment.status !== 'closed') {
      return NextResponse.json({ error: 'Der Beitritt muss erst geschlossen werden, bevor Ergebnisse freigegeben werden.' }, { status: 400 })
    }
    if (assessment.results_released_at) {
      return NextResponse.json({ error: 'Ergebnisse sind bereits freigegeben.' }, { status: 400 })
    }

    const service = createServiceClient()
    const { data: sessions } = await service
      .from('exam_sessions')
      .select('id, results_json, status')
      .eq('assessment_id', id)
      .eq('status', 'completed')

    const releasedAt = new Date().toISOString()

    for (const session of sessions ?? []) {
      const resultsJson = session.results_json as {
        parts?: Record<string, { questions: { type: string; is_correct?: boolean }[] }>
        assessment?: { title: string; accessCode: string }
      }
      const partData = resultsJson.parts?.[String(assessment.part)]
      const scored = scoreAssessmentQuestions(partData?.questions ?? [], assessment.grading_scale)
      await service
        .from('exam_sessions')
        .update({
          results_json: {
            ...resultsJson,
            assessment: {
              ...(resultsJson.assessment ?? { title: assessment.title, accessCode: assessment.access_code }),
              released: true,
              ...scored,
            },
          },
        })
        .eq('id', session.id)
    }

    const { error } = await supabase
      .from('graded_assessments')
      .update({ results_released_at: releasedAt })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Freigeben fehlgeschlagen.' }, { status: 500 })

    await writeAuditLog(supabase, {
      admin_id: user.id,
      action_type: 'graded_assessment.release_results',
      object_type: 'graded_assessment',
      object_id: id,
      object_label: assessment.title,
      details: { participantCount: sessions?.length ?? 0 },
    })
    return NextResponse.json({ success: true })
  }

  // Field edit — only while still a draft (question snapshot and running
  // sessions must never see the rules change under them).
  if (assessment.status !== 'draft') {
    return NextResponse.json({ error: 'Nur ein Entwurf kann bearbeitet werden.' }, { status: 400 })
  }
  const editParsed = EditSchema.safeParse(body)
  if (!editParsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: editParsed.error.flatten() }, { status: 400 })
  }
  const patch = editParsed.data
  if (patch.gradingScale) {
    const scaleError = validateGradingScale(patch.gradingScale)
    if (scaleError) return NextResponse.json({ error: scaleError }, { status: 400 })
  }
  const opensAt = patch.opensAt ?? assessment.opens_at
  const closesAt = patch.closesAt ?? assessment.closes_at
  if (new Date(closesAt).getTime() <= new Date(opensAt).getTime()) {
    return NextResponse.json({ error: 'Ende muss nach dem Start liegen.' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (patch.title !== undefined) update.title = patch.title
  if (patch.opensAt !== undefined) update.opens_at = patch.opensAt
  if (patch.closesAt !== undefined) update.closes_at = patch.closesAt
  if (patch.durationMinutes !== undefined) update.duration_minutes = patch.durationMinutes
  if (patch.gradingScale !== undefined) update.grading_scale = patch.gradingScale

  const { error } = await supabase.from('graded_assessments').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const assessment = await loadAssessment(supabase, id)
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const service = createServiceClient()
  const { count } = await service
    .from('exam_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', id)

  if (assessment.status !== 'draft' && (count ?? 0) > 0) {
    return NextResponse.json({ error: 'Nur Entwürfe oder Nachweise ohne Teilnehmer können gelöscht werden.' }, { status: 400 })
  }

  const { error } = await supabase.from('graded_assessments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 500 })

  await writeAuditLog(supabase, { admin_id: user.id, action_type: 'graded_assessment.delete', object_type: 'graded_assessment', object_id: id, object_label: assessment.title })
  return NextResponse.json({ success: true })
}
