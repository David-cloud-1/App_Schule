import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { fetchAllUserAnswers } from '@/lib/quiz-answers'
import { computeWeakQuestionIds } from '@/lib/weak-questions'
import { attachAnswerKey, getLockedQuestionIds } from '@/lib/answer-key'
import { getDepartmentOfUser, getDepartmentSubjectIds } from '@/lib/departments-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/quiz/weak
 *
 * Returns the authenticated user's open gaps — questions answered wrong that
 * haven't been answered correctly twice in a row since. Used by client components to show weak
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

  const allWeakIds = computeWeakQuestionIds(answers)

  if (allWeakIds.length === 0) {
    return NextResponse.json({ questions: [], count: 0 })
  }

  // Nur Lücken aus Fächern des eigenen Bereichs — auch wenn jemand früher in
  // einem anderen Bereich war (PROJ-23). Fach eines anderen Bereichs → leer.
  const department = await getDepartmentOfUser(supabase, user.id)
  const departmentSubjectIds = department ? await getDepartmentSubjectIds(department.id) : []
  const subjectFilter = subjectId
    ? departmentSubjectIds.includes(subjectId) ? [subjectId] : []
    : departmentSubjectIds
  if (subjectFilter.length === 0) {
    return NextResponse.json(countOnly ? { count: 0 } : { questions: [], count: 0 })
  }

  // ── count_only mode: fast path ────────────────────────────────────────────
  if (countOnly) {
    // Count how many of the weak IDs belong to the subject(s)
    const { data: subjectMatches, error: subjectError } = await supabase
      .from('question_subjects')
      .select('question_id')
      .in('subject_id', subjectFilter)
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

  // No is_correct here — students can't SELECT it directly any more (PROJ-21);
  // it's merged in server-side below.
  const selectCols = 'id, question_text, explanation, difficulty, answer_options (id, option_text, display_order), question_subjects!inner(subject_id)'

  const questionsQuery = supabase
    .from('questions')
    .select(selectCols)
    .eq('is_active', true)
    .in('id', weakIds)
    .in('question_subjects.subject_id', subjectFilter)

  const { data: questions, error: questionsError } = await questionsQuery

  if (questionsError) {
    console.error('[GET /api/quiz/weak] questions fetch:', questionsError)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  const locked = await getLockedQuestionIds()
  const withKey = await attachAnswerKey(
    ((questions ?? []) as unknown as { id: string; answer_options: { id: string }[] }[]).filter((q) => !locked.has(q.id)),
  )

  return NextResponse.json({
    questions: withKey,
    count: withKey.length,
  })
}
