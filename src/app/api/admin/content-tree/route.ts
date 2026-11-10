import { NextResponse } from 'next/server'
import { requireContentAdmin } from '../_lib/auth'
import { buildContentTree, type TreeQuestionRow } from '@/lib/content-tree'

const PAGE_SIZE = 1000
// Obergrenze gegen Endlosschleifen: 50.000 Fragen je Bereich sind weit mehr als geplant.
const MAX_PAGES = 50

/**
 * Inhalts-Baum (PROJ-85): Bereiche → Fächer → Themen samt Fragenzahlen,
 * aufgeteilt nach Klassenstufe. Nur lesend; Bereich = Bereichsleiste (PROJ-70).
 */
export async function GET() {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, isSuperAdmin } = auth

  let subjectQuery = supabase
    .from('subjects')
    .select('id, name, code, is_active, department_id, version_number, sort_order, departments(id, name, code)')
    .is('deleted_at', null)
    .order('sort_order')
    .order('code')
    .limit(500)
  if (auth.scopeDepartmentIds) {
    subjectQuery = subjectQuery.in('department_id', auth.scopeDepartmentIds)
  }
  const { data: subjects, error: subjectError } = await subjectQuery
  if (subjectError) {
    console.error('[GET /api/admin/content-tree] subjects', subjectError)
    return NextResponse.json({ error: 'Failed to load content tree' }, { status: 500 })
  }
  const subjectIds = new Set(((subjects ?? []) as { id: string }[]).map((s) => s.id))

  // Themen seitenweise holen (die Schnittstelle liefert höchstens 1000 Zeilen je Anfrage)
  const topics: unknown[] = []
  if (subjectIds.size > 0) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, subject_id, version_number')
        .in('subject_id', Array.from(subjectIds))
        .is('deleted_at', null)
        .order('name')
        .order('id')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) {
        console.error('[GET /api/admin/content-tree] topics', error)
        return NextResponse.json({ error: 'Failed to load content tree' }, { status: 500 })
      }
      for (const t of data ?? []) topics.push(t)
      if (!data || data.length < PAGE_SIZE) break
    }
  }

  // Fragen seitenweise zählen (PostgREST kappt bei 1000 Zeilen). Private
  // Nachweis-Fragen sieht nur der Super-Admin (PROJ-46), wie auf „Fragen“.
  const rows: TreeQuestionRow[] = []
  if (subjectIds.size > 0) {
    for (let page = 0; page < MAX_PAGES; page++) {
      let query = supabase
        .from('questions')
        .select('topic_id, class_level, question_subjects!inner(subject_id)')
        .is('deleted_at', null)
        .order('id')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (!isSuperAdmin) query = query.eq('is_private', false)
      if (auth.scopeDepartmentIds) {
        query = query.in('question_subjects.subject_id', Array.from(subjectIds))
      }
      const { data, error } = await query
      if (error) {
        console.error('[GET /api/admin/content-tree] questions', error)
        return NextResponse.json({ error: 'Failed to load content tree' }, { status: 500 })
      }
      for (const r of (data ?? []) as unknown as TreeQuestionRow[]) rows.push(r)
      if (!data || data.length < PAGE_SIZE) break
    }
  }

  const tree = buildContentTree({
    subjects: (subjects ?? []) as unknown as Parameters<typeof buildContentTree>[0]['subjects'],
    topics: topics as Parameters<typeof buildContentTree>[0]['topics'],
    questions: rows,
  })

  return NextResponse.json(tree)
}
