import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fächer eines Fachbereichs (PROJ-22).
 *
 * Fachkürzel sind nur noch JE BEREICH eindeutig (`KSK` darf es in Spedition
 * und Tourismus geben). Deshalb ist dies die einzige Stelle, die ein Fach über
 * sein Kürzel sucht — immer zusammen mit dem Bereich. Alles andere arbeitet
 * mit der Fach-ID.
 */
export interface DepartmentSubject {
  id: string
  code: string
  name: string
  color: string
  iconName: string
  description: string | null
  isActive: boolean
  sortOrder: number
}

export const SUBJECT_COLUMNS = 'id, code, name, color, icon_name, description, is_active, sort_order'

interface SubjectRow {
  id: string
  code: string
  name: string
  color: string
  icon_name: string
  description: string | null
  is_active: boolean
  sort_order: number | null
}

function mapSubject(row: SubjectRow): DepartmentSubject {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    color: row.color,
    iconName: row.icon_name,
    description: row.description,
    isActive: row.is_active,
    sortOrder: row.sort_order ?? 0,
  }
}

/** Groß-/Kleinschreibung und Leerzeichen spielen beim Kürzel keine Rolle. */
export function normalizeSubjectCode(code: string): string {
  return code.trim().toUpperCase()
}

export async function fetchDepartmentSubjects(
  supabase: SupabaseClient,
  departmentId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<DepartmentSubject[]> {
  let query = supabase
    .from('subjects')
    .select(SUBJECT_COLUMNS)
    .eq('department_id', departmentId)
  if (opts.activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query.order('sort_order').order('code').limit(100)
  if (error) throw new Error(`Fächer konnten nicht geladen werden: ${error.message}`)
  return ((data ?? []) as SubjectRow[]).map(mapSubject)
}

/**
 * Kürzel → Fach, nur innerhalb des Bereichs. Unbekannte Kürzel fehlen in der
 * Map; der Aufrufer entscheidet, ob er ablehnt oder überspringt.
 */
export async function resolveSubjectCodes(
  supabase: SupabaseClient,
  departmentId: string,
  codes: string[],
  opts: { activeOnly?: boolean } = {},
): Promise<Map<string, DepartmentSubject>> {
  const wanted = [...new Set(codes.map(normalizeSubjectCode).filter(Boolean))]
  const result = new Map<string, DepartmentSubject>()
  if (wanted.length === 0) return result
  const subjects = await fetchDepartmentSubjects(supabase, departmentId, opts)
  for (const s of subjects) {
    const key = normalizeSubjectCode(s.code)
    if (wanted.includes(key)) result.set(key, s)
  }
  return result
}

export async function resolveSubjectCode(
  supabase: SupabaseClient,
  departmentId: string,
  code: string,
  opts: { activeOnly?: boolean } = {},
): Promise<DepartmentSubject | null> {
  const map = await resolveSubjectCodes(supabase, departmentId, [code], opts)
  return map.get(normalizeSubjectCode(code)) ?? null
}

/** Für Fehlermeldungen: „erlaubt: BGP, KSK, STG, LOP, PUG". */
export function formatAllowedCodes(subjects: Pick<DepartmentSubject, 'code'>[]): string {
  return subjects.map((s) => s.code).join(', ')
}
