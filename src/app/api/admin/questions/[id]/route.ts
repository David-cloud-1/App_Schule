import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'

const AnswerSchema = z.object({
  text: z.string().min(1).max(500),
  is_correct: z.boolean(),
})

const UpdateSchema = z
  .object({
    question_text: z.string().min(1).max(1000).optional(),
    difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
    explanation: z.string().max(2000).nullable().optional(),
    answers: z.array(AnswerSchema).length(4).optional(),
    subject_ids: z.array(z.string().uuid()).min(1).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: 'No fields provided',
  })

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const payload = parsed.data

  // Validate correct-answer constraint if answers are provided
  if (payload.answers) {
    const correctCount = payload.answers.filter((a) => a.is_correct).length
    if (correctCount !== 1) {
      return NextResponse.json(
        { error: 'Es muss genau eine richtige Antwort geben.' },
        { status: 400 }
      )
    }
  }

  // Update question fields
  const questionUpdate: Record<string, unknown> = {}
  if (payload.question_text !== undefined) questionUpdate.question_text = payload.question_text
  if (payload.difficulty !== undefined) questionUpdate.difficulty = payload.difficulty
  if (payload.explanation !== undefined) questionUpdate.explanation = payload.explanation
  if (payload.is_active !== undefined) questionUpdate.is_active = payload.is_active

  if (Object.keys(questionUpdate).length > 0) {
    const { error } = await supabase.from('questions').update(questionUpdate).eq('id', id)
    if (error) {
      console.error('[PATCH question]', error)
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
    }
  }

  // Replace answer_options if provided
  if (payload.answers) {
    const { error: delErr } = await supabase.from('answer_options').delete().eq('question_id', id)
    if (delErr) {
      console.error('[PATCH answers delete]', delErr)
      return NextResponse.json({ error: 'Failed to update answers' }, { status: 500 })
    }

    const answerRows = payload.answers.map((a, idx) => ({
      question_id: id,
      option_text: a.text,
      is_correct: a.is_correct,
      display_order: idx + 1,
    }))
    const { error: insErr } = await supabase.from('answer_options').insert(answerRows)
    if (insErr) {
      console.error('[PATCH answers insert]', insErr)
      return NextResponse.json({ error: 'Failed to update answers' }, { status: 500 })
    }
  }

  // Replace subject links if provided
  if (payload.subject_ids) {
    const { error: delErr } = await supabase
      .from('question_subjects')
      .delete()
      .eq('question_id', id)
    if (delErr) {
      console.error('[PATCH subjects delete]', delErr)
      return NextResponse.json({ error: 'Failed to update subjects' }, { status: 500 })
    }

    const linkRows = payload.subject_ids.map((sid) => ({
      question_id: id,
      subject_id: sid,
    }))
    const { error: insErr } = await supabase.from('question_subjects').insert(linkRows)
    if (insErr) {
      console.error('[PATCH subjects insert]', insErr)
      return NextResponse.json({ error: 'Failed to update subjects' }, { status: 500 })
    }
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type:
      payload.is_active !== undefined && Object.keys(payload).length === 1
        ? payload.is_active
          ? 'question.activate'
          : 'question.deactivate'
        : 'question.update',
    object_type: 'question',
    object_id: id,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // If the question appears in quiz history, soft-delete to preserve learner records
  const { count } = await supabase
    .from('quiz_answers')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', id)

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('questions')
      .update({ is_active: false })
      .eq('id', id)
    if (error) {
      console.error('[DELETE question soft]', error)
      return NextResponse.json({ error: 'Failed to deactivate question' }, { status: 500 })
    }
    await writeAuditLog(supabase, {
      admin_id: user.id,
      action_type: 'question.deactivate',
      object_type: 'question',
      object_id: id,
    })
    return NextResponse.json({ ok: true, softDeleted: true })
  }

  // No quiz history — hard delete
  await supabase.from('answer_options').delete().eq('question_id', id)
  await supabase.from('question_subjects').delete().eq('question_id', id)

  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) {
    console.error('[DELETE question]', error)
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'question.delete',
    object_type: 'question',
    object_id: id,
  })

  return NextResponse.json({ ok: true })
}
