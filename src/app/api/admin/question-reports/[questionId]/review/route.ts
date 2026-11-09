import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { assertCanAdminQuestion, requireContentAdmin } from '../../../_lib/auth'
import { attachAnswerKey } from '@/lib/answer-key'

/**
 * Volle Frage für den Prüf-Dialog der Meldungs-Inbox (PROJ-82): alles, was das
 * Fragenformular zum Bearbeiten braucht (Antworten mit Lösung, Fächer, Thema,
 * Zählnummer für den Konflikt-Schutz). Gleiche Rechte wie das Bearbeiten selbst.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { questionId } = await params
  if (!z.string().uuid().safeParse(questionId).success) {
    return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
  }

  const forbidden = await assertCanAdminQuestion(auth, questionId)
  if (forbidden) return forbidden

  const { data, error } = await supabase
    .from('questions')
    .select(
      `id, question_text, type, sample_answer, explanation, difficulty, class_level, topic_id,
       is_active, assessment_only, is_private, owner_id, version_number,
       answer_options ( id, option_text, display_order ),
       question_subjects ( subjects ( id, code, name ) )`
    )
    .eq('id', questionId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    console.error('[api/admin/question-reports/review]', error)
    return NextResponse.json({ error: 'Das hat nicht geklappt. Bitte versuche es erneut.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Diese Frage gibt es nicht mehr.' }, { status: 404 })

  const [withKey] = await attachAnswerKey([data])
  const answer_options = [...(withKey.answer_options ?? [])].sort(
    (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
  )
  return NextResponse.json({ question: { ...withKey, answer_options } })
}
