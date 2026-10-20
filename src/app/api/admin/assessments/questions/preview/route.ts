import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../../../_lib/auth'
import { fetchDepartmentSubjects, normalizeSubjectCode } from '@/lib/subjects'
import { getDepartmentById } from '@/lib/departments'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'
import { fetchExamParts } from '@/lib/exam-parts'
import {
  assessQuestionQuality,
  duplicateKey,
  parseAiAnswer,
  type ParsedQuestion,
} from '@/lib/assessment-import'
import type { QualityFinding } from '@/lib/question-quality'

const PreviewSchema = z.object({
  answer: z.string().min(2).max(500_000),
})

export interface PreviewItem extends Omit<ParsedQuestion, 'fach_code'> {
  /** Fach-Kürzel, das beim Import verwendet wird (erkannt oder Standardfach) */
  fach_code: string
  fach_defaulted: boolean
  duplicate: boolean
  blockers: QualityFinding[]
  warnings: QualityFinding[]
}

export interface PreviewResponse {
  items: PreviewItem[]
  skipped: string[]
}

/**
 * PROJ-38: prüft die eingefügte KI-Antwort — Schema, Torwächter, Duplikate,
 * Fach-Zuordnung. Legt nichts an.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, departmentId } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = PreviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bitte die Antwort der KI einfügen.' }, { status: 400 })
  }

  const result = parseAiAnswer(parsed.data.answer)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })

  let subjects
  let existing
  let examParts
  let department
  try {
    ;[subjects, existing, examParts, department] = await Promise.all([
      fetchDepartmentSubjects(supabase, departmentId),
      fetchSelectableQuestions(supabase, departmentId),
      fetchExamParts(supabase, departmentId),
      getDepartmentById(supabase, departmentId),
    ])
  } catch (err) {
    console.error('[POST /api/admin/assessments/questions/preview]', err)
    return NextResponse.json({ error: 'Vorschau konnte nicht erstellt werden.' }, { status: 500 })
  }

  const firstPart = [...examParts].sort((a, b) => a.partNumber - b.partNumber)[0]
  const defaultId = firstPart?.defaultSubjectId ?? firstPart?.subjects[0]?.id ?? subjects[0]?.id
  const defaultCode = subjects.find((s) => s.id === defaultId)?.code ?? subjects[0]?.code ?? ''
  const codes = new Set(subjects.map((s) => normalizeSubjectCode(s.code)))
  const classLevels = new Set(department?.classLevels ?? [])

  const known = new Set(existing.map((q) => duplicateKey(q.question_text)))
  const seen = new Set<string>()

  const items: PreviewItem[] = result.questions.map((q) => {
    const key = duplicateKey(q.question_text)
    const duplicate = key !== '' && (known.has(key) || seen.has(key))
    if (key) seen.add(key)
    const recognized = q.fach_code && codes.has(normalizeSubjectCode(q.fach_code))
    const quality = q.errors.length === 0 ? assessQuestionQuality(q) : { blockers: [], warnings: [] }
    return {
      ...q,
      class_level: q.class_level !== null && classLevels.has(q.class_level) ? q.class_level : null,
      fach_code: recognized ? normalizeSubjectCode(q.fach_code!) : defaultCode,
      fach_defaulted: !recognized,
      duplicate,
      ...quality,
    }
  })

  const response: PreviewResponse = { items, skipped: result.skipped }
  return NextResponse.json(response)
}
