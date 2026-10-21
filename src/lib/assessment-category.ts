import type { SupabaseClient } from '@supabase/supabase-js'

/** Höchstlänge der Klassenbezeichnung (entspricht der DB-Prüfung) */
export const MAX_CLASS_NAME_LENGTH = 30

const SCHOOL_YEAR_PATTERN = /^(\d{4})\/(\d{2})$/

/**
 * Schuljahr zu einem Zeitpunkt, z. B. 15.10.2026 -> "2026/27".
 * Ab dem 1. September (Europe/Berlin) beginnt das neue Schuljahr.
 * Gleiche Regel wie current_school_year() in der Datenbank.
 */
export function schoolYearFor(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: 'numeric' })
    .formatToParts(d)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const start = month >= 9 ? year : year - 1
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`
}

/** "2026/27" — das Folgejahr muss genau auf das Startjahr folgen */
export function isValidSchoolYear(value: string): boolean {
  const m = SCHOOL_YEAR_PATTERN.exec(value)
  if (!m) return false
  return (Number(m[1]) + 1) % 100 === Number(m[2])
}

/**
 * Vereinheitlicht eine eingegebene Klasse: Ränder und Mehrfach-Leerzeichen
 * entfernen; stimmt sie bis auf Groß-/Kleinschreibung mit einer vorhandenen
 * Klasse überein, wird deren Schreibweise übernommen. Leer -> null.
 */
export function normalizeClassName(input: string | null | undefined, existing: string[]): string | null {
  const cleaned = (input ?? '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  const match = existing.find((e) => e.toLowerCase() === cleaned.toLowerCase())
  return match ?? cleaned
}

export type CategoryInput = {
  className?: string | null
  subjectId?: string | null
  schoolYear?: string
}

export type ResolvedCategory = {
  /** Nur die tatsächlich übergebenen Felder, als Spaltenwerte */
  columns: { class_name?: string | null; subject_id?: string | null; school_year?: string }
}

export type CategoryResult =
  | { ok: true; columns: ResolvedCategory['columns'] }
  | { ok: false; status: number; error: string }

/**
 * Prüft und bereitet die Ablage-Felder auf (PROJ-39). Fragt die Datenbank nur,
 * wenn Klasse oder Fach tatsächlich übergeben wurden.
 * - Fach muss zum Fachbereich des Nachweises gehören (null löscht die Zuordnung)
 * - Klasse wird gegen die im Fachbereich schon verwendeten Klassen vereinheitlicht
 */
export async function resolveCategory(
  supabase: SupabaseClient,
  departmentId: string,
  input: CategoryInput
): Promise<CategoryResult> {
  const columns: ResolvedCategory['columns'] = {}

  if (input.schoolYear !== undefined) {
    if (!isValidSchoolYear(input.schoolYear)) {
      return { ok: false, status: 400, error: 'Schuljahr muss wie „2026/27“ aussehen.' }
    }
    columns.school_year = input.schoolYear
  }

  if (input.subjectId !== undefined) {
    if (input.subjectId === null) {
      columns.subject_id = null
    } else {
      const { data, error } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', input.subjectId)
        .eq('department_id', departmentId)
        .maybeSingle()
      if (error) return { ok: false, status: 500, error: 'Fach konnte nicht geprüft werden.' }
      if (!data) return { ok: false, status: 400, error: 'Dieses Fach gibt es in diesem Bereich nicht.' }
      columns.subject_id = input.subjectId
    }
  }

  if (input.className !== undefined) {
    const existing = await fetchUsedClassNames(supabase, departmentId)
    if (existing === null) return { ok: false, status: 500, error: 'Klassen konnten nicht geprüft werden.' }
    columns.class_name = normalizeClassName(input.className, existing)
  }

  return { ok: true, columns }
}

/** Alle im Fachbereich bereits verwendeten Klassen (ohne Duplikate), null bei Fehler */
export async function fetchUsedClassNames(supabase: SupabaseClient, departmentId: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('graded_assessments')
    .select('class_name')
    .eq('department_id', departmentId)
    .not('class_name', 'is', null)
  if (error) return null
  return Array.from(new Set((data ?? []).map((r) => r.class_name as string)))
}
