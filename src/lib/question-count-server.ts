import type { SupabaseClient } from '@supabase/supabase-js'
import type { CountableQuestionRow } from '@/lib/question-count'

const PAGE_SIZE = 1000
// Obergrenze gegen Endlosschleifen: 50.000 Fragen je Bereich sind weit mehr als geplant.
const MAX_PAGES = 50
const SELECT = 'topic_id, class_level, is_active, question_subjects!inner(subject_id)'

/**
 * Lädt alle Fragen, die nach der Zählregel (PROJ-131) zählen: nicht im
 * Papierkorb, im Bereich (`subjectIds`, `null` = alle Bereiche), private nur
 * für den Super-Admin. Die Schnittstelle liefert höchstens 1000 Zeilen je
 * Anfrage; die Seiten laufen gleichzeitig (nacheinander ca. 1,8 s bei 4.000).
 * Wirft bei einem Datenbankfehler.
 */
export async function loadCountableQuestions(
  supabase: SupabaseClient,
  { subjectIds, isSuperAdmin }: { subjectIds: string[] | null; isSuperAdmin: boolean },
): Promise<CountableQuestionRow[]> {
  const query = (select: string, head = false) => {
    let q = supabase
      .from('questions')
      .select(select, head ? { count: 'exact', head: true } : undefined)
      .is('deleted_at', null)
    if (!isSuperAdmin) q = q.eq('is_private', false)
    if (subjectIds) q = q.in('question_subjects.subject_id', subjectIds)
    return q
  }

  const { count, error } = await query(SELECT, true)
  if (error) throw error
  const pages = Math.min(MAX_PAGES, Math.ceil((count ?? 0) / PAGE_SIZE))
  const results = await Promise.all(
    Array.from({ length: pages }, (_, page) =>
      query(SELECT)
        .order('id')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
    ),
  )
  const rows: CountableQuestionRow[] = []
  for (const { data, error: pageError } of results) {
    if (pageError) throw pageError
    rows.push(...((data ?? []) as unknown as CountableQuestionRow[]))
  }
  return rows
}
