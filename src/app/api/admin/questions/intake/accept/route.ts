import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { auditFailedResponse, requireContentAdmin, writeAuditLogStrict } from '../../../_lib/auth'
import { guardTopics } from '../_lib/guard'
import { groupIntoBatch } from '@/lib/content-history'
import {
  MAX_EXPLANATION,
  MAX_INTAKE_QUESTIONS,
  MAX_OPTION_TEXT,
  MAX_QUESTION_TEXT,
  MAX_SAMPLE_ANSWER,
  intakeDescription,
  qualityFor,
  validateIntakeQuestion,
  type IntakeQuestion,
} from '@/lib/question-intake'

const ItemSchema = z.object({
  topic_id: z.string().uuid(),
  question_text: z.string().trim().min(1).max(MAX_QUESTION_TEXT),
  type: z.enum(['multiple_choice', 'open']),
  answers: z.array(z.object({ text: z.string().trim().min(1).max(MAX_OPTION_TEXT), is_correct: z.boolean() })).length(5).optional(),
  sample_answer: z.string().max(MAX_SAMPLE_ANSWER).nullable().optional(),
  explanation: z.string().max(MAX_EXPLANATION).nullable().optional(),
  difficulty: z.enum(['leicht', 'mittel', 'schwer']),
  class_level: z.number().int().min(1).max(13).nullable(),
})

const BodySchema = z.object({
  source: z.enum(['material', 'table']),
  file_name: z.string().max(200).optional(),
  /** Die Lehrkraft hat bewusst Fragen angehakt, die der Torwächter bemängelt hat */
  allow_flagged: z.boolean().optional(),
  items: z.array(ItemSchema).min(1).max(MAX_INTAKE_QUESTIONS),
})

type Item = z.infer<typeof ItemSchema>

function toIntakeQuestion(item: Item): IntakeQuestion {
  const answers = item.answers ?? []
  const correct = answers.findIndex((a) => a.is_correct)
  return {
    question_text: item.question_text,
    type: item.type,
    options: item.type === 'multiple_choice' ? answers.map((a) => a.text) : [],
    correct_index: item.type === 'multiple_choice' && correct >= 0 ? correct : null,
    sample_answer: item.type === 'open' ? (item.sample_answer ?? null) : null,
    explanation: item.explanation ?? null,
    difficulty: item.difficulty,
    class_level: item.class_level,
    errors: [],
  }
}

/** Nimmt alles zurück, was dieser Aufruf angelegt hat (Antworten und Fach-Verknüpfungen zuerst) */
async function rollback(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return
  await supabase.from('answer_options').delete().in('question_id', ids)
  await supabase.from('question_subjects').delete().in('question_id', ids)
  await supabase.from('questions').delete().in('id', ids)
}

/**
 * PROJ-132: übernimmt die angehakten Fragen der Vorschau – alle oder keine.
 * Erst jetzt werden sie gespeichert und für Azubis sichtbar. Jede Frage wird
 * hier noch einmal geprüft, auch wenn die Vorschau sie schon geprüft hat.
 */
export async function POST(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Die Anfrage war unlesbar.' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Einige Angaben fehlen oder sind zu lang. Es wurde nichts übernommen.' }, { status: 400 })
  }
  const { source, file_name, allow_flagged, items } = parsed.data

  let guard
  try {
    guard = await guardTopics(supabase, auth, items.map((i) => i.topic_id))
  } catch (err) {
    console.error('[POST intake/accept] guard', err)
    return NextResponse.json({ error: 'Die Themen konnten nicht geladen werden. Es wurde nichts übernommen.' }, { status: 500 })
  }
  if (!guard.ok) return guard.response

  const rejected: { index: number; reason: string }[] = []
  items.forEach((item, index) => {
    const topic = guard.topics.get(item.topic_id)!
    const levels = guard.departments.get(topic.departmentId)?.classLevels ?? []
    const q = toIntakeQuestion(item)
    const problems = validateIntakeQuestion(q)
    if (item.type === 'multiple_choice' && (item.answers ?? []).filter((a) => a.is_correct).length !== 1) {
      problems.push('Es muss genau eine richtige Antwort geben.')
    }
    if (levels.length > 0 && (item.class_level == null || !levels.includes(item.class_level))) {
      problems.push('Bitte wähle eine Stufe.')
    } else if (levels.length === 0 && item.class_level != null) {
      problems.push('In diesem Bereich gibt es keine Stufen.')
    }
    if (problems.length === 0 && !allow_flagged) {
      const blockers = qualityFor(q).blockers
      if (blockers.length > 0) problems.push(blockers[0].message)
    }
    if (problems.length > 0) rejected.push({ index, reason: problems[0] })
  })
  if (rejected.length > 0) {
    return NextResponse.json(
      { error: 'Einige Fragen sind noch nicht in Ordnung. Es wurde nichts übernommen.', rejected },
      { status: 400 },
    )
  }

  // 1. Fragen in einem Rutsch anlegen
  const { data: created, error: qErr } = await supabase
    .from('questions')
    .insert(
      items.map((item) => ({
        question_text: item.question_text,
        difficulty: item.difficulty,
        explanation: item.explanation ?? null,
        type: item.type,
        sample_answer: item.type === 'open' ? (item.sample_answer ?? null) : null,
        is_active: true,
        class_level: item.class_level,
        topic_id: item.topic_id,
      })),
    )
    .select('id, question_text')
  const createdRows = (created ?? []) as { id: string; question_text: string }[]
  if (qErr || createdRows.length !== items.length) {
    console.error('[POST intake/accept] questions insert', qErr)
    await rollback(supabase, createdRows.map((r) => r.id))
    return NextResponse.json({ error: 'Die Fragen konnten nicht gespeichert werden. Es wurde nichts übernommen.' }, { status: 500 })
  }
  // Reihenfolge der Antwort = Reihenfolge der Eingabe; zur Sicherheit über den Text abgleichen
  const ids = createdRows.map((r) => r.id)
  const ordered = createdRows.every((r, i) => r.question_text.trim() === items[i].question_text)
  const idOf = (index: number): string => {
    if (ordered) return ids[index]
    return createdRows.find((r) => r.question_text.trim() === items[index].question_text)!.id
  }

  // 2. Antworten und Fach-Verknüpfungen
  const answerRows = items.flatMap((item, index) =>
    item.type === 'multiple_choice'
      ? (item.answers ?? []).map((a, k) => ({ question_id: idOf(index), option_text: a.text, is_correct: a.is_correct, display_order: k + 1 }))
      : [],
  )
  const linkRows = items.map((item, index) => ({ question_id: idOf(index), subject_id: guard.topics.get(item.topic_id)!.subjectId }))
  const [{ error: aErr }, { error: lErr }] = await Promise.all([
    answerRows.length > 0 ? supabase.from('answer_options').insert(answerRows) : Promise.resolve({ error: null }),
    supabase.from('question_subjects').insert(linkRows),
  ])
  if (aErr || lErr) {
    console.error('[POST intake/accept] answers/links', aErr, lErr)
    await rollback(supabase, ids)
    return NextResponse.json({ error: 'Die Fragen konnten nicht gespeichert werden. Es wurde nichts übernommen.' }, { status: 500 })
  }

  // 3. Protokoll: ein Eintrag für den ganzen Vorgang (lückenlos, sonst zurück)
  const description = intakeDescription(source, items.length, file_name)
  const firstTopic = guard.topics.get(items[0].topic_id)!
  const logged = await writeAuditLogStrict(supabase, {
    admin_id: user.id,
    action_type: 'question.intake',
    object_type: 'question',
    object_label: description,
    department_id: firstTopic.departmentId,
    details: { source, file_name: file_name ?? null, count: items.length, topic_ids: [...new Set(items.map((i) => i.topic_id))] },
  })
  if (!logged) {
    await rollback(supabase, ids)
    return auditFailedResponse()
  }
  await groupIntoBatch(supabase, 'question', ids, description)

  return NextResponse.json({ imported: ids.length, ids, topic_ids: [...new Set(items.map((i) => i.topic_id))] }, { status: 201 })
}
