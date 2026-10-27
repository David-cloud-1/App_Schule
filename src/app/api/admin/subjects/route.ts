import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { requireContentAdmin, writeAuditLog, assertCanAdminDepartmentContent } from '../_lib/auth'
import { SUBJECTS_CACHE_TAG } from '@/lib/departments-server'

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(5),
  description: z.string().max(500).optional().nullable(),
  // Nur relevant für eine Lehrkraft mit Zuständigkeiten in mehreren
  // Bereichen (PROJ-48) — sie hat keinen einzelnen Arbeits-Bereich wie
  // Admin/Bereichs-Admin. Für die beiden wird ein mitgeschickter Wert
  // ignoriert, es gilt immer ihr eigener Arbeits-Bereich.
  department_id: z.string().uuid().optional(),
})

type SubjectWithLinks = {
  id: string
  name: string
  code: string
  color: string
  icon_name: string
  created_at: string | null
  is_active: boolean
  department_id: string
  departments?: { name: string; code: string } | null
  question_subjects?: {
    questions: { is_active: boolean } | null
  }[]
}

export async function GET() {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, isTeacher } = auth

  // Nur Fächer des eigenen Bereichs (PROJ-22). Eine Lehrkraft (PROJ-48)
  // sieht statt des ganzen Bereichs nur ihre eigenen Fächer — außerhalb
  // ihrer Zuständigkeit sieht sie laut Spec keine Inhalte.
  let query = supabase
    .from('subjects')
    .select(
      `
        id, name, code, color, icon_name, created_at, is_active, department_id,
        departments ( name, code ),
        question_subjects ( questions ( is_active ) )
      `
    )
    .is('deleted_at', null)
    .order('code')

  if (isTeacher) {
    query = query.in('id', auth.subjectIds ?? [])
  } else {
    query = query.eq('department_id', auth.departmentIds[0])
  }

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/admin/subjects]', error)
    return NextResponse.json({ error: 'Failed to load subjects' }, { status: 500 })
  }

  const subjects = ((data ?? []) as unknown as SubjectWithLinks[]).map((s) => {
    const activeCount =
      (s.question_subjects ?? []).filter((qs) => qs.questions?.is_active === true).length
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      color: s.color,
      icon_name: s.icon_name,
      created_at: s.created_at,
      is_active: s.is_active,
      active_question_count: activeCount,
      department_id: s.department_id,
      department_name: s.departments?.name ?? null,
    }
  })

  return NextResponse.json({ subjects })
}

export async function POST(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, user, isTeacher } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Admin/Bereichs-Admin: immer der eigene Arbeits-Bereich. Lehrkraft
  // (PROJ-48, E3): der im Body angegebene Bereich, geprüft gegen ihre
  // eigenen Zuständigkeiten — reicht eine bereichsweite ohne eigenes Fach.
  const departmentId = isTeacher ? parsed.data.department_id ?? (auth.departmentIds.length === 1 ? auth.departmentIds[0] : null) : auth.departmentIds[0]
  if (!departmentId) {
    return NextResponse.json({ error: 'Fachbereich fehlt.' }, { status: 400 })
  }
  const forbidden = assertCanAdminDepartmentContent(auth, departmentId)
  if (forbidden) return forbidden

  const code = parsed.data.code.toUpperCase()

  // Kürzel muss nur innerhalb des Fachbereichs eindeutig sein (PROJ-22)
  const { data: existing } = await supabase
    .from('subjects')
    .select('id, sort_order')
    .eq('department_id', departmentId)
    .limit(100)

  const { data: sameCode } = await supabase
    .from('subjects')
    .select('id')
    .eq('department_id', departmentId)
    .eq('code', code)
    .maybeSingle()

  if (sameCode) {
    return NextResponse.json({ error: 'Fach-Code existiert in diesem Fachbereich bereits.' }, { status: 409 })
  }

  const maxSort = Math.max(0, ...((existing ?? []) as { sort_order: number | null }[]).map((s) => s.sort_order ?? 0))
  const insertPayload: Record<string, unknown> = {
    name: parsed.data.name,
    code,
    color: '#58CC02',
    icon_name: 'BookOpen',
    department_id: departmentId,
    sort_order: maxSort + 1,
  }

  const { data, error } = await supabase
    .from('subjects')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[POST /api/admin/subjects]', error)
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 })
  }

  // Neues Fach sofort in den Lernwegen verfügbar machen (Filter je Bereich, PROJ-23)
  revalidateTag(SUBJECTS_CACHE_TAG, { expire: 0 })

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'subject.create',
    object_type: 'subject',
    object_id: data.id,
    object_label: code,
  })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
