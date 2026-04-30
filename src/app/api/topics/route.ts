import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subjectId = request.nextUrl.searchParams.get('subject_id')
  if (!subjectId) {
    return NextResponse.json({ error: 'subject_id is required' }, { status: 400 })
  }

  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, name')
    .eq('subject_id', subjectId)
    .order('name')
    .limit(100)

  if (error) {
    console.error('[GET /api/topics]', error)
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }

  return NextResponse.json({ topics: topics ?? [] })
}
