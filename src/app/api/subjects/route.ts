import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { fetchActiveQuestionSubjects, groupQuestionIdsBySubject } from '@/lib/subject-questions'

export interface SubjectWithCount {
  id: string
  code: string
  name: string
  color: string
  icon_name: string
  active_question_count: number
}

export async function GET() {
  const supabase = await createClient()

  // Verify authenticated session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch subjects and active question links separately — an embedded
  // question_subjects join would truncate large subjects at the 1000-row cap.
  const [{ data, error }, questionSubjects] = await Promise.all([
    supabase.from('subjects').select('id, code, name, color, icon_name').order('code'),
    fetchActiveQuestionSubjects(supabase),
  ])

  if (error) {
    console.error('[GET /api/subjects]', error)
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }

  const activeIdsBySubject = groupQuestionIdsBySubject(questionSubjects)

  // Count only active questions per subject
  const subjects: SubjectWithCount[] = (data ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    color: s.color,
    icon_name: s.icon_name,
    active_question_count: (activeIdsBySubject.get(s.id) ?? []).length,
  }))

  return NextResponse.json({ subjects })
}
