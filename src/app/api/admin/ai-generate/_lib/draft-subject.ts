import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchDepartmentSubjects, normalizeSubjectCode, type DepartmentSubject } from '@/lib/subjects'

/**
 * Fach eines KI-Entwurfs im Bereich des Admins (PROJ-22).
 *
 * Maßgeblich ist `subject_id`; ältere Entwürfe haben nur `subject_code` —
 * das Kürzel wird dann ausschließlich im Bereich des Admins aufgelöst, damit
 * ein gleiches Kürzel eines anderen Bereichs nie greift.
 */
export async function resolveDraftSubject(
  supabase: SupabaseClient,
  departmentId: string,
  draft: { subject_id?: string | null; subject_code?: string | null },
  preloaded?: DepartmentSubject[],
): Promise<DepartmentSubject | null> {
  const subjects = preloaded ?? (await fetchDepartmentSubjects(supabase, departmentId))
  if (draft.subject_id) {
    return subjects.find((s) => s.id === draft.subject_id) ?? null
  }
  if (draft.subject_code) {
    const code = normalizeSubjectCode(draft.subject_code)
    return subjects.find((s) => normalizeSubjectCode(s.code) === code) ?? null
  }
  return null
}
