import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../_lib/auth'
import { checkQuestionSelection } from '@/lib/assessment-questions'
import { formatAccessCode, generateAccessCode, validateGradingScale } from '@/lib/graded-assessments'

const CreateAssessmentSchema = z.object({
  part: z.number().int().min(1).max(20),
  questionIds: z.array(z.string().uuid()).min(1).max(500),
  title: z.string().min(1).max(100),
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(600),
  gradingScale: z.array(z.object({
    grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    minPercent: z.number().min(0).max(100),
  })).length(6),
})

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, departmentId } = auth

  const { data, error } = await supabase
    .from('graded_assessments')
    .select('id, title, part, status, access_code, created_at, exam_set_id, exam_question_sets(name)')
    .eq('department_id', departmentId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })

  const ids = (data ?? []).map((a) => a.id)
  const counts: Record<string, { participantCount: number; submittedCount: number }> = {}
  if (ids.length > 0) {
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('assessment_id, status')
      .in('assessment_id', ids)
    for (const s of sessions ?? []) {
      const key = s.assessment_id as string
      if (!counts[key]) counts[key] = { participantCount: 0, submittedCount: 0 }
      counts[key].participantCount += 1
      if (s.status !== 'in_progress') counts[key].submittedCount += 1
    }
  }

  const assessments = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    examSetName: (a.exam_question_sets as unknown as { name: string } | null)?.name ?? null,
    part: a.part,
    status: a.status,
    accessCode: formatAccessCode(a.access_code),
    participantCount: counts[a.id]?.participantCount ?? 0,
    submittedCount: counts[a.id]?.submittedCount ?? 0,
    createdAt: a.created_at,
  }))

  return NextResponse.json({ assessments })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user, departmentId } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = CreateAssessmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }
  const { part, questionIds, title, opensAt, closesAt, durationMinutes, gradingScale } = parsed.data

  if (new Date(closesAt).getTime() <= new Date(opensAt).getTime()) {
    return NextResponse.json({ error: 'Ende muss nach dem Start liegen.' }, { status: 400 })
  }
  const scaleError = validateGradingScale(gradingScale)
  if (scaleError) return NextResponse.json({ error: scaleError }, { status: 400 })

  // Fragen serverseitig prüfen: aktiv, Multiple-Choice, Fachbereich und Teil (PROJ-27)
  let check
  try {
    check = await checkQuestionSelection(supabase, departmentId, part, questionIds)
  } catch (err) {
    console.error('[POST /api/admin/assessments]', err)
    return NextResponse.json({ error: 'Fragen konnten nicht geprüft werden.' }, { status: 500 })
  }
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  // Generate a unique code, retrying on collision (extremely unlikely given
  // ~887M combinations, but the spec calls out the edge case explicitly).
  let accessCode: string | null = null
  for (let i = 0; i < 30; i++) {
    const candidate = generateAccessCode()
    const { data: existing } = await supabase
      .from('graded_assessments')
      .select('id')
      .eq('access_code', candidate)
      .maybeSingle()
    if (!existing) { accessCode = candidate; break }
  }
  if (!accessCode) {
    return NextResponse.json({ error: 'Konnte keinen eindeutigen Code erzeugen. Bitte erneut versuchen.' }, { status: 500 })
  }

  const { data: created, error } = await supabase
    .from('graded_assessments')
    .insert({
      // Kein Prüfungsset: die Fragen stehen bis zum Öffnen im Entwurf (PROJ-27)
      part,
      department_id: departmentId,
      draft_question_ids: check.ids,
      title,
      access_code: accessCode,
      duration_minutes: durationMinutes,
      opens_at: opensAt,
      closes_at: closesAt,
      grading_scale: gradingScale,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: 'Erstellen fehlgeschlagen.' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'graded_assessment.create',
    object_type: 'graded_assessment',
    object_id: created.id,
    object_label: title,
  })

  return NextResponse.json({ id: created.id }, { status: 201 })
}
