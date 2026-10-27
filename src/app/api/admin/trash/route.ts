import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireContentAdmin } from '../_lib/auth'
import { isContentType } from '@/lib/content-history'

const QuerySchema = z.object({
  type: z.string().refine(isContentType, { message: 'Unbekannter Inhaltstyp' }),
})

/**
 * Papierkorb je Inhaltstyp (PROJ-47/48) — Super-Admin alles, Bereichs-Admin
 * ihr Bereich, eine Lehrkraft mit Zuständigkeit (PROJ-48) ihre eigenen
 * Fächer/Themen bzw. die Prüfungssets ihrer Bereiche. Fragen und Themen
 * haben keine eigene department_id-Spalte — der Bereich/das Fach kommt über
 * den verknüpften Fach-Join, genau wie in den übrigen Verwaltungsrouten.
 */
export async function GET(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, isSuperAdmin, isTeacher, departmentIds } = auth

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' }, { status: 400 })
  }
  const type = parsed.data.type

  if (type === 'subject') {
    let query = supabase
      .from('subjects')
      .select('id, name, code, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200)
    if (!isSuperAdmin) {
      query = isTeacher ? query.in('id', auth.subjectIds ?? []) : query.eq('department_id', departmentIds[0])
    }
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Papierkorb konnte nicht geladen werden.' }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  }

  if (type === 'exam_question_set') {
    let query = supabase
      .from('exam_question_sets')
      .select('id, name, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200)
    if (!isSuperAdmin) {
      query = query.in('department_id', departmentIds)
    }
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Papierkorb konnte nicht geladen werden.' }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  }

  if (type === 'topic') {
    let query = supabase
      .from('topics')
      .select('id, name, deleted_at, subjects!inner(department_id)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200)
    if (!isSuperAdmin) {
      query = isTeacher
        ? query.in('subject_id', auth.subjectIds ?? [])
        : query.eq('subjects.department_id', departmentIds[0])
    }
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Papierkorb konnte nicht geladen werden.' }, { status: 500 })
    const items = ((data ?? []) as unknown as { id: string; name: string; deleted_at: string }[]).map(
      ({ id, name, deleted_at }) => ({ id, name, deleted_at })
    )
    return NextResponse.json({ items })
  }

  // type === 'question'
  let query = supabase
    .from('questions')
    .select('id, question_text, deleted_at, qs_filter:question_subjects!inner ( subject_id, subjects!inner ( department_id ) )')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(200)
  if (!isSuperAdmin) {
    query = isTeacher
      ? query.in('qs_filter.subject_id', auth.subjectIds ?? [])
      : query.eq('qs_filter.subjects.department_id', departmentIds[0])
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Papierkorb konnte nicht geladen werden.' }, { status: 500 })
  const items = ((data ?? []) as unknown as { id: string; question_text: string; deleted_at: string }[]).map(
    ({ id, question_text, deleted_at }) => ({ id, question_text, deleted_at })
  )
  return NextResponse.json({ items })
}
