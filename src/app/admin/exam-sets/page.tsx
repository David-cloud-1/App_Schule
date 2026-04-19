import { createClient } from '@/lib/supabase-server'
import { ExamSetsClient } from './exam-sets-client'

export default async function AdminExamSetsPage() {
  const supabase = await createClient()

  const [{ data: sets }, { data: questions }, { data: subjects }] = await Promise.all([
    supabase
      .from('exam_question_sets')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('questions')
      .select('id, question_text, type, difficulty, question_subjects(subject_id)')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('subjects')
      .select('id, code, name')
      .order('code'),
  ])

  return (
    <ExamSetsClient
      initialSets={sets ?? []}
      questions={questions ?? []}
      subjects={subjects ?? []}
    />
  )
}
