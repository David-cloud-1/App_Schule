import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireContentAdmin } from '../_lib/auth'
import { isContentType, loadLastChanges, type ContentType } from '@/lib/content-history'

const QuerySchema = z.object({
  type: z.string().refine(isContentType, { message: 'Unbekannter Inhaltstyp' }),
})

/**
 * Papierkorb je Inhaltstyp (PROJ-47/70): alle Lehrer-Rollen sehen die gelöschten
 * Inhalte des Bereichs der Bereichsleiste, in „Alle Bereiche“ aller Bereiche,
 * jeweils mit Löschdatum, löschender Person und Bereichs-Etikett. Fragen und
 * Themen haben keine eigene department_id-Spalte — der Bereich kommt über den
 * verknüpften Fach-Join, genau wie in den übrigen Verwaltungsrouten.
 */
type Dept = { name: string; code: string } | null

export async function GET(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, scopeDepartmentIds } = auth

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' }, { status: 400 })
  }
  const type = parsed.data.type
  const failed = NextResponse.json({ error: 'Papierkorb konnte nicht geladen werden.' }, { status: 500 })

  async function withDeleter<T extends { id: string }>(rows: T[], department: (r: T) => Dept) {
    const lastChanges = await loadLastChanges(supabase, type as ContentType, rows.map((r) => r.id))
    return rows.map((r) => ({
      ...r,
      department_name: department(r)?.name ?? null,
      department_code: department(r)?.code ?? null,
      deleted_by: lastChanges.get(r.id)?.name ?? null,
    }))
  }

  if (type === 'subject') {
    let query = supabase
      .from('subjects')
      .select('id, name, code, deleted_at, departments ( name, code )')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200)
    if (scopeDepartmentIds) query = query.in('department_id', scopeDepartmentIds)
    const { data, error } = await query
    if (error) return failed
    type Row = { id: string; name: string; code: string; deleted_at: string; departments: Dept }
    const items = await withDeleter(
      ((data ?? []) as unknown as Row[]).map(({ departments, ...r }) => ({ ...r, dept: departments })),
      (r) => r.dept
    )
    return NextResponse.json({ items: items.map(({ dept: _d, ...r }) => r) })
  }

  if (type === 'exam_question_set') {
    let query = supabase
      .from('exam_question_sets')
      .select('id, name, deleted_at, departments ( name, code )')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200)
    if (scopeDepartmentIds) query = query.in('department_id', scopeDepartmentIds)
    const { data, error } = await query
    if (error) return failed
    type Row = { id: string; name: string; deleted_at: string; departments: Dept }
    const items = await withDeleter(
      ((data ?? []) as unknown as Row[]).map(({ departments, ...r }) => ({ ...r, dept: departments })),
      (r) => r.dept
    )
    return NextResponse.json({ items: items.map(({ dept: _d, ...r }) => r) })
  }

  if (type === 'topic') {
    let query = supabase
      .from('topics')
      .select('id, name, deleted_at, subjects!inner(department_id, departments ( name, code ))')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200)
    if (scopeDepartmentIds) query = query.in('subjects.department_id', scopeDepartmentIds)
    const { data, error } = await query
    if (error) return failed
    type Row = { id: string; name: string; deleted_at: string; subjects: { departments: Dept } | null }
    const items = await withDeleter(
      ((data ?? []) as unknown as Row[]).map(({ id, name, deleted_at, subjects }) => ({
        id,
        name,
        deleted_at,
        dept: subjects?.departments ?? null,
      })),
      (r) => r.dept
    )
    return NextResponse.json({ items: items.map(({ dept: _d, ...r }) => r) })
  }

  // type === 'question'
  let query = supabase
    .from('questions')
    .select(
      'id, question_text, deleted_at, qs_filter:question_subjects!inner ( subject_id, subjects!inner ( department_id, departments ( name, code ) ) )'
    )
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(200)
  if (scopeDepartmentIds) query = query.in('qs_filter.subjects.department_id', scopeDepartmentIds)
  const { data, error } = await query
  if (error) return failed
  type Row = {
    id: string
    question_text: string
    deleted_at: string
    qs_filter: { subjects: { departments: Dept } | null }[]
  }
  const items = await withDeleter(
    ((data ?? []) as unknown as Row[]).map(({ id, question_text, deleted_at, qs_filter }) => ({
      id,
      question_text,
      deleted_at,
      dept: qs_filter?.[0]?.subjects?.departments ?? null,
    })),
    (r) => r.dept
  )
  return NextResponse.json({ items: items.map(({ dept: _d, ...r }) => r) })
}
