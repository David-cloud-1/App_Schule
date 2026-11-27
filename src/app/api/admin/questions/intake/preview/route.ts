import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireContentAdmin, resolveTargetDepartment, targetDepartmentMissing } from '../../../_lib/auth'
import { guardTopics } from '../_lib/guard'
import { fetchDepartmentSubjects, normalizeSubjectCode } from '@/lib/subjects'
import {
  MAX_ANSWER_CHARS,
  MAX_INTAKE_QUESTIONS,
  checkIntakeQuestions,
  parseIntakeAnswer,
  parseIntakeTable,
  suggestClassLevel,
  type IntakeQuestion,
} from '@/lib/question-intake'
import { topicLabel, type IntakeTopic } from '@/lib/question-intake-server'
import type { QualityFinding } from '@/lib/question-quality'

const BodySchema = z
  .object({
    topic_id: z.string().uuid().optional(),
    /** Nur Tabelle ohne festes Thema, wenn die Person mehrere Bereiche bearbeiten darf */
    department_id: z.string().uuid().optional(),
    /** Antwort der KI (Weg 2) */
    answer: z.string().max(MAX_ANSWER_CHARS).optional(),
    /** Zeilen der Tabelle (Weg 3), schon in Spalten zerlegt */
    rows: z.array(z.record(z.string(), z.unknown())).max(MAX_INTAKE_QUESTIONS + 1).optional(),
    /** Wie viele Vorschläge bestellt waren (für „Bestellt: 10, erhalten: 8“) */
    requested: z.number().int().min(1).max(500).optional(),
  })
  .refine((v) => (v.answer !== undefined) !== (v.rows !== undefined), 'Bitte gib entweder die Antwort der KI oder eine Tabelle an.')

export interface IntakePreviewItem {
  question: IntakeQuestion
  /** Gründe, warum die Karte markiert ist (ein Satz je Grund) */
  reasons: string[]
  blockers: QualityFinding[]
  warnings: QualityFinding[]
  duplicate: boolean
  topic_id: string | null
  topic_label: string | null
}

export interface IntakePreviewResponse {
  items: IntakePreviewItem[]
  skipped: string[]
  /** Die Antwort der KI war abgeschnitten; nur die vollständigen Fragen sind da */
  truncated: boolean
  requested: number | null
  /** Das gewählte Thema, falls eines gewählt ist */
  topic: { id: string; label: string; class_levels: number[]; suggested_class_level: number | null } | null
}

/**
 * PROJ-132: liest die Antwort der KI oder eine Tabelle ein und prüft sie
 * (Aufbau, Torwächter, Duplikate im Thema, Stufe). Legt nichts an.
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
    return NextResponse.json({ error: 'Bitte füge die Antwort der KI ein oder wähle eine Tabelle.' }, { status: 400 })
  }
  const body = parsed.data

  let questions: IntakeQuestion[]
  let skipped: string[] = []
  let truncated = false
  if (body.answer !== undefined) {
    if (!body.topic_id) return NextResponse.json({ error: 'Bitte wähle ein Thema.', field: 'topic_id' }, { status: 400 })
    const result = parseIntakeAnswer(body.answer)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
    questions = result.questions
    skipped = result.skipped
    truncated = result.truncated
  } else {
    const result = parseIntakeTable(body.rows ?? [])
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
    questions = result.questions
  }

  try {
    // Tabelle: Zeilen mit eigenem Fach und Thema suchen ihr Thema selbst
    const ownTarget = new Map<number, string>()
    if (questions.some((q) => q.fach_code && q.thema)) {
      const departmentId = resolveTargetDepartment(auth, body.department_id)
      if (!departmentId) return targetDepartmentMissing('die Fragen angelegt werden')
      const subjects = await fetchDepartmentSubjects(supabase, departmentId, { activeOnly: true })
      const subjectByCode = new Map(subjects.map((s) => [normalizeSubjectCode(s.code), s.id]))
      const { data: topicRows } = await supabase
        .from('topics')
        .select('id, name, subject_id')
        .in('subject_id', subjects.map((s) => s.id))
        .is('deleted_at', null)
        .limit(5000)
      const topicByKey = new Map(
        ((topicRows ?? []) as { id: string; name: string; subject_id: string }[]).map((t) => [`${t.subject_id}::${t.name.toLowerCase()}`, t.id]),
      )
      questions.forEach((q, i) => {
        if (!(q.fach_code && q.thema)) return
        const subjectId = subjectByCode.get(normalizeSubjectCode(q.fach_code))
        if (!subjectId) {
          q.errors.push(`Das Fach „${q.fach_code}“ gibt es in diesem Bereich nicht.`)
          return
        }
        const topicId = topicByKey.get(`${subjectId}::${q.thema.toLowerCase()}`)
        if (!topicId) q.errors.push(`Das Thema „${q.thema}“ gibt es im Fach ${q.fach_code} nicht. Lege es zuerst an oder wähle ein Thema.`)
        else ownTarget.set(i, topicId)
      })
    }

    const targetOf = (i: number): string | null => ownTarget.get(i) ?? body.topic_id ?? null
    questions.forEach((q, i) => {
      if (!targetOf(i) && !q.errors.some((e) => e.includes('Thema') || e.includes('Fach'))) {
        q.errors.push('Es fehlt das Thema. Wähle oben ein Thema.')
      }
    })

    const topicIds = [...new Set(questions.map((_, i) => targetOf(i)).filter((id): id is string => !!id))]
    const guard = await guardTopics(supabase, auth, topicIds)
    if (!guard.ok) return guard.response

    // Stufe: die der Zeile, wenn der Bereich sie kennt, sonst der Vorschlag fürs Thema
    const levelsOf = (topic: IntakeTopic) => guard.departments.get(topic.departmentId)?.classLevels ?? []
    const suggestionFor = (topic: IntakeTopic): number | null => suggestClassLevel(topic.existingLevels, levelsOf(topic))

    const checks = new Map<number, ReturnType<typeof checkIntakeQuestions>[number]>()
    for (const id of topicIds) {
      const topic = guard.topics.get(id)!
      const indexes = questions.map((_, i) => i).filter((i) => targetOf(i) === id)
      const suggestion = suggestionFor(topic)
      for (const i of indexes) {
        const q = questions[i]
        if (q.class_level != null && !levelsOf(topic).includes(q.class_level)) q.class_level = null
        if (q.class_level == null) q.class_level = suggestion
      }
      checkIntakeQuestions(indexes.map((i) => questions[i]), topic.existingTexts).forEach((c, k) => checks.set(indexes[k], c))
    }
    const orphans = questions.map((_, i) => i).filter((i) => !targetOf(i))
    checkIntakeQuestions(orphans.map((i) => questions[i]), []).forEach((c, k) => checks.set(orphans[k], c))

    const items: IntakePreviewItem[] = questions.map((q, i) => {
      const topicId = targetOf(i)
      const topic = topicId ? guard.topics.get(topicId) : undefined
      const c = checks.get(i)!
      // Fehler können nach dem Nachschlagen dazugekommen sein
      const reasons = [...new Set([...q.errors, ...c.reasons])]
      return { question: q, reasons, blockers: c.blockers, warnings: c.warnings, duplicate: c.duplicate, topic_id: topicId, topic_label: topic ? topicLabel(topic) : null }
    })

    const chosen = body.topic_id ? guard.topics.get(body.topic_id) : undefined
    const response: IntakePreviewResponse = {
      items,
      skipped,
      truncated,
      requested: body.requested ?? null,
      topic: chosen
        ? { id: chosen.id, label: topicLabel(chosen), class_levels: levelsOf(chosen), suggested_class_level: suggestionFor(chosen) }
        : null,
    }
    return NextResponse.json(response)
  } catch (err) {
    console.error('[POST intake/preview]', err)
    return NextResponse.json({ error: 'Die Vorschau konnte nicht erstellt werden. Bitte versuche es noch einmal.' }, { status: 500 })
  }
}
