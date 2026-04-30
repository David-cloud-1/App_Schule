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

  const classLevelParam = request.nextUrl.searchParams.get('class_level')
  const classLevel = ['10', '11', '12'].includes(classLevelParam ?? '') ? Number(classLevelParam) : null

  // Fetch all topics for this subject
  const { data: allTopics, error } = await supabase
    .from('topics')
    .select('id, name')
    .eq('subject_id', subjectId)
    .order('name')
    .limit(100)

  if (error) {
    console.error('[GET /api/topics]', error)
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }

  if (!allTopics || allTopics.length === 0) {
    return NextResponse.json({ topics: [] })
  }

  // If a specific class level is selected, only return topics that have at least
  // one active question for that class level (or with no class level assigned).
  // This prevents students from selecting a topic+class combination with no questions.
  if (classLevel) {
    const topicIds = allTopics.map((t) => t.id)
    const { data: questionRows } = await supabase
      .from('questions')
      .select('topic_id')
      .eq('is_active', true)
      .in('topic_id', topicIds)
      .or(`class_level.eq.${classLevel},class_level.is.null`)

    const validIds = new Set(
      (questionRows ?? []).map((q) => q.topic_id).filter(Boolean)
    )
    return NextResponse.json({ topics: allTopics.filter((t) => validIds.has(t.id)) })
  }

  return NextResponse.json({ topics: allTopics })
}
