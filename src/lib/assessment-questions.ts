import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchExamParts, type ExamPart } from '@/lib/exam-parts'
import { fetchDepartmentSubjects } from '@/lib/subjects'

/** Mindestanzahl Fragen für einen Leistungsnachweis */
export const MIN_ASSESSMENT_QUESTIONS = 5

/** Schlanke Frage für die Auswahl im Nachweis-Dialog (PROJ-27) */
export type PickerQuestion = {
  id: string
  question_text: string
  difficulty: string
  class_level: number | null
  topic: string | null
  subject_codes: string[]
}

type QuestionRow = {
  id: string
  question_text: string
  difficulty: string
  class_level: number | null
  topics: { name: string } | null
  question_subjects: { subject_id: string }[]
}

const PAGE_SIZE = 1000

/**
 * Alle aktiven Multiple-Choice-Fragen des Fachbereichs (neueste zuerst),
 * über alle Fächer hinweg. Seitenweise geladen, weil PostgREST bei 1000
 * Zeilen kappt.
 */
export async function fetchSelectableQuestions(
  supabase: SupabaseClient,
  departmentId: string,
): Promise<PickerQuestion[]> {
  const subjects = await fetchDepartmentSubjects(supabase, departmentId)
  if (subjects.length === 0) return []
  const subjectIds = subjects.map((s) => s.id)
  const codeById = new Map(subjects.map((s) => [s.id, s.code]))

  const all: PickerQuestion[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, difficulty, class_level, topics(name), question_subjects!inner(subject_id)')
      .eq('is_active', true)
      .eq('type', 'multiple_choice')
      .in('question_subjects.subject_id', subjectIds)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Fragen konnten nicht geladen werden: ${error.message}`)
    const rows = (data ?? []) as unknown as QuestionRow[]
    for (const q of rows) {
      all.push({
        id: q.id,
        question_text: q.question_text,
        difficulty: q.difficulty,
        class_level: q.class_level,
        topic: q.topics?.name ?? null,
        subject_codes: q.question_subjects.map((qs) => codeById.get(qs.subject_id)).filter((c): c is string => !!c),
      })
    }
    if (rows.length < PAGE_SIZE) break
  }
  return all
}

/**
 * Technischer Prüfungsteil eines Nachweises: der Teil, zu dem die meisten
 * gewählten Fragen (über ihre Fächer) gehören; bei Gleichstand der niedrigere.
 * Der Nachweis hat keine Teil-Auswahl mehr, die Teilnehmer-Pfade brauchen die
 * Nummer aber als Schlüssel.
 */
export function derivePartNumber(examParts: ExamPart[], questions: Pick<PickerQuestion, 'subject_codes'>[]): number | null {
  if (examParts.length === 0) return null
  const sorted = [...examParts].sort((a, b) => a.partNumber - b.partNumber)
  let best = sorted[0]
  let bestCount = -1
  for (const part of sorted) {
    const codes = new Set(part.subjects.map((s) => s.code))
    const count = questions.filter((q) => q.subject_codes.some((c) => codes.has(c))).length
    if (count > bestCount) {
      best = part
      bestCount = count
    }
  }
  return best.partNumber
}

export type QuestionSelectionCheck =
  | { ok: true; ids: string[]; part: number }
  | { ok: false; status: number; error: string }

/**
 * Serverseitige Prüfung einer Fragenauswahl: Duplikate raus, jede Frage muss
 * aktiv, Multiple-Choice und im Fachbereich sein, mindestens 5 Fragen. Liefert
 * zusätzlich den abgeleiteten technischen Prüfungsteil.
 */
export async function checkQuestionSelection(
  supabase: SupabaseClient,
  departmentId: string,
  questionIds: string[],
): Promise<QuestionSelectionCheck> {
  const ids = [...new Set(questionIds)]
  const [selectable, examParts] = await Promise.all([
    fetchSelectableQuestions(supabase, departmentId),
    fetchExamParts(supabase, departmentId),
  ])
  const byId = new Map(selectable.map((q) => [q.id, q]))
  const invalid = ids.filter((id) => !byId.has(id)).length
  if (invalid > 0) {
    return {
      ok: false,
      status: 400,
      error: `${invalid} gewählte Fragen sind nicht zulässig (offen, deaktiviert oder aus einem anderen Bereich).`,
    }
  }
  if (ids.length < MIN_ASSESSMENT_QUESTIONS) {
    return { ok: false, status: 400, error: `Mindestens ${MIN_ASSESSMENT_QUESTIONS} Fragen nötig.` }
  }
  const part = derivePartNumber(examParts, ids.map((id) => byId.get(id)!))
  if (part === null) {
    return { ok: false, status: 400, error: 'Für diesen Fachbereich sind keine Prüfungsteile eingerichtet.' }
  }
  return { ok: true, ids, part }
}
