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

  const ids = Array.from(subjectIds)

  // Themen und Fragen parallel holen. Die Schnittstelle liefert höchstens 1000
  // Zeilen je Anfrage; die Seiten laufen gleichzeitig statt nacheinander
  // (nacheinander: ca. 1,8 s bei 4.000 Fragen).
  const topicsQuery = (from: number) =>
    supabase
      .from('topics')
      .select('id, name, subject_id, version_number')
      .in('subject_id', ids)
      .is('deleted_at', null)
      .order('name')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)

  // Private Nachweis-Fragen sieht nur der Super-Admin (PROJ-46), wie auf „Fragen“.
  const questionsQuery = (select: string, head = false) => {
    let query = supabase
      .from('questions')
      .select(select, head ? { count: 'exact', head: true } : undefined)
      .is('deleted_at', null)
    if (!isSuperAdmin) query = query.eq('is_private', false)
    if (auth.scopeDepartmentIds) query = query.in('question_subjects.subject_id', ids)
    return query
  }

  async function loadAllTopics(): Promise<unknown[]> {
    const rows: unknown[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await topicsQuery(page * PAGE_SIZE)
      if (error) throw error
      rows.push(...(data ?? []))
      if (!data || data.length < PAGE_SIZE) break
    }
    return rows
  }

  async function loadAllQuestions(): Promise<TreeQuestionRow[]> {
    const select = 'topic_id, class_level, question_subjects!inner(subject_id)'
    const { count, error } = await questionsQuery(select, true)
    if (error) throw error
    const pages = Math.min(MAX_PAGES, Math.ceil((count ?? 0) / PAGE_SIZE))
    const results = await Promise.all(
      Array.from({ length: pages }, (_, page) =>
        questionsQuery(select)
          .order('id')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
      ),
    )
    const rows: TreeQuestionRow[] = []
    for (const { data, error: pageError } of results) {
      if (pageError) throw pageError
      rows.push(...((data ?? []) as unknown as TreeQuestionRow[]))
    }
    return rows
  }

  let topics: unknown[] = []
  let rows: TreeQuestionRow[] = []
  if (ids.length > 0) {
    try {
      ;[topics, rows] = await Promise.all([loadAllTopics(), loadAllQuestions()])
    } catch (error) {
      console.error('[GET /api/admin/content-tree] topics/questions', error)
      return NextResponse.json({ error: 'Failed to load content tree' }, { status: 500 })
    }
  }

  const tree = buildContentTree({
    subjects: (subjects ?? []) as unknown as Parameters<typeof buildContentTree>[0]['subjects'],
    topics: topics as Parameters<typeof buildContentTree>[0]['topics'],
    questions: rows,
  })

  return NextResponse.json(tree)
}
