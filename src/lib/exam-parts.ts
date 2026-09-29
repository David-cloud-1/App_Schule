import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Prüfungsaufbau eines Fachbereichs (PROJ-22): welche Teile es gibt, welche
 * Fächer dazugehören, wie viele Fragen und wie lange. Ersetzt die festen
 * Teil-1/2/3-Konstanten in Prüfungssimulation, Prüfungssets und
 * Leistungsnachweisen.
 */
export interface ExamPart {
  id: string
  code: string
  partNumber: number
  /** Offizieller Name, z. B. „Leistungserstellung in Spedition und Logistik" */
  name: string
  /** Zweizeilige Kachel auf der Prüfungs-Startseite */
  title: string
  subtitle: string
  /** Kurzform für Etiketten und Admin-Listen, z. B. „WiSo" */
  shortLabel: string
  iconName: string
  color: string
  questionCount: number
  durationMinutes: number
  /** Anteil offener Fragen im Zufalls-Pool (0–1) */
  openQuestionShare: number
  defaultSubjectId: string | null
  subjects: { id: string; code: string }[]
}

interface ExamPartRow {
  id: string
  code: string
  part_number: number
  name: string
  title: string
  subtitle: string
  short_label: string
  icon_name: string
  color: string
  question_count: number
  duration_minutes: number
  open_question_share: number | string
  default_subject_id: string | null
  exam_part_subjects: { subjects: { id: string; code: string; sort_order: number | null } | null }[] | null
}

const EXAM_PART_COLUMNS =
  'id, code, part_number, name, title, subtitle, short_label, icon_name, color, question_count, duration_minutes, open_question_share, default_subject_id, exam_part_subjects(subjects(id, code, sort_order))'

export function mapExamPart(row: ExamPartRow): ExamPart {
  const subjects = (row.exam_part_subjects ?? [])
    .map((l) => l.subjects)
    .filter((s): s is { id: string; code: string; sort_order: number | null } => s !== null)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.code.localeCompare(b.code))
    .map(({ id, code }) => ({ id, code }))
  return {
    id: row.id,
    code: row.code,
    partNumber: row.part_number,
    name: row.name,
    title: row.title,
    subtitle: row.subtitle,
    shortLabel: row.short_label,
    iconName: row.icon_name,
    color: row.color,
    questionCount: row.question_count,
    durationMinutes: row.duration_minutes,
    // numeric kommt von PostgREST als String
    openQuestionShare: Number(row.open_question_share) || 0,
    defaultSubjectId: row.default_subject_id,
    subjects,
  }
}

export async function fetchExamParts(supabase: SupabaseClient, departmentId: string): Promise<ExamPart[]> {
  const { data, error } = await supabase
    .from('exam_parts')
    .select(EXAM_PART_COLUMNS)
    .eq('department_id', departmentId)
    .order('part_number')
    .limit(20)
  if (error) throw new Error(`Prüfungsteile konnten nicht geladen werden: ${error.message}`)
  return ((data ?? []) as unknown as ExamPartRow[]).map(mapExamPart)
}

export function findExamPart(parts: ExamPart[], partNumber: number): ExamPart | undefined {
  return parts.find((p) => p.partNumber === partNumber)
}

/** „Teil 3 – WiSo" — Beschriftung in Admin-Listen */
export function examPartLabel(part: Pick<ExamPart, 'partNumber' | 'shortLabel'> | undefined, partNumber?: number): string {
  if (!part) return `Teil ${partNumber ?? '?'}`
  return `Teil ${part.partNumber} – ${part.shortLabel}`
}

/** „STG / LOP" — Fächer eines Teils für Kacheln */
export function examPartSubjectCodes(part: Pick<ExamPart, 'subjects'>): string {
  return part.subjects.map((s) => s.code).join(' / ')
}
