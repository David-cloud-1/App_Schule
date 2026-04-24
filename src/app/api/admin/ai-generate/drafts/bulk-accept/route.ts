import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../../_lib/auth'

const BulkAcceptSchema = z.object({
  draft_ids: z.array(z.string().uuid()).min(1).max(200),
  subject_code: z.enum(['BGP', 'KSK', 'STG', 'LOP', 'PUG']).optional(),
  difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON' }, { status: 400 })
  }

  const parsed = BulkAcceptSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Daten', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { draft_ids, subject_code, difficulty } = parsed.data

  // Fetch all drafts
  const { data: drafts, error: fetchErr } = await supabase
    .from('questions_draft')
    .select('*')
    .in('id', draft_ids)

  if (fetchErr || !drafts) {
    return NextResponse.json({ error: 'Entwürfe konnten nicht geladen werden.' }, { status: 500 })
  }

  // Apply overrides if provided
  const toProcess = drafts.map((d) => ({
    ...d,
    subject_code: subject_code ?? d.subject_code,
    difficulty: difficulty ?? d.difficulty,
  }))

  const skipped: string[] = []
  const accepted: string[] = []
  const failed: string[] = []

  // Resolve subject ids upfront to avoid N+1
  const subjectCodes = [...new Set(toProcess.map((d) => d.subject_code).filter(Boolean))]
  const subjectMap: Record<string, string> = {}

  for (const code of subjectCodes) {
    const { data: sub } = await supabase.from('subjects').select('id').eq('code', code).single()
    if (sub) subjectMap[code] = sub.id
  }

  for (const draft of toProcess) {
    if (draft.status === 'review_required') {
      skipped.push(draft.id)
      continue
    }
    if (draft.status === 'accepted' || draft.status === 'rejected') {
      skipped.push(draft.id)
      continue
    }
    if (!draft.subject_code || !draft.difficulty) {
      skipped.push(draft.id)
      continue
    }

    const subjectId = subjectMap[draft.subject_code]
    if (!subjectId) {
      failed.push(draft.id)
      continue
    }

    const { data: question, error: qErr } = await supabase
      .from('questions')
      .insert({
        question_text: draft.question_text,
        difficulty: draft.difficulty,
        explanation: draft.explanation ?? null,
        is_active: true,
        class_level: (draft.class_level as number | null) ?? null,
      })
      .select('id')
      .single()

    if (qErr || !question) {
      failed.push(draft.id)
      continue
    }

    const options = draft.options as string[]
    const answerRows = options.map((text: string, idx: number) => ({
      question_id: question.id,
      option_text: text,
      is_correct: idx === draft.correct_index,
      display_order: idx + 1,
    }))

    const { error: aErr } = await supabase.from('answer_options').insert(answerRows)
    if (aErr) {
      await supabase.from('questions').delete().eq('id', question.id)
      failed.push(draft.id)
      continue
    }

    await supabase.from('question_subjects').insert({
      question_id: question.id,
      subject_id: subjectId,
    })

    await supabase.from('questions_draft').update({ status: 'accepted' }).eq('id', draft.id)
    accepted.push(draft.id)
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'draft.bulk_accept',
    object_type: 'questions_draft',
    details: { accepted: accepted.length, skipped: skipped.length, failed: failed.length },
  })

  return NextResponse.json({ accepted: accepted.length, skipped: skipped.length, failed: failed.length })
}
