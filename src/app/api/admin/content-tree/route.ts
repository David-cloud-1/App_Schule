import { NextResponse } from 'next/server'
import { requireContentAdmin } from '../_lib/auth'
import { buildContentTree } from '@/lib/content-tree'
import type { CountableQuestionRow } from '@/lib/question-count'
import { loadCountableQuestions } from '@/lib/question-count-server'

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
  // Zeilen je Anfrage.
  const topicsQuery = (from: number) =>
    supabase
      .from('topics')
      .select('id, name, subject_id, version_number')
      .in('subject_id', ids)
      .is('deleted_at', null)
      .order('name')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)

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

  let topics: unknown[] = []
  let rows: CountableQuestionRow[] = []
  if (ids.length > 0) {
    try {
      ;[topics, rows] = await Promise.all([
        loadAllTopics(),
        loadCountableQuestions(supabase, {
          subjectIds: auth.scopeDepartmentIds ? ids : null,
          isSuperAdmin,
        }),
      ])
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
