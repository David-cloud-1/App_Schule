import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { attachAnswerKey, getLockedQuestionIds } from '@/lib/answer-key'
import { getDepartmentForUser } from '@/lib/departments'
import { fetchExamParts, findExamPart } from '@/lib/exam-parts'

// No is_correct: students can't SELECT it directly any more (PROJ-21). A
// practice exam still needs it in the stored session for grading, so it's
// merged in server-side by withAnswerKey() below.
const QUESTION_COLS = 'id, question_text, type, difficulty, explanation, sample_answer, answer_options(id, option_text, display_order)'

/**
 * Drops questions of a graded assessment that's being written right now
 * (the practice exam shows full solutions right after submit) and merges
 * the answer key into the rest. Mutates the per-part map in place.
 */
async function withAnswerKey(allQuestions: Record<number, unknown[]>) {
  const locked = await getLockedQuestionIds()
  for (const [part, list] of Object.entries(allQuestions)) {
    const filtered = (list as { id: string; answer_options?: { id: string }[] }[]).filter((q) => !locked.has(q.id))
    allQuestions[Number(part)] = await attachAnswerKey(filtered)
  }
}

const StartExamSchema = z.object({
  setIds: z.array(z.string().uuid()).min(1).optional(),
  // Teil-Nummern des Bereichs; welche es gibt, steht in exam_parts (PROJ-22)
  parts: z.array(z.number().int().min(1).max(20)).min(1).optional(),
}).refine((d) => (d.setIds?.length ?? 0) > 0 || (d.parts?.length ?? 0) > 0, {
  message: 'setIds oder parts erforderlich',
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = StartExamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const department = await getDepartmentForUser(supabase, user.id)
  if (!department) {
    return NextResponse.json({ error: 'Fachbereich nicht gefunden' }, { status: 500 })
  }
  let examParts
  try {
    examParts = await fetchExamParts(supabase, department.id)
  } catch (err) {
    console.error('[POST /api/exam/sessions] exam parts:', err)
    return NextResponse.json({ error: 'Prüfungsaufbau konnte nicht geladen werden' }, { status: 500 })
  }

  const allQuestions: Record<number, unknown[]> = {}
  const partDurations: Record<number, number> = {}
  const setNames: Record<number, string> = {}

  // Preferred path: student picked one or more specific active exam sets.
  if (parsed.data.setIds?.length) {
    const { data: sets } = await supabase
      .from('exam_question_sets')
      .select('id, name, part, question_ids, duration_minutes, is_active')
      .in('id', parsed.data.setIds)
      .eq('department_id', department.id)

    const activeSets = (sets ?? []).filter((s) => s.is_active)
    if (!activeSets.length) {
      return NextResponse.json({ error: 'Keine gültige Prüfung ausgewählt.' }, { status: 400 })
    }

    const seenParts = new Set<number>()
    for (const set of activeSets) {
      if (seenParts.has(set.part)) {
        return NextResponse.json({ error: 'Pro Teil kann nur eine Prüfung gewählt werden.' }, { status: 400 })
      }
      seenParts.add(set.part)

      partDurations[set.part] = set.duration_minutes ?? findExamPart(examParts, set.part)?.durationMinutes ?? 0
      setNames[set.part] = set.name

      const { data } = await supabase
        .from('questions')
        .select(QUESTION_COLS)
        .in('id', set.question_ids ?? [])
        .eq('is_active', true)
      allQuestions[set.part] = (data ?? []).map((q) => ({ ...(q as object), part: set.part }))
    }

    await withAnswerKey(allQuestions)
    const selectedParts = Array.from(seenParts).sort()
    const totalDurationMinutes = selectedParts.reduce((sum, p) => sum + (partDurations[p] ?? 0), 0)

    const { data: session, error } = await supabase
      .from('exam_sessions')
      .insert({
        user_id: user.id,
        parts_selected: selectedParts,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        results_json: { durationMinutes: totalDurationMinutes, setNames, parts: allQuestions },
      })
      .select('id')
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }
    return NextResponse.json({ sessionId: session.id, parts: allQuestions })
  }

  // Fallback path: parts-based selection (active set per part or random pool).
  const parts = parsed.data.parts!
  const unknownParts = parts.filter((p) => !findExamPart(examParts, p))
  if (unknownParts.length) {
    return NextResponse.json({ error: `Unbekannter Prüfungsteil: ${unknownParts.join(', ')}` }, { status: 400 })
  }

  for (const part of parts) {
    const config = findExamPart(examParts, part)!

    // Check if there's an active admin exam set for this part
    const { data: activeSet } = await supabase
      .from('exam_question_sets')
      .select('question_ids, duration_minutes')
      .eq('part', part)
      .eq('department_id', department.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    partDurations[part] = activeSet?.duration_minutes ?? config.durationMinutes

    let questions: unknown[] = []

    if (activeSet?.question_ids?.length) {
      const { data } = await supabase
        .from('questions')
        .select(QUESTION_COLS)
        .in('id', activeSet.question_ids)
        .eq('is_active', true)
      questions = data ?? []
    } else {
      const subjectIds = config.subjects.map((s) => s.id)
      if (!subjectIds.length) {
        allQuestions[part] = []
        continue
      }

      const { data: links } = await supabase
        .from('question_subjects')
        .select('question_id')
        .in('subject_id', subjectIds)

      const questionIds = (links ?? []).map((l: { question_id: string }) => l.question_id)

      if (!questionIds.length) {
        allQuestions[part] = []
        continue
      }

      // Teile mit offenem Anteil (Spedition Teil 1: ~70 % offen, ~30 % MC)
      if (config.openQuestionShare > 0) {
        const openCount = Math.round(config.questionCount * config.openQuestionShare)
        const mcCount = config.questionCount - openCount

        const [openResult, mcResult] = await Promise.all([
          supabase
            .from('questions')
            .select(QUESTION_COLS)
            .in('id', questionIds)
            .eq('is_active', true)
            .eq('type', 'open')
            .limit(openCount),
          supabase
            .from('questions')
            .select(QUESTION_COLS)
            .in('id', questionIds)
            .eq('is_active', true)
            .eq('type', 'multiple_choice')
            .limit(mcCount),
        ])

        const combined = [...(openResult.data ?? []), ...(mcResult.data ?? [])]
        questions = combined.sort(() => Math.random() - 0.5)
      } else {
        const { data } = await supabase
          .from('questions')
          .select(QUESTION_COLS)
          .in('id', questionIds)
          .eq('is_active', true)
          .limit(config.questionCount)

        questions = (data ?? []).sort(() => Math.random() - 0.5)
      }
    }

    allQuestions[part] = questions.map((q) => ({ ...(q as object), part }))
  }

  await withAnswerKey(allQuestions)
  const totalDurationMinutes = parts.reduce((sum, p) => sum + (partDurations[p] ?? findExamPart(examParts, p)?.durationMinutes ?? 0), 0)

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .insert({
      user_id: user.id,
      parts_selected: parts,
      started_at: new Date().toISOString(),
      status: 'in_progress',
      results_json: { durationMinutes: totalDurationMinutes, parts: allQuestions },
    })
    .select('id')
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  return NextResponse.json({ sessionId: session.id, parts: allQuestions })
}
