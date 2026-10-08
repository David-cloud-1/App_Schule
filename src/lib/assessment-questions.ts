import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchExamParts, findExamPart } from '@/lib/exam-parts'

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
 * Alle aktiven Multiple-Choice-Fragen, die zu den Fächern des Prüfungsteils im
 * Bereich gehören (neueste zuerst). Seitenweise geladen, weil PostgREST bei
 * 1000 Zeilen kappt. `null`, wenn der Teil im Bereich nicht existiert.
 */
export async function fetchSelectableQuestions(
  supabase: SupabaseClient,
  departmentId: string,
  part: number,
): Promise<PickerQuestion[] | null> {
  const examPart = findExamPart(await fetchExamParts(supabase, departmentId), part)
  if (!examPart) return null
  const subjectIds = examPart.subjects.map((s) => s.id)
  if (subjectIds.length === 0) return []
  const codeById = new Map(examPart.subjects.map((s) => [s.id, s.code]))

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

export type QuestionSelectionCheck =
  | { ok: true; ids: string[] }
  | { ok: false; status: number; error: string }

/**
 * Serverseitige Prüfung einer Fragenauswahl: Duplikate raus, jede Frage muss
 * aktiv, Multiple-Choice und im Bereich/Teil sein, mindestens 5 Fragen.
 */
export async function checkQuestionSelection(
  supabase: SupabaseClient,
  departmentId: string,
  part: number,
  questionIds: string[],
): Promise<QuestionSelectionCheck> {
  const ids = [...new Set(questionIds)]
  const selectable = await fetchSelectableQuestions(supabase, departmentId, part)
  if (!selectable) return { ok: false, status: 400, error: `Prüfungsteil ${part} gibt es in diesem Fachbereich nicht.` }
  const allowed = new Set(selectable.map((q) => q.id))
  const invalid = ids.filter((id) => !allowed.has(id)).length
  if (invalid > 0) {
    return {
      ok: false,
      status: 400,
      error: `${invalid} gewählte Fragen sind nicht zulässig (offen, deaktiviert oder aus einem anderen Bereich/Teil).`,
    }
  }
  if (ids.length < MIN_ASSESSMENT_QUESTIONS) {
    return { ok: false, status: 400, error: `Mindestens ${MIN_ASSESSMENT_QUESTIONS} Fragen nötig.` }
  }
  return { ok: true, ids }
}
