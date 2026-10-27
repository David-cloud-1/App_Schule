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
  /** Eigene Nachweis-Frage (PROJ-46) — trägt in der Auswahl das Schild „Meine Frage“. */
  isPrivate: boolean
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

async function loadQuestionRows(
  supabase: SupabaseClient,
  subjectIds: string[],
  isPrivate: boolean,
  ownerId: string | null,
): Promise<QuestionRow[]> {
  const all: QuestionRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from('questions')
      .select('id, question_text, difficulty, class_level, topics(name), question_subjects!inner(subject_id)')
      .eq('is_active', true)
      .eq('type', 'multiple_choice')
      .eq('is_private', isPrivate)
    if (isPrivate) query = query.eq('owner_id', ownerId as string)
    const { data, error } = await query
      .in('question_subjects.subject_id', subjectIds)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Fragen konnten nicht geladen werden: ${error.message}`)
    const rows = (data ?? []) as unknown as QuestionRow[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }
  return all
}

/**
 * Alle aktiven Multiple-Choice-Fragen des Fachbereichs (neueste zuerst), über
 * alle Fächer hinweg: der Bereichs-Pool, plus — mit `ownerId` — die eigenen
 * privaten Nachweis-Fragen der Person in diesem Bereich (PROJ-46, E6). Jede
 * Gruppe wird seitenweise geladen, weil PostgREST bei 1000 Zeilen kappt.
 */
export async function fetchSelectableQuestions(
  supabase: SupabaseClient,
  departmentId: string,
  ownerId?: string | null,
): Promise<PickerQuestion[]> {
  const subjects = await fetchDepartmentSubjects(supabase, departmentId)
  if (subjects.length === 0) return []
  const subjectIds = subjects.map((s) => s.id)
  const codeById = new Map(subjects.map((s) => [s.id, s.code]))

  const toPicker = (rows: QuestionRow[], isPrivate: boolean): PickerQuestion[] =>
    rows.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      difficulty: q.difficulty,
      class_level: q.class_level,
      topic: q.topics?.name ?? null,
      subject_codes: q.question_subjects.map((qs) => codeById.get(qs.subject_id)).filter((c): c is string => !!c),
      isPrivate,
    }))

  const pool = toPicker(await loadQuestionRows(supabase, subjectIds, false, null), false)
  const own = ownerId
    ? toPicker(await loadQuestionRows(supabase, subjectIds, true, ownerId), true)
    : []
  return [...pool, ...own]
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

/**
 * Standardfach eines Bereichs: das Standardfach seines ersten Prüfungsteils,
 * sonst dessen erstes Fach, sonst irgendein Fach des Bereichs. Für Importe
 * ohne erkanntes Fachkürzel (PROJ-38) und für eigene private Fragen, die beim
 * Zielbereich-Wechsel im Entwurf bleiben (PROJ-46) — ihre Fach-Zuordnung zieht
 * mit um, sonst blieben sie in der Auswahl des neuen Bereichs unsichtbar.
 */
export function defaultSubjectIdFor(examParts: ExamPart[], subjects: { id: string }[]): string | null {
  const firstPart = [...examParts].sort((a, b) => a.partNumber - b.partNumber)[0]
  return firstPart?.defaultSubjectId ?? firstPart?.subjects[0]?.id ?? subjects[0]?.id ?? null
}

export type QuestionSelectionCheck =
  | { ok: true; ids: string[]; part: number }
  | { ok: false; status: number; error: string }

/**
 * Serverseitige Prüfung einer Fragenauswahl: Duplikate raus, jede Frage muss
 * aktiv, Multiple-Choice und im Fachbereich sein (Bereichs-Pool oder eigene
 * private Nachweis-Frage, PROJ-46), mindestens 5 Fragen. Liefert zusätzlich
 * den abgeleiteten technischen Prüfungsteil.
 */
export async function checkQuestionSelection(
  supabase: SupabaseClient,
  departmentId: string,
  questionIds: string[],
  ownerId?: string | null,
): Promise<QuestionSelectionCheck> {
  const ids = [...new Set(questionIds)]
  const [selectable, examParts] = await Promise.all([
    fetchSelectableQuestions(supabase, departmentId, ownerId),
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
