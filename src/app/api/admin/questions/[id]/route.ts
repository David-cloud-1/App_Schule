import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireContentAdmin, writeAuditLog, assertCanAdminQuestion } from '../../_lib/auth'
import { attachAnswerKey } from '@/lib/answer-key'
import { checkVersionConflict } from '@/lib/content-history'

/** Ist diese Frage eine private Nachweis-Frage einer Lehrkraft (PROJ-46)? */
async function loadIsPrivate(
  supabase: Awaited<ReturnType<typeof requireContentAdmin>>['supabase'],
  questionId: string
): Promise<boolean> {
  const { data } = await supabase!.from('questions').select('is_private').eq('id', questionId).maybeSingle()
  return (data as { is_private?: boolean } | null)?.is_private ?? false
}

const AnswerSchema = z.object({
  text: z.string().min(1).max(500),
  is_correct: z.boolean(),
})

const UpdateSchema = z
  .object({
    question_text: z.string().min(1).max(1000).optional(),
    difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
    explanation: z.string().max(2000).nullable().optional(),
    type: z.enum(['multiple_choice', 'open']).optional(),
    sample_answer: z.string().max(2000).nullable().optional(),
    answers: z.array(AnswerSchema).length(5).optional(),
    subject_ids: z.array(z.string().uuid()).min(1).optional(),
    is_active: z.boolean().optional(),
    // PROJ-38: false = für den Übungsbetrieb freigeben
    assessment_only: z.boolean().optional(),
    class_level: z.union([z.literal(10), z.literal(11), z.literal(12), z.null()]).optional(),
    topic_id: z.string().uuid().nullable().optional(),
    // Zählnummer beim Laden (PROJ-47) — erkennt, wenn jemand anderes
    // zwischenzeitlich schon gespeichert hat, statt diese Änderung
    // stillschweigend zu überschreiben.
    expected_version: z.number().int().min(1).optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: 'No fields provided',
  })

/**
 * Volle Angaben einer Pool-Frage (Text, Optionen, Lösung) — für den
 * „Frage bearbeiten"-Dialog im Nachweis-Entwurf (PROJ-49). Nur Admins, die
 * den Fachbereich der Frage verwalten dürfen; gleiche Antwortform wie
 * `/api/admin/assessments/questions/[id]` (private Fragen), damit beide
 * Fälle denselben Dialog nutzen können.
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const forbidden = await assertCanAdminQuestion(auth, id)
  if (forbidden) return forbidden

  const { data } = await supabase
    .from('questions')
    .select('id, question_text, difficulty, explanation, class_level, answer_options(id, option_text, display_order)')
    .eq('id', id)
    .maybeSingle()
  if (!data) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const [withKey] = await attachAnswerKey([data as { id: string; answer_options: { id: string; option_text: string; display_order: number }[] }])
  const options = [...withKey.answer_options].sort((a, b) => a.display_order - b.display_order)

  return NextResponse.json({
    questionText: data.question_text,
    difficulty: data.difficulty,
    explanation: data.explanation,
    classLevel: data.class_level,
    answers: options.map((o) => ({ text: o.option_text, is_correct: o.is_correct })),
  })
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const forbidden = await assertCanAdminQuestion(auth, id)
  if (forbidden) return forbidden

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

  const conflict = await checkVersionConflict(supabase, 'question', id, payload.expected_version)
  if (conflict) {
    return NextResponse.json(
      {
        error: `Diese Frage wurde gerade von ${conflict.changedByName ?? 'jemand anderem'} geändert.`,
        conflict: true,
        currentVersion: conflict.currentVersion,
      },
      { status: 409 }
    )
  }

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

  // PROJ-46 (E6, BUG-1): private Nachweis-Fragen lassen sich nie für den
  // Übungsbetrieb freigeben — klare Meldung statt eines rohen Constraint-Fehlers.
  if (payload.assessment_only === false && (await loadIsPrivate(supabase, id))) {
    return NextResponse.json(
      { error: 'Private Nachweis-Fragen können nicht für den Übungsbetrieb freigegeben werden.' },
      { status: 400 }
    )
  }

  // Update question fields
  const questionUpdate: Record<string, unknown> = {}
  if (payload.question_text !== undefined) questionUpdate.question_text = payload.question_text
  if (payload.difficulty !== undefined) questionUpdate.difficulty = payload.difficulty
  if (payload.explanation !== undefined) questionUpdate.explanation = payload.explanation
  if (payload.type !== undefined) questionUpdate.type = payload.type
  if (payload.sample_answer !== undefined) questionUpdate.sample_answer = payload.sample_answer
  if (payload.is_active !== undefined) questionUpdate.is_active = payload.is_active
  if (payload.assessment_only !== undefined) questionUpdate.assessment_only = payload.assessment_only
  if (payload.class_level !== undefined) questionUpdate.class_level = payload.class_level
  if (payload.topic_id !== undefined) questionUpdate.topic_id = payload.topic_id

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
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const forbidden = await assertCanAdminQuestion(auth, id)
  if (forbidden) return forbidden

  // Papierkorb statt endgültigem Löschen (PROJ-47) — die Frage bleibt
  // erhalten (und damit auch bestehende Lern-Statistiken/Snapshots
  // unberührt) und lässt sich aus dem Papierkorb wiederherstellen.
  const { error } = await supabase
    .from('questions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
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
