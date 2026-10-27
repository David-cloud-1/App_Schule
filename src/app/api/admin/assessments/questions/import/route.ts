import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../_lib/auth'
import { fetchExamParts } from '@/lib/exam-parts'
import { fetchDepartmentSubjects, normalizeSubjectCode } from '@/lib/subjects'
import { fetchSelectableQuestions, type PickerQuestion } from '@/lib/assessment-questions'
import { getDepartmentById } from '@/lib/departments'
import { assessQuestionQuality, duplicateKey, DIFFICULTIES } from '@/lib/assessment-import'

const QuestionSchema = z.object({
  question_text: z.string().min(1).max(1000),
  options: z.array(z.string().min(1).max(500)).min(2).max(5),
  // Für eine Note muss der Schlüssel feststehen: keine ungeprüften Fragen
  correct_index: z.number().int().min(0).max(4),
  fach_code: z.string().nullable().optional(),
  // PROJ-38: Angaben aus dem Kopier-Prompt-Import
  explanation: z.string().max(2000).nullable().optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  class_level: z.number().int().min(1).max(20).nullable().optional(),
}).refine((q) => q.correct_index < q.options.length, { message: 'correct_index außerhalb der Optionen', path: ['correct_index'] })

const ImportSchema = z.object({
  departmentId: z.string().uuid(),
  questions: z.array(QuestionSchema).min(1).max(200),
  // PROJ-38: true = Fragen sind bis zur Freigabe nur für Nachweise nutzbar.
  // Für einen fremden Bereich (Lehrkraft, oder Bereichs-Admin außerhalb des
  // eigenen Bereichs) gilt das ohnehin immer — dauerhaft privat (PROJ-46, E6).
  assessmentOnly: z.boolean().default(false),
})

/**
 * Legt ausgelesene Fragen nur als Fragen an (Fach über das Kürzel, sonst
 * Standardfach) (kein Prüfungsset) und gibt sie für die Auswahl im
 * Nachweis-Dialog zurück (PROJ-27). Für einen fremden Bereich entstehen sie
 * als private Nachweis-Fragen der importierenden Person (PROJ-46, E6).
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
  const parsed = ImportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }
  const { departmentId } = parsed.data

  // Eigener Bereich: Super-Admin überall, Bereichs-Admin nur im eigenen.
  // Sonst (Lehrkraft, oder Bereichs-Admin für einen fremden Bereich) immer
  // privat und immer „nur für Nachweise" — unabhängig vom gesendeten Wert.
  const isOwnDepartment = auth.isSuperAdmin || (auth.isDepartmentAdmin && departmentId === auth.suggestedDepartmentId)
  const isPrivate = !isOwnDepartment
  const assessmentOnly = isOwnDepartment ? parsed.data.assessmentOnly : true
  let questions = parsed.data.questions

  // PROJ-38/46: Qualitätsprüfung und Duplikate serverseitig, dem Browser wird nicht vertraut
  if (assessmentOnly) {
    const blocked = questions.filter((q) => assessQuestionQuality({ ...q, explanation: q.explanation ?? null }).blockers.length > 0)
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: `${blocked.length} Fragen haben Qualitätsmängel (Torwächter) und können nicht importiert werden.` },
        { status: 422 },
      )
    }
    let known: Set<string>
    try {
      known = new Set((await fetchSelectableQuestions(supabase, departmentId, user.id)).map((q) => duplicateKey(q.question_text)))
    } catch (err) {
      console.error('[assessments/questions/import]', err)
      return NextResponse.json({ error: 'Fragen konnten nicht geprüft werden.' }, { status: 500 })
    }
    const seen = new Set<string>()
    questions = questions.filter((q) => {
      const key = duplicateKey(q.question_text)
      if (known.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (questions.length === 0) {
      return NextResponse.json({ error: 'Alle Fragen existieren bereits im Fachbereich.' }, { status: 409 })
    }
  }
  const department = assessmentOnly ? await getDepartmentById(supabase, departmentId) : null
  const allowedClassLevels = new Set(department?.classLevels ?? [])

  let examParts
  let subjects
  try {
    examParts = await fetchExamParts(supabase, departmentId)
    subjects = await fetchDepartmentSubjects(supabase, departmentId)
  } catch (err) {
    console.error('[assessments/questions/import]', err)
    return NextResponse.json({ error: 'Fächer konnten nicht geladen werden.' }, { status: 500 })
  }
  // Ohne erkanntes Fachkürzel: Standardfach des ersten Prüfungsteils
  const firstPart = [...examParts].sort((a, b) => a.partNumber - b.partNumber)[0]
  const defaultSubjectId = firstPart?.defaultSubjectId ?? firstPart?.subjects[0]?.id ?? subjects[0]?.id
  if (!defaultSubjectId) {
    return NextResponse.json({ error: 'Für diesen Fachbereich sind keine Fächer eingerichtet.' }, { status: 500 })
  }

  const subjectMap: Record<string, string> = {}
  for (const s of subjects) subjectMap[normalizeSubjectCode(s.code)] = s.id
  const codeById = new Map(subjects.map((s) => [s.id, s.code]))

  const { data: inserted, error: qErr } = await supabase
    .from('questions')
    .insert(questions.map((q) => ({
      question_text: q.question_text,
      is_active: true,
      type: 'multiple_choice',
      difficulty: q.difficulty ?? 'mittel',
      explanation: q.explanation?.trim() || null,
      class_level: q.class_level != null && allowedClassLevels.has(q.class_level) ? q.class_level : null,
      assessment_only: assessmentOnly,
      is_private: isPrivate,
      owner_id: isPrivate ? user.id : null,
    })))
    .select('id')
  if (qErr || !inserted || inserted.length !== questions.length) {
    return NextResponse.json({ error: 'Fragen konnten nicht angelegt werden.' }, { status: 500 })
  }
  const ids = inserted.map((q) => q.id as string)

  const rollback = async () => {
    await supabase.from('question_subjects').delete().in('question_id', ids)
    await supabase.from('answer_options').delete().in('question_id', ids)
    await supabase.from('questions').delete().in('id', ids)
  }

  const { error: aErr } = await supabase.from('answer_options').insert(
    inserted.flatMap((q, i) =>
      questions[i].options.map((opt, j) => ({
        question_id: q.id as string,
        option_text: opt,
        is_correct: j === questions[i].correct_index,
        display_order: j + 1,
      })),
    ),
  )
  if (aErr) {
    await rollback()
    return NextResponse.json({ error: 'Antwortoptionen konnten nicht angelegt werden.' }, { status: 500 })
  }

  const subjectIdFor = (i: number) => {
    const fach = questions[i].fach_code ? normalizeSubjectCode(questions[i].fach_code!) : null
    return (fach && subjectMap[fach]) || defaultSubjectId
  }
  const { error: sErr } = await supabase
    .from('question_subjects')
    .insert(inserted.map((q, i) => ({ question_id: q.id as string, subject_id: subjectIdFor(i) })))
  if (sErr) {
    await rollback()
    return NextResponse.json({ error: 'Fächer konnten nicht verknüpft werden.' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'import',
    object_type: 'question',
    object_label: `Nachweis-Import (${ids.length} Fragen)`,
    details: { questions_imported: ids.length, assessment_only: assessmentOnly, is_private: isPrivate },
    department_id: departmentId,
  })

  const result: PickerQuestion[] = inserted.map((q, i) => ({
    id: q.id as string,
    question_text: questions[i].question_text,
    difficulty: questions[i].difficulty ?? 'mittel',
    class_level: questions[i].class_level != null && allowedClassLevels.has(questions[i].class_level!) ? questions[i].class_level! : null,
    topic: null,
    subject_codes: [codeById.get(subjectIdFor(i)) ?? ''].filter(Boolean),
    isPrivate,
  }))
  return NextResponse.json({ questions: result, skippedDuplicates: parsed.data.questions.length - questions.length }, { status: 201 })
}
