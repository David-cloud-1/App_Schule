import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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

  // Fetch subjects with active question counts via a join
  const { data, error } = await supabase
    .from('subjects')
    .select(`
      id,
      code,
      name,
      color,
      icon_name,
      question_subjects (
        question_id,
        questions!inner ( id, is_active )
      )
    `)
    .order('code')

  if (error) {
    console.error('[GET /api/subjects]', error)
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }

  // Count only active questions per subject
  const subjects: SubjectWithCount[] = (data ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    color: s.color,
    icon_name: s.icon_name,
    active_question_count: (s.question_subjects as unknown as { questions: { is_active: boolean } }[])
      .filter((qs) => qs.questions?.is_active === true).length,
  }))

  return NextResponse.json({ subjects })
}
