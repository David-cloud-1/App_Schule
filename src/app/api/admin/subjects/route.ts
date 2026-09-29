import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { requireAdmin, writeAuditLog } from '../_lib/auth'
import { SUBJECTS_CACHE_TAG } from '@/lib/departments-server'

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(5),
  description: z.string().max(500).optional().nullable(),
})

type SubjectWithLinks = {
  id: string
  name: string
  code: string
  color: string
  icon_name: string
  created_at: string | null
  is_active: boolean
  question_subjects?: {
    questions: { is_active: boolean } | null
  }[]
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, departmentId } = auth

  // Nur Fächer des eigenen Bereichs (PROJ-22)
  const { data, error } = await supabase
    .from('subjects')
    .select(
      `
        id, name, code, color, icon_name, created_at, is_active,
        question_subjects ( questions ( is_active ) )
      `
    )
    .eq('department_id', departmentId)
    .order('code')

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
    }
  })

  return NextResponse.json({ subjects })
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

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

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
