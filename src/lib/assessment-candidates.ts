import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'
import { levelFor, type Candidate } from '@/lib/assessment-suggest'

const STATS_PAGE = 1000

type StatRow = { question_id: string; attempts: number | null; correct: number | null; open_reports: number | null }

/** Ids der Fragen aus den letzten `n` Nachweisen dieser Person */
export async function recentQuestionIds(supabase: SupabaseClient, userId: string, n: number): Promise<Set<string>> {
  if (n <= 0) return new Set()
  const { data, error } = await supabase
    .from('graded_assessments')
    .select('draft_question_ids, question_ids_snapshot')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(n)
  if (error) throw new Error(`recent: ${error.message}`)
  const ids = new Set<string>()
  for (const row of (data ?? []) as { draft_question_ids: string[] | null; question_ids_snapshot: string[] | null }[]) {
    for (const id of row.question_ids_snapshot ?? row.draft_question_ids ?? []) ids.add(id)
  }
  return ids
}

/**
 * Lädt den Pool des Zielbereichs samt Lösungsquoten (PROJ-74). Fehlt die
 * Auswertung, gelten alle Fragen als „mittel“ und der Aufrufer bekommt einen
 * Hinweis — ein Vorschlag ist dann immer noch möglich.
 */
export async function loadCandidates(supabase: SupabaseClient, userId: string, departmentId: string) {
  const questions = await fetchSelectableQuestions(supabase, departmentId, userId)
  const stats = new Map<string, StatRow>()
  let statsAvailable = true
  // PostgREST kappt bei 1000 Zeilen: nur Fragen mit Antworten holen, stabil sortiert und seitenweise
  for (let from = 0; ; from += STATS_PAGE) {
    const { data, error } = await supabase
      .rpc('question_difficulty_stats', {
        p_department_ids: [departmentId],
        p_class_level: null,
        p_days: null,
        p_subject_id: null,
      })
      .gt('attempts', 0)
      .order('question_id')
      .order('subject_id')
      .range(from, from + STATS_PAGE - 1)
    if (error) {
      console.error('[assessment-candidates] stats', error)
      statsAvailable = false
      stats.clear()
      break
    }
    const rows = (data ?? []) as StatRow[]
    for (const row of rows) if (!stats.has(row.question_id)) stats.set(row.question_id, row)
    if (rows.length < STATS_PAGE) break
  }
  const all: Candidate[] = questions.map((q) => {
    const s = stats.get(q.id)
    const attempts = s?.attempts ?? 0
    const correct = s?.correct ?? 0
    return {
      id: q.id,
      question_text: q.question_text,
      topic: q.topic,
      class_level: q.class_level,
      subject_codes: q.subject_codes,
      isPrivate: q.isPrivate,
      attempts,
      correct,
      openReports: s?.open_reports ?? 0,
      blocked: q.blocked,
      ...levelFor(attempts, correct),
    }
  })
  return { all, statsAvailable }
}
