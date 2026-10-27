import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher } from '../_lib/auth'

/**
 * „Meine Fächer" (PROJ-48) — eine Lehrkraft trägt sich selbst für Fächer
 * (oder nur einen Fachbereich, für Bereiche ohne eigene Fächer) ein. Keine
 * Freigabe durch Admins (E1): Änderungen gelten sofort, abgesichert über das
 * Änderungsprotokoll (PROJ-47).
 */

const CreateSchema = z.object({
  department_id: z.string().uuid(),
  subject_id: z.string().uuid().nullable(),
})

/** Katalog (aktive Bereiche + Fächer) und die eigenen Zuständigkeiten. */
export async function GET() {
  const auth = await requireTeacher()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const [{ data: departments, error: deptErr }, { data: subjects, error: subjErr }, { data: assignments, error: assignErr }] =
    await Promise.all([
      supabase.from('departments').select('id, name, code').eq('is_active', true).order('sort_order'),
      supabase
        .from('subjects')
        .select('id, name, code, department_id')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order'),
      supabase.from('teacher_subject_assignments').select('id, department_id, subject_id').eq('teacher_id', user.id),
    ])

  if (deptErr || subjErr || assignErr) {
    console.error('[GET /api/admin/my-subjects]', deptErr ?? subjErr ?? assignErr)
    return NextResponse.json({ error: 'Daten konnten nicht geladen werden.' }, { status: 500 })
  }

  return NextResponse.json({
    departments: departments ?? [],
    subjects: subjects ?? [],
    assignments: assignments ?? [],
  })
}

/** Eine neue Zuständigkeit eintragen — immer für sich selbst. */
export async function POST(request: NextRequest) {
  const auth = await requireTeacher()
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
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }
  const { department_id, subject_id } = parsed.data

  const { data: department } = await supabase
    .from('departments')
    .select('id')
    .eq('id', department_id)
    .eq('is_active', true)
    .maybeSingle()
  if (!department) {
    return NextResponse.json({ error: 'Fachbereich nicht gefunden.' }, { status: 404 })
  }

  if (subject_id) {
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject_id)
      .eq('department_id', department_id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!subject) {
      return NextResponse.json({ error: 'Fach nicht gefunden.' }, { status: 404 })
    }
  }

  const { data, error } = await supabase
    .from('teacher_subject_assignments')
    .insert({ teacher_id: user.id, department_id, subject_id })
    .select('id, department_id, subject_id')
    .single()

  if (error) {
    // 23505 = schon eingetragen — für die Oberfläche kein Fehler, sondern "ok"
    if (error.code === '23505') {
      return NextResponse.json({ ok: true })
    }
    console.error('[POST /api/admin/my-subjects]', error)
    return NextResponse.json({ error: 'Eintragen fehlgeschlagen.' }, { status: 500 })
  }

  return NextResponse.json({ assignment: data }, { status: 201 })
}
