import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../_lib/auth'
import { checkQuestionSelection } from '@/lib/assessment-questions'
import { formatAccessCode, generateAccessCode, validateGradingScale } from '@/lib/graded-assessments'
import { validateFocusSettings } from '@/lib/focus-tracking'
import { MAX_CLASS_NAME_LENGTH, resolveCategory } from '@/lib/assessment-category'

const CreateAssessmentSchema = z.object({
  // PROJ-46: der Zielbereich wird jetzt beim Anlegen gewählt statt automatisch
  // aus dem Arbeitsbereich der anlegenden Person übernommen.
  departmentId: z.string().uuid(),
  questionIds: z.array(z.string().uuid()).min(1).max(500),
  title: z.string().min(1).max(100),
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(600),
  gradingScale: z.array(z.object({
    grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    minPercent: z.number().min(0).max(100),
  })).length(6),
  // PROJ-30: Fokus-Verlust-Protokoll. Ohne Angabe aus (der Dialog schickt „an" ausdrücklich).
  focusTracking: z.boolean().default(false),
  focusAutoSubmitAfter: z.number().int().nullable().default(null),
  // PROJ-39: Ablage, alles optional. Ohne Schuljahr gilt der DB-Standard (aus dem Erstelldatum).
  className: z.string().max(MAX_CLASS_NAME_LENGTH).nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  schoolYear: z.string().optional(),
})

const ListQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  // 'deleted' = Konto gelöscht (created_by leer); sonst eine Nutzer-ID. Nur
  // für den Super-Admin wirksam — alle anderen sehen laut Datenbank-Regel
  // ohnehin nur ihre eigenen bzw. die geteilten ihres Bereichs.
  createdBy: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const parsedQuery = ListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  if (!parsedQuery.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }
  const { departmentId, createdBy } = parsedQuery.data

  // Keine .eq('department_id', ...) mehr auf den Arbeitsbereich der anfragenden
  // Person: die Datenbank-Regel (PROJ-46) entscheidet bereits, welche Zeilen
  // überhaupt zurückkommen. departmentId/createdBy sind reine Zusatzfilter.
  let query = supabase
    .from('graded_assessments')
    .select(
      'id, title, part, status, access_code, created_at, exam_set_id, school_year, class_name, subject_id, department_id, created_by, exam_question_sets(name), subjects(name, code), departments(name, code)'
    )
    .order('created_at', { ascending: false })
  if (departmentId) query = query.eq('department_id', departmentId)
  if (auth.isSuperAdmin && createdBy) {
    query = createdBy === 'deleted' ? query.is('created_by', null) : query.eq('created_by', createdBy)
  }

  const { data, error } = await query
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

  // Namen der Erstellerinnen — nur für den Super-Admin interessant (die
  // anderen Rollen sehen laut Regel ohnehin nur sich selbst bzw. den eigenen
  // Bereich, da ist „Erstellt von" redundant). „Ehemalige / ohne Rolle":
  // das Konto existiert noch, hat aber keine Lehrer-Rolle mehr (E5).
  const creatorNameById = new Map<string, { name: string; former: boolean }>()
  if (auth.isSuperAdmin) {
    const creatorIds = [...new Set((data ?? []).map((a) => a.created_by as string | null).filter((id): id is string => !!id))]
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, pseudonym, role')
        .in('id', creatorIds)
      for (const p of profiles ?? []) {
        const row = p as { id: string; display_name: string | null; pseudonym: string | null; role: string }
        creatorNameById.set(row.id, {
          name: row.display_name ?? row.pseudonym ?? 'Unbekannt',
          former: row.role === 'student',
        })
      }
    }
  }

  const assessments = (data ?? []).map((a) => {
    const creator = a.created_by ? creatorNameById.get(a.created_by as string) : undefined
    return {
      id: a.id,
      title: a.title,
      examSetName: (a.exam_question_sets as unknown as { name: string } | null)?.name ?? null,
      part: a.part,
      status: a.status,
      accessCode: formatAccessCode(a.access_code),
      participantCount: counts[a.id]?.participantCount ?? 0,
      submittedCount: counts[a.id]?.submittedCount ?? 0,
      createdAt: a.created_at,
      schoolYear: a.school_year as string,
      className: (a.class_name as string | null) ?? null,
      subjectId: (a.subject_id as string | null) ?? null,
      subjectName: (a.subjects as unknown as { name: string } | null)?.name ?? null,
      subjectCode: (a.subjects as unknown as { code: string } | null)?.code ?? null,
      departmentId: a.department_id as string | null,
      departmentName: (a.departments as unknown as { name: string } | null)?.name ?? null,
      departmentCode: (a.departments as unknown as { code: string } | null)?.code ?? null,
      // Nur für den Super-Admin befüllt (s. o.)
      createdBy: auth.isSuperAdmin ? ((a.created_by as string | null) ?? null) : undefined,
      createdByName: auth.isSuperAdmin
        ? (a.created_by ? creator?.name ?? 'Unbekannt' : 'Gelöschtes Konto')
        : undefined,
      createdByFormer: auth.isSuperAdmin ? (creator?.former ?? false) : undefined,
    }
  })

  return NextResponse.json({ assessments })
}

export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

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
  const { departmentId, questionIds, title, opensAt, closesAt, durationMinutes, gradingScale, focusTracking, focusAutoSubmitAfter, className, subjectId, schoolYear } = parsed.data

  if (new Date(closesAt).getTime() <= new Date(opensAt).getTime()) {
    return NextResponse.json({ error: 'Ende muss nach dem Start liegen.' }, { status: 400 })
  }
  const scaleError = validateGradingScale(gradingScale)
  if (scaleError) return NextResponse.json({ error: scaleError }, { status: 400 })
  const focusError = validateFocusSettings({ focusTracking, focusAutoSubmitAfter })
  if (focusError) return NextResponse.json({ error: focusError }, { status: 400 })

  // Zielbereich muss existieren und aktiv sein (die Datenbank-Regel beim
  // Anlegen prüft das ohnehin noch einmal, das hier ist nur die freundliche
  // Fehlermeldung statt eines rohen RLS-Fehlers).
  const { data: targetDepartment } = await supabase
    .from('departments')
    .select('id')
    .eq('id', departmentId)
    .eq('is_active', true)
    .maybeSingle()
  if (!targetDepartment) {
    return NextResponse.json({ error: 'Dieser Fachbereich ist nicht verfügbar.' }, { status: 400 })
  }

  // Fragen serverseitig prüfen: aktiv, Multiple-Choice, Fachbereichs-Pool
  // oder eigene private Nachweis-Frage dieses Bereichs (PROJ-46, E6)
  let check
  try {
    check = await checkQuestionSelection(supabase, departmentId, questionIds, user.id)
  } catch (err) {
    console.error('[POST /api/admin/assessments]', err)
    return NextResponse.json({ error: 'Fragen konnten nicht geprüft werden.' }, { status: 500 })
  }
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  // PROJ-39: Ablage prüfen (Fach gehört zum Zielbereich, Klasse vereinheitlichen)
  const category = await resolveCategory(supabase, departmentId, { className, subjectId, schoolYear })
  if (!category.ok) return NextResponse.json({ error: category.error }, { status: category.status })

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
      // Technischer Teil, aus den gewählten Fragen abgeleitet
      part: check.part,
      department_id: departmentId,
      draft_question_ids: check.ids,
      title,
      access_code: accessCode,
      duration_minutes: durationMinutes,
      opens_at: opensAt,
      closes_at: closesAt,
      grading_scale: gradingScale,
      focus_tracking: focusTracking,
      focus_auto_submit_after: focusAutoSubmitAfter,
      ...category.columns,
      created_by: user.id,
      // shared_with_department setzt die Datenbank selbst (Trigger, PROJ-46) —
      // nie vom Browser.
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
    department_id: departmentId,
  })

  return NextResponse.json({ id: created.id }, { status: 201 })
}
