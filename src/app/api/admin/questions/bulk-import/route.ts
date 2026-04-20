import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'

const RowSchema = z.object({
  question_text: z.string().min(1).max(1000),
  antwort_a: z.string().min(1).max(500),
  antwort_b: z.string().min(1).max(500),
  antwort_c: z.string().min(1).max(500),
  antwort_d: z.string().min(1).max(500),
  antwort_e: z.string().min(1).max(500),
  korrekte_antwort: z.enum(['A', 'B', 'C', 'D', 'E']),
  erklaerung: z.string().max(2000).optional().nullable(),
  fach_code: z.string().min(1).max(20),
  schwierigkeit: z.enum(['leicht', 'mittel', 'schwer']),
})

const BodySchema = z.object({
  rows: z.array(RowSchema).min(1).max(500),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Preload subject lookup table
  const { data: subjects, error: subErr } = await supabase.from('subjects').select('id, code')
  if (subErr) {
    console.error('[bulk-import] subject load', subErr)
    return NextResponse.json({ error: 'Failed to load subjects' }, { status: 500 })
  }
  const subjectMap = new Map<string, string>()
  for (const s of subjects ?? []) {
    subjectMap.set((s.code as string).toUpperCase(), s.id as string)
  }

  let imported = 0
  let skipped = 0

  for (const row of parsed.data.rows) {
    const subjectId = subjectMap.get(row.fach_code.toUpperCase())
    if (!subjectId) {
      skipped++
      continue
    }

    const { data: question, error: qErr } = await supabase
      .from('questions')
      .insert({
        question_text: row.question_text,
        difficulty: row.schwierigkeit,
        explanation: row.erklaerung ?? null,
        is_active: true,
      })
      .select('id')
      .single()

    if (qErr || !question) {
      console.error('[bulk-import] question insert', qErr)
      skipped++
      continue
    }

    const letters = ['A', 'B', 'C', 'D', 'E'] as const
    const texts: Record<(typeof letters)[number], string> = {
      A: row.antwort_a,
      B: row.antwort_b,
      C: row.antwort_c,
      D: row.antwort_d,
      E: row.antwort_e,
    }
    const answerRows = letters.map((letter, idx) => ({
      question_id: question.id,
      option_text: texts[letter],
      is_correct: letter === row.korrekte_antwort,
      display_order: idx + 1,
    }))

    const { error: aErr } = await supabase.from('answer_options').insert(answerRows)
    if (aErr) {
      console.error('[bulk-import] answer insert', aErr)
      await supabase.from('questions').delete().eq('id', question.id)
      skipped++
      continue
    }

    const { error: lErr } = await supabase
      .from('question_subjects')
      .insert({ question_id: question.id, subject_id: subjectId })
    if (lErr) {
      console.error('[bulk-import] subject link', lErr)
      await supabase.from('answer_options').delete().eq('question_id', question.id)
      await supabase.from('questions').delete().eq('id', question.id)
      skipped++
      continue
    }

    imported++
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'question.bulk_import',
    object_type: 'question',
    details: { imported, skipped, total: parsed.data.rows.length },
  })

  return NextResponse.json({ imported, skipped })
}
