import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

const QuerySchema = z.object({
  subject:    z.string().optional(),
  difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
  limit:      z.coerce.number().int().min(1).max(50).default(10),
  offset:     z.coerce.number().int().min(0).default(0),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Verify authenticated session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse + validate query params
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = QuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { subject, difficulty, limit, offset } = parsed.data

  // Resolve subject filter to question IDs at DB level (fixes BUG-M-01:
  // previously .range() was applied before in-memory subject filter, causing
  // wrong pagination counts when subject + limit/offset were combined)
  let filteredIds: string[] | null = null
  if (subject) {
    const code = subject.toUpperCase()

    const { data: subjectRow } = await supabase
      .from('subjects')
      .select('id')
      .eq('code', code)
      .single()

    if (!subjectRow) {
      return NextResponse.json({ questions: [], total: 0 })
    }

    const { data: links } = await supabase
      .from('question_subjects')
      .select('question_id')
      .eq('subject_id', subjectRow.id)

    filteredIds = (links ?? []).map((l) => l.question_id)
    if (filteredIds.length === 0) {
      return NextResponse.json({ questions: [], total: 0 })
    }
  }

  // Build main query — .range() applied AFTER all filters are resolved
  let query = supabase
    .from('questions')
    .select(`
      id,
      question_text,
      explanation,
      difficulty,
      answer_options ( id, option_text, is_correct, display_order ),
      question_subjects ( subjects ( id, code ) )
    `)
    .eq('is_active', true)
    .order('created_at')

  if (filteredIds) {
    query = query.in('id', filteredIds)
  }
  if (difficulty) {
    query = query.eq('difficulty', difficulty)
  }

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('[GET /api/questions]', error)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  // Sort answer_options by display_order
  const questions = (data ?? []).map((q) => ({
    ...q,
    answer_options: [...(q.answer_options ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    ),
  }))

  return NextResponse.json({ questions, total: questions.length })
}
