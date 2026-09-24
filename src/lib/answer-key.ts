import { createServiceClient } from '@/lib/supabase-server'

// Students no longer have SELECT on answer_options.is_correct (PROJ-21,
// BUG-1): otherwise anyone logged in could look up the answer to any
// question straight from the browser with the public anon key — fatal for
// graded assessments. Every server path that legitimately needs the answer
// key fetches it here, via the service client, and merges it into questions
// that were loaded with the user's own (RLS-bound) client.

export type AnswerKey = Map<
  string,
  { explanation: string | null; sampleAnswer: string | null; options: Map<string, boolean> }
>

// Ids go into the query string of a PostgREST GET — chunk them so the admin
// export (up to 5000 questions) doesn't blow past URL length limits.
const CHUNK_SIZE = 200

export async function fetchAnswerKey(questionIds: string[]): Promise<AnswerKey> {
  const key: AnswerKey = new Map()
  const ids = [...new Set(questionIds)]
  if (ids.length === 0) return key

  const service = createServiceClient()
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) chunks.push(ids.slice(i, i + CHUNK_SIZE))

  const results = await Promise.all(
    chunks.map((chunk) =>
      service
        .from('questions')
        .select('id, explanation, sample_answer, answer_options(id, is_correct)')
        .in('id', chunk),
    ),
  )

  for (const { data, error } of results) {
    if (error) throw new Error(`fetchAnswerKey: ${error.message}`)
    for (const q of data ?? []) {
      const options = new Map<string, boolean>()
      for (const o of (q.answer_options ?? []) as { id: string; is_correct: boolean }[]) options.set(o.id, o.is_correct)
      key.set(q.id, { explanation: q.explanation, sampleAnswer: q.sample_answer, options })
    }
  }
  return key
}

/**
 * Server-side grading of answers a client reports (PROJ-19 BUG-2): the
 * client's own is_correct is ignored. Each question counts once (first
 * answer wins), so repeating a known-correct answer can't farm coins/XP.
 */
export async function verifyAnswers<T extends { question_id: string; selected_option_id: string }>(
  answers: T[],
): Promise<(T & { is_correct: boolean })[]> {
  const seen = new Set<string>()
  const unique = answers.filter((a) => {
    if (seen.has(a.question_id)) return false
    seen.add(a.question_id)
    return true
  })
  const key = await fetchAnswerKey(unique.map((a) => a.question_id))
  return unique.map((a) => ({
    ...a,
    is_correct: key.get(a.question_id)?.options.get(a.selected_option_id) === true,
  }))
}

type WithOptions = { id: string; answer_options?: { id: string }[] | null }

/** Adds `is_correct` to every answer option — for practice flows that show instant feedback. */
export async function attachAnswerKey<T extends WithOptions>(
  questions: T[],
): Promise<(T & { answer_options: (NonNullable<T['answer_options']>[number] & { is_correct: boolean })[] })[]> {
  const key = await fetchAnswerKey(questions.map((q) => q.id))
  return questions.map((q) => ({
    ...q,
    answer_options: (q.answer_options ?? []).map((o) => ({
      ...o,
      is_correct: key.get(q.id)?.options.get(o.id) ?? false,
    })),
  }))
}

/**
 * Question ids of graded assessments that are currently being written —
 * open for joining, or with at least one attempt still in progress. Practice
 * flows leave these out so nobody can look up an exam question's answer in
 * the quiz while the exam is running.
 */
export async function getLockedQuestionIds(): Promise<Set<string>> {
  const service = createServiceClient()
  const [{ data: open }, { data: running }] = await Promise.all([
    service.from('graded_assessments').select('id, question_ids_snapshot').eq('status', 'open'),
    service.from('exam_sessions').select('assessment_id').eq('status', 'in_progress').not('assessment_id', 'is', null),
  ])

  const locked = new Set<string>()
  const seen = new Set<string>()
  for (const a of open ?? []) {
    seen.add(a.id)
    for (const qid of a.question_ids_snapshot ?? []) locked.add(qid)
  }

  const runningIds = [...new Set((running ?? []).map((s) => s.assessment_id as string))].filter((id) => !seen.has(id))
  if (runningIds.length > 0) {
    const { data: extra } = await service
      .from('graded_assessments')
      .select('question_ids_snapshot')
      .in('id', runningIds)
    for (const a of extra ?? []) for (const qid of a.question_ids_snapshot ?? []) locked.add(qid)
  }
  return locked
}
