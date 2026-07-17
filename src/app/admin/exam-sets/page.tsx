import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ExamSetsClient } from './exam-sets-client'

const PAGE_SIZE = 1000

type QuestionRow = {
  id: string
  question_text: string
  type: string
  difficulty: string
  question_subjects: { subject_id: string }[]
}

/**
 * Fetch every active question, paginating past the PostgREST default row cap
 * (1000). Without this, sets referencing questions beyond the newest 1000
 * show raw UUIDs and those questions are missing from the create picker.
 */
async function fetchAllActiveQuestions(supabase: SupabaseClient): Promise<QuestionRow[]> {
  const all: QuestionRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, type, difficulty, question_subjects(subject_id)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error || !data || data.length === 0) break
    all.push(...(data as unknown as QuestionRow[]))
    if (data.length < PAGE_SIZE) break
  }
  return all
}

export default async function AdminExamSetsPage() {
  const supabase = await createClient()

  const [{ data: sets }, questions, { data: subjects }] = await Promise.all([
    supabase
      .from('exam_question_sets')
      .select('*')
      .order('created_at', { ascending: false }),
    fetchAllActiveQuestions(supabase),
    supabase
      .from('subjects')
      .select('id, code, name')
      .order('code'),
  ])

  return (
    <ExamSetsClient
      initialSets={sets ?? []}
      questions={questions}
      subjects={subjects ?? []}
    />
  )
}
