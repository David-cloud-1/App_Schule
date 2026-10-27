import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../_lib/auth'

/**
 * PROJ-46 (E6): eigene private Nachweis-Fragen bearbeiten und löschen —
 * getrennt von der Fragenverwaltung der Bereichs-Admins (`/api/admin/questions`),
 * die für Lehrkräfte verschlossen bleibt und private Fragen nie zeigt.
 * Nur die Besitzerin (oder der Super-Admin) darf hier etwas ändern, und nur,
 * solange kein **offener** Nachweis die Frage verwendet — ein laufender
 * Nachweis darf sich der Teilnehmerin gegenüber nicht mehr ändern.
 */

const AnswerSchema = z.object({
  text: z.string().min(1).max(500),
  is_correct: z.boolean(),
})

const UpdateSchema = z
  .object({
    question_text: z.string().min(1).max(1000).optional(),
    difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
    explanation: z.string().max(2000).nullable().optional(),
    class_level: z.union([z.literal(10), z.literal(11), z.literal(12), z.null()]).optional(),
    answers: z.array(AnswerSchema).min(2).max(5).optional(),
  })
  .refine((val) => Object.keys(val).length > 0, { message: 'No fields provided' })
  .refine((val) => !val.answers || val.answers.filter((a) => a.is_correct).length === 1, {
    message: 'Es muss genau eine richtige Antwort geben.',
    path: ['answers'],
  })

type QuestionRow = { id: string; is_private: boolean; owner_id: string | null }

async function loadOwnPrivateQuestion(
  supabase: Awaited<ReturnType<typeof requireTeacherOrAdmin>>['supabase'],
  auth: Extract<Awaited<ReturnType<typeof requireTeacherOrAdmin>>, { error: null }>,
  id: string,
): Promise<QuestionRow | null> {
  const { data } = await supabase!.from('questions').select('id, is_private, owner_id').eq('id', id).maybeSingle()
  const question = data as QuestionRow | null
  if (!question || !question.is_private) return null
  if (!auth.isSuperAdmin && question.owner_id !== auth.user.id) return null
  return question
}

/** Wird diese Frage gerade von einem offenen (laufenden) Nachweis verwendet? */
async function isUsedByOpenAssessment(
  supabase: Awaited<ReturnType<typeof requireTeacherOrAdmin>>['supabase'],
  questionId: string,
): Promise<boolean> {
  const { data } = await supabase!
    .from('graded_assessments')
    .select('id')
    .eq('status', 'open')
    .contains('question_ids_snapshot', [questionId])
    .limit(1)
  return (data ?? []).length > 0
}

/** Volle Angaben einer eigenen privaten Frage — für den Bearbeiten-Dialog (Text, Optionen, Erklärung). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const question = await loadOwnPrivateQuestion(supabase, auth, id)
  if (!question) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { data: full } = await supabase!
    .from('questions')
    .select('question_text, difficulty, explanation, class_level, answer_options(id, option_text, is_correct, display_order)')
    .eq('id', id)
    .maybeSingle()
  if (!full) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const options = [...((full.answer_options as { id: string; option_text: string; is_correct: boolean; display_order: number }[]) ?? [])]
    .sort((a, b) => a.display_order - b.display_order)

  return NextResponse.json({
    questionText: full.question_text,
    difficulty: full.difficulty,
    explanation: full.explanation,
    classLevel: full.class_level,
    answers: options.map((o) => ({ text: o.option_text, is_correct: o.is_correct })),
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const question = await loadOwnPrivateQuestion(supabase, auth, id)
  if (!question) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }
  const payload = parsed.data

  if (await isUsedByOpenAssessment(supabase, id)) {
    return NextResponse.json({ error: 'Diese Frage wird gerade von einem offenen Nachweis verwendet und kann erst danach bearbeitet werden.' }, { status: 409 })
  }

  const questionUpdate: Record<string, unknown> = {}
  if (payload.question_text !== undefined) questionUpdate.question_text = payload.question_text
  if (payload.difficulty !== undefined) questionUpdate.difficulty = payload.difficulty
  if (payload.explanation !== undefined) questionUpdate.explanation = payload.explanation
  if (payload.class_level !== undefined) questionUpdate.class_level = payload.class_level

  if (Object.keys(questionUpdate).length > 0) {
    const { error } = await supabase!.from('questions').update(questionUpdate).eq('id', id)
    if (error) {
      console.error('[PATCH assessments/questions/[id]]', error)
      return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
    }
  }

  if (payload.answers) {
    const { error: delErr } = await supabase!.from('answer_options').delete().eq('question_id', id)
    if (delErr) {
      console.error('[PATCH assessments/questions/[id]] answers delete', delErr)
      return NextResponse.json({ error: 'Antwortoptionen konnten nicht gespeichert werden.' }, { status: 500 })
    }
    const { error: insErr } = await supabase!.from('answer_options').insert(
      payload.answers.map((a, i) => ({
        question_id: id,
        option_text: a.text,
        is_correct: a.is_correct,
        display_order: i + 1,
      })),
    )
    if (insErr) {
      console.error('[PATCH assessments/questions/[id]] answers insert', insErr)
      return NextResponse.json({ error: 'Antwortoptionen konnten nicht gespeichert werden.' }, { status: 500 })
    }
  }

  await writeAuditLog(supabase!, {
    admin_id: user.id,
    action_type: 'question.update',
    object_type: 'question',
    object_id: id,
    details: { private: true },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const question = await loadOwnPrivateQuestion(supabase, auth, id)
  if (!question) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  if (await isUsedByOpenAssessment(supabase, id)) {
    return NextResponse.json({ error: 'Diese Frage wird gerade von einem offenen Nachweis verwendet und kann erst danach gelöscht werden.' }, { status: 409 })
  }

  // answer_options und question_subjects hängen per ON DELETE CASCADE daran.
  const { error } = await supabase!.from('questions').delete().eq('id', id)
  if (error) {
    console.error('[DELETE assessments/questions/[id]]', error)
    return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 500 })
  }

  await writeAuditLog(supabase!, {
    admin_id: user.id,
    action_type: 'question.delete',
    object_type: 'question',
    object_id: id,
    details: { private: true },
  })

  return NextResponse.json({ success: true })
}
