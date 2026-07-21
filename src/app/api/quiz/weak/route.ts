import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { fetchAllUserAnswers } from '@/lib/quiz-answers'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Minimum number of attempts before a question is considered "weak". */
const MIN_ATTEMPTS = 1

/** Error rate above which a question is considered weak (exclusive). */
const ERROR_THRESHOLD = 0.5

/**
 * Aggregates quiz_answers for the given user and returns weak question IDs,
 * sorted by error rate descending.
 */
function computeWeakIds(
  answers: { question_id: string; is_correct: boolean }[],
): string[] {
  const stats = new Map<string, { total: number; wrong: number }>()
  for (const { question_id, is_correct } of answers) {
    const s = stats.get(question_id) ?? { total: 0, wrong: 0 }
    s.total++
    if (!is_correct) s.wrong++
    stats.set(question_id, s)
  }

  return [...stats.entries()]
    .filter(([, { total, wrong }]) => total >= MIN_ATTEMPTS && wrong / total > ERROR_THRESHOLD)
    .sort(([, a], [, b]) => b.wrong / b.total - a.wrong / a.total)
    .map(([id]) => id)
}

/**
 * GET /api/quiz/weak
 *
 * Returns questions where the authenticated user has a >50% error rate
 * and at least MIN_ATTEMPTS attempt(s). Used by client components to show weak
 * question counts and, if needed, the full question list.
 *
 * Query params:
 *   subject_id   – optional UUID, filters to one subject
 *   count_only   – "true" returns { count } only (no question data)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subject_id')
  const countOnly = searchParams.get('count_only') === 'true'

  if (subjectId && !UUID_RE.test(subjectId)) {
    return NextResponse.json({ error: 'Invalid subject_id' }, { status: 400 })
  }

  // ── Aggregate all answers for this user ───────────────────────────────────
  const { rows: answers, error: answersError } = await fetchAllUserAnswers(supabase, user.id)

  if (answersError) {
    return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 })
  }

  const allWeakIds = computeWeakIds(answers)

  if (allWeakIds.length === 0) {
    return NextResponse.json({ questions: [], count: 0 })
  }

  // ── count_only mode: fast path ────────────────────────────────────────────
  if (countOnly) {
    if (!subjectId) {
      return NextResponse.json({ count: allWeakIds.length })
    }

    // Count how many of the weak IDs belong to this subject
    const { data: subjectMatches, error: subjectError } = await supabase
      .from('question_subjects')
      .select('question_id')
      .eq('subject_id', subjectId)
      .in('question_id', allWeakIds)

    if (subjectError) {
      console.error('[GET /api/quiz/weak] subject count:', subjectError)
      return NextResponse.json({ error: 'Failed to count subject questions' }, { status: 500 })
    }

    return NextResponse.json({ count: subjectMatches?.length ?? 0 })
  }

  // ── Full question data ────────────────────────────────────────────────────
  // Limit to 50 worst questions to keep the query efficient
  const weakIds = allWeakIds.slice(0, 50)

  const selectCols = subjectId
    ? 'id, question_text, explanation, difficulty, answer_options (id, option_text, is_correct, display_order), question_subjects!inner(subject_id)'
    : 'id, question_text, explanation, difficulty, answer_options (id, option_text, is_correct, display_order)'

  let questionsQuery = supabase
    .from('questions')
    .select(selectCols)
    .eq('is_active', true)
    .in('id', weakIds)

  if (subjectId) {
    questionsQuery = questionsQuery.eq('question_subjects.subject_id', subjectId)
  }

  const { data: questions, error: questionsError } = await questionsQuery

  if (questionsError) {
    console.error('[GET /api/quiz/weak] questions fetch:', questionsError)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  return NextResponse.json({
    questions: questions ?? [],
    count: questions?.length ?? 0,
  })
}
