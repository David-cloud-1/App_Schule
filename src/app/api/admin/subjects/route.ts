import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import {
  requireContentAdmin,
  writeAuditLog,
  assertCanAdminDepartmentContent,
  resolveTargetDepartment,
  targetDepartmentMissing,
} from '../_lib/auth'
import { loadLastChanges } from '@/lib/content-history'
import { countBySubject, type QuestionTotals } from '@/lib/question-count'
import { loadCountableQuestions } from '@/lib/question-count-server'
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
  version_number: number
  departments?: { name: string; code: string } | null
}

export async function GET(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  // Fächer des Bereichs der Bereichsleiste, in „Alle Bereiche“ alle (PROJ-70).
  let query = supabase
    .from('subjects')
    .select(
      `
        id, name, code, color, icon_name, created_at, is_active, department_id, version_number,
        departments ( name, code )
      `
    )
    .is('deleted_at', null)
    .order('code')

  if (auth.scopeDepartmentIds) {
    query = query.in('department_id', auth.scopeDepartmentIds)
  }

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/admin/subjects]', error)
    return NextResponse.json({ error: 'Failed to load subjects' }, { status: 500 })
  }

  const lastChanges = await loadLastChanges(
    supabase,
    'subject',
    ((data ?? []) as unknown as SubjectWithLinks[]).map((s) => s.id)
  )

  // Zählregel aus PROJ-131 — dieselbe wie im Inhalts-Baum, ohne die
  // 1000-Zeilen-Grenze eingebetteter Zeilen. Gezählt wird nur mit `?counts=1`
  // (Start „Meine Fächer“): Alle anderen Aufrufer brauchen nur die Fächerliste.
  const subjectRows = (data ?? []) as unknown as SubjectWithLinks[]
  const withCounts = request.nextUrl.searchParams.get('counts') === '1'
  let totals: Map<string, QuestionTotals>
  try {
    totals =
      !withCounts || subjectRows.length === 0
        ? new Map()
        : countBySubject(
            await loadCountableQuestions(supabase, {
              subjectIds: auth.scopeDepartmentIds ? subjectRows.map((s) => s.id) : null,
              isSuperAdmin: auth.isSuperAdmin,
            }),
          )
  } catch (countError) {
    console.error('[GET /api/admin/subjects] counts', countError)
    return NextResponse.json({ error: 'Failed to load subjects' }, { status: 500 })
  }

  const subjects = subjectRows.map((s) => {
    const { total, hidden } = totals.get(s.id) ?? { total: 0, hidden: 0 }
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      color: s.color,
      icon_name: s.icon_name,
      created_at: s.created_at,
      is_active: s.is_active,
      question_count: total,
      hidden_question_count: hidden,
      active_question_count: total - hidden,
      department_id: s.department_id,
      department_name: s.departments?.name ?? null,
      department_code: s.departments?.code ?? null,
      version_number: s.version_number,
      last_changed_by: lastChanges.get(s.id)?.name ?? null,
      last_changed_at: lastChanges.get(s.id)?.at ?? null,
    }
  })

  return NextResponse.json({ subjects })
}

export async function POST(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

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

  // Zielbereich: Angabe im Formular, sonst der Bereich der Leiste; in „Alle
  // Bereiche“ ohne Angabe ist er Pflicht (PROJ-70).
  const departmentId = resolveTargetDepartment(auth, parsed.data.department_id)
  if (!departmentId) return targetDepartmentMissing('das Fach angelegt wird')
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
    return NextResponse.json({ error: 'Fach-Code existiert in diesem Bereich bereits.' }, { status: 409 })
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
