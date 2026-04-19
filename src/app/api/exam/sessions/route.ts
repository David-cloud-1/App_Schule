import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

const PART_CONFIG = {
  1: { subjects: ['STG', 'LOP'], questionCount: 20, durationMinutes: 90 },
  2: { subjects: ['KSK'], questionCount: 15, durationMinutes: 90 },
  3: { subjects: ['BGP'], questionCount: 15, durationMinutes: 45 },
} as const

const StartExamSchema = z.object({
  parts: z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])).min(1),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = StartExamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { parts } = parsed.data
  const allQuestions: Record<number, unknown[]> = {}

  for (const part of parts) {
    const config = PART_CONFIG[part]

    // Check if there's an active admin exam set for this part
    const { data: activeSet } = await supabase
      .from('exam_question_sets')
      .select('question_ids')
      .eq('part', part)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let questions: unknown[] = []

    if (activeSet?.question_ids?.length) {
      const { data } = await supabase
        .from('questions')
        .select('id, question_text, type, difficulty, explanation, sample_answer, answer_options(id, option_text, is_correct, display_order)')
        .in('id', activeSet.question_ids)
        .eq('is_active', true)
      questions = data ?? []
    } else {
      // Get subject IDs for this part
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .in('code', config.subjects)

      if (!subjects?.length) {
        allQuestions[part] = []
        continue
      }

      const subjectIds = subjects.map((s: { id: string }) => s.id)

      const { data: links } = await supabase
        .from('question_subjects')
        .select('question_id')
        .in('subject_id', subjectIds)

      const questionIds = (links ?? []).map((l: { question_id: string }) => l.question_id)

      if (!questionIds.length) {
        allQuestions[part] = []
        continue
      }

      // For part 1: ~70% open, ~30% MC
      if (part === 1) {
        const openCount = Math.round(config.questionCount * 0.7)
        const mcCount = config.questionCount - openCount

        const [openResult, mcResult] = await Promise.all([
          supabase
            .from('questions')
            .select('id, question_text, type, difficulty, explanation, sample_answer, answer_options(id, option_text, is_correct, display_order)')
            .in('id', questionIds)
            .eq('is_active', true)
            .eq('type', 'open')
            .limit(openCount),
          supabase
            .from('questions')
            .select('id, question_text, type, difficulty, explanation, sample_answer, answer_options(id, option_text, is_correct, display_order)')
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
          .select('id, question_text, type, difficulty, explanation, sample_answer, answer_options(id, option_text, is_correct, display_order)')
          .in('id', questionIds)
          .eq('is_active', true)
          .limit(config.questionCount)

        questions = data ?? []
      }
    }

    allQuestions[part] = questions.map((q) => ({ ...(q as object), part }))
  }

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .insert({
      user_id: user.id,
      parts_selected: parts,
      started_at: new Date().toISOString(),
      status: 'in_progress',
      results_json: { parts: allQuestions },
    })
    .select('id')
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  return NextResponse.json({ sessionId: session.id, parts: allQuestions })
}
