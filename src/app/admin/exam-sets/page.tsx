import { createClient } from '@/lib/supabase-server'
import { requireContentAdmin } from '@/app/api/admin/_lib/auth'
import { loadLastChanges } from '@/lib/content-history'
import { getExamPartsByDepartment } from '@/lib/departments-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ComponentProps } from 'react'
import { ExamSetsClient } from './exam-sets-client'

const PAGE_SIZE = 1000

type QuestionRow = {
  id: string
  question_text: string
  type: string
  difficulty: string
  class_level: number | null
  topics: { name: string } | null
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
      .select('id, question_text, type, difficulty, class_level, topics(name), question_subjects(subject_id)')
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
  // Wie GET /api/admin/exam-sets: Sets des Bereichs der Bereichsleiste, in „Alle Bereiche“ alle (PROJ-70)
  const auth = await requireContentAdmin()
  if (auth.error) return null

  let setsQuery = supabase
    .from('exam_question_sets')
    .select('*, departments ( name, code )')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (auth.scopeDepartmentIds) setsQuery = setsQuery.in('department_id', auth.scopeDepartmentIds)

  const [{ data: sets }, questions, examPartsByDepartment] = await Promise.all([
    setsQuery,
    fetchAllActiveQuestions(supabase),
    getExamPartsByDepartment(auth.departmentIds),
  ])

  // „Zuletzt geändert von <Name> am <Datum>“ (PROJ-70)
  const lastChanges = await loadLastChanges(
    supabase,
    'exam_question_set',
    (sets ?? []).map((x: { id: string }) => x.id)
  )
  const setsWithMeta = (sets ?? []).map((x: { id: string }) => ({
    ...x,
    last_changed_by: lastChanges.get(x.id)?.name ?? null,
    last_changed_at: lastChanges.get(x.id)?.at ?? null,
  }))

  return (
    <ExamSetsClient
      initialSets={setsWithMeta as unknown as ComponentProps<typeof ExamSetsClient>['initialSets']}
      questions={questions}
      examPartsByDepartment={examPartsByDepartment}
    />
  )
}
