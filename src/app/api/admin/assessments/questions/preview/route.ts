import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { fetchDepartmentSubjects, normalizeSubjectCode } from '@/lib/subjects'
import { getDepartmentById, isDepartmentActive } from '@/lib/departments'
import { defaultSubjectIdFor, fetchSelectableQuestions } from '@/lib/assessment-questions'
import { fetchExamParts } from '@/lib/exam-parts'
import {
  assessQuestionQuality,
  duplicateKey,
  parseAiAnswer,
  type ParsedQuestion,
} from '@/lib/assessment-import'
import type { QualityFinding } from '@/lib/question-quality'

const PreviewSchema = z.object({
  departmentId: z.string().uuid(),
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
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

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

  const { departmentId } = parsed.data

  // PROJ-46 (BUG-4): ein deaktivierter Bereich bekommt keinen neuen Inhalt mehr.
  if (!(await isDepartmentActive(supabase, departmentId))) {
    return NextResponse.json({ error: 'Dieser Fachbereich ist nicht verfügbar.' }, { status: 400 })
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
      fetchSelectableQuestions(supabase, departmentId, user.id),
      fetchExamParts(supabase, departmentId),
      getDepartmentById(supabase, departmentId),
    ])
  } catch (err) {
    console.error('[POST /api/admin/assessments/questions/preview]', err)
    return NextResponse.json({ error: 'Vorschau konnte nicht erstellt werden.' }, { status: 500 })
  }

  const defaultId = defaultSubjectIdFor(examParts, subjects)
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
