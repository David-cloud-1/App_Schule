import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireContentAdmin } from '../../../_lib/auth'
import { guardTopics } from '../_lib/guard'
import { INTAKE_COUNTS, MAX_INTAKE_PROMPT_CHARS, MAX_PART_CHARS, buildIntakePrompt } from '@/lib/question-intake'

const BodySchema = z.object({
  topic_id: z.string().uuid(),
  class_level: z.number().int().min(1).max(13).nullable(),
  count: z.number().refine((n) => (INTAKE_COUNTS as readonly number[]).includes(n), 'Bitte wähle 5, 10, 15 oder 20 Vorschläge.'),
  text: z.string().trim().min(50, 'Der Text ist zu kurz.').max(MAX_PART_CHARS + 1000),
  part: z.object({ index: z.number().int().min(1), total: z.number().int().min(1).max(50) }).optional(),
})

export interface IntakePromptResponse {
  /** Der fertige Auftrag zum Kopieren */
  prompt: string
  length: number
  tooLong: boolean
}

/**
 * PROJ-132: baut den fertigen Auftrag für die KI der Lehrkraft. Kein KI-Aufruf,
 * es kostet nichts.
 */
export async function POST(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Die Anfrage war unlesbar.' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Die Angaben sind unvollständig.' }, { status: 400 })
  }
  const { topic_id, class_level, count, text, part } = parsed.data

  let guard
  try {
    guard = await guardTopics(supabase, auth, [topic_id])
  } catch (err) {
    console.error('[POST intake/prompt]', err)
    return NextResponse.json({ error: 'Das Thema konnte nicht geladen werden.' }, { status: 500 })
  }
  if (!guard.ok) return guard.response

  const topic = guard.topics.get(topic_id)!
  const department = guard.departments.get(topic.departmentId)!
  if (class_level != null && department.classLevels.length > 0 && !department.classLevels.includes(class_level)) {
    return NextResponse.json({ error: 'Diese Stufe gibt es in diesem Bereich nicht.' }, { status: 400 })
  }

  const prompt = buildIntakePrompt(department, {
    subjectName: topic.subjectName,
    topicName: topic.name,
    classLevel: class_level,
    count: count as 5 | 10 | 15 | 20,
    text,
    part,
  })
  const body: IntakePromptResponse = { prompt, length: prompt.length, tooLong: prompt.length > MAX_INTAKE_PROMPT_CHARS }
  return NextResponse.json(body)
}
