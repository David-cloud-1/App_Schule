import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/fetch-all-rows'
import type { LearnQuestion } from '@/lib/learn-library'

export type QuestionSubjectLink = { subject_id: string; question_id: string }

/**
 * Every (subject_id, question_id) pair for active questions, paginated past the
 * 1000-row cap.
 *
 * The cap also applies to PostgREST embedded rows, so the earlier
 * subjects→question_subjects embed silently truncated large subjects (STG at
 * 1431 active questions rendered as ~998). Loading the join table directly and
 * paging over it fixes every subject at once.
 *
 * Sorted by (subject_id, question_id) — the table's composite key — so pages
 * never duplicate or skip a row.
 */
export async function fetchActiveQuestionSubjects(
  supabase: SupabaseClient,
): Promise<QuestionSubjectLink[]> {
  const { rows } = await fetchAllRows<QuestionSubjectLink>('question_subjects', (from, to) =>
    supabase
      .from('question_subjects')
      .select('subject_id, question_id, questions!inner(is_active)')
      .eq('questions.is_active', true)
      .order('subject_id')
      .order('question_id')
      .range(from, to),
  )
  return rows.map(({ subject_id, question_id }) => ({ subject_id, question_id }))
}

/** Group active question IDs by subject ID. */
export function groupQuestionIdsBySubject(
  links: QuestionSubjectLink[],
): Map<string, string[]> {
  const bySubject = new Map<string, string[]>()
  for (const { subject_id, question_id } of links) {
    const ids = bySubject.get(subject_id) ?? []
    ids.push(question_id)
    bySubject.set(subject_id, ids)
  }
  return bySubject
}

type LearnQuestionRow = {
  subject_id: string
  question_id: string
  questions: { topic_id: string | null; class_level: number | null } | null
}

/**
 * Aktive Lernfragen der angegebenen Fächer mit Thema und Klassenstufe
 * (PROJ-43), seitenweise über die 1000-Zeilen-Grenze hinweg.
 */
export async function fetchLearnQuestions(
  supabase: SupabaseClient,
  subjectIds: string[],
): Promise<LearnQuestion[]> {
  if (subjectIds.length === 0) return []
  const { rows } = await fetchAllRows<LearnQuestionRow>('question_subjects (learn)', (from, to) =>
    supabase
      .from('question_subjects')
      .select('subject_id, question_id, questions!inner(is_active, assessment_only, topic_id, class_level)')
      .in('subject_id', subjectIds)
      .eq('questions.is_active', true)
      .eq('questions.assessment_only', false)
      .order('subject_id')
      .order('question_id')
      .range(from, to) as unknown as PromiseLike<{ data: LearnQuestionRow[] | null; error: PostgrestError | null }>,
  )
  return rows.map((r) => ({
    id: r.question_id,
    subjectId: r.subject_id,
    topicId: r.questions?.topic_id ?? null,
    classLevel: r.questions?.class_level ?? null,
  }))
}
