import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, writeAuditLog } from '../../../../_lib/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await params

  const { data: draft, error: fetchErr } = await supabase
    .from('questions_draft')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !draft) {
    return NextResponse.json({ error: 'Entwurf nicht gefunden.' }, { status: 404 })
  }

  if (draft.status === 'review_required') {
    return NextResponse.json(
      { error: 'Dieser Entwurf erfordert manuelle Prüfung. Bitte zuerst bearbeiten.' },
      { status: 409 }
    )
  }

  if (draft.status === 'accepted') {
    return NextResponse.json({ error: 'Entwurf wurde bereits akzeptiert.' }, { status: 409 })
  }

  if (!draft.subject_code) {
    return NextResponse.json(
      { error: 'Bitte Fach (BGP/KSK/STG/LOP/PUG) vor dem Akzeptieren zuweisen.' },
      { status: 422 }
    )
  }

  if (!draft.difficulty) {
    return NextResponse.json(
      { error: 'Bitte Schwierigkeitsgrad vor dem Akzeptieren zuweisen.' },
      { status: 422 }
    )
  }

  // 1. Find or create subject
  const { data: subject } = await supabase
    .from('subjects')
    .select('id')
    .eq('code', draft.subject_code)
    .single()

  if (!subject) {
    return NextResponse.json(
      { error: `Fach "${draft.subject_code}" nicht in der Datenbank gefunden.` },
      { status: 422 }
    )
  }

  // 2. Insert into questions
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
    console.error('[accept draft] question insert', qErr)
    return NextResponse.json({ error: 'Frage konnte nicht erstellt werden.' }, { status: 500 })
  }

  // 3. Insert answer options
  const options = draft.options as string[]
  const answerRows = options.map((text: string, idx: number) => ({
    question_id: question.id,
    option_text: text,
    is_correct: idx === draft.correct_index,
    display_order: idx + 1,
  }))

  const { error: aErr } = await supabase.from('answer_options').insert(answerRows)
  if (aErr) {
    console.error('[accept draft] answer insert', aErr)
    await supabase.from('questions').delete().eq('id', question.id)
    return NextResponse.json({ error: 'Antwortoptionen konnten nicht erstellt werden.' }, { status: 500 })
  }

  // 4. Link subject
  await supabase.from('question_subjects').insert({
    question_id: question.id,
    subject_id: subject.id,
  })

  // 5. Mark draft as accepted
  await supabase.from('questions_draft').update({ status: 'accepted' }).eq('id', id)

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'draft.accept',
    object_type: 'questions_draft',
    object_id: id,
    details: { question_id: question.id },
  })

  return NextResponse.json({ questionId: question.id }, { status: 201 })
}
