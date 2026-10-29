import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'

const ROUTE = 'api/admin/lehrerzimmer/catalog'

/**
 * Fachbereiche und Fächer als Auswahl für Filter und Formular im Lehrerzimmer
 * (PROJ-63) — für alle Lehrer-Rollen. „Meine Fächer“ liefert Ähnliches, ist
 * aber nur für reine Lehrkräfte offen. `own_department_ids` dient der
 * Vorbelegung: bei Lehrkräften die Bereiche ihrer Zuständigkeiten, bei Admins
 * der Arbeits-Bereich.
 */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user, suggestedDepartmentId } = auth

  const [departments, subjects, assignments] = await Promise.all([
    supabase.from('departments').select('id, name, code').eq('is_active', true).order('sort_order').limit(50),
    supabase
      .from('subjects')
      .select('id, name, code, department_id')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order')
      .limit(500),
    supabase.from('teacher_subject_assignments').select('department_id').eq('teacher_id', user.id).limit(200),
  ])

  const failure = departments.error ?? subjects.error ?? assignments.error
  if (failure) {
    console.error(`[${ROUTE}]`, failure)
    return NextResponse.json({ error: 'Die Auswahl konnte nicht geladen werden.' }, { status: 500 })
  }

  const fromAssignments = Array.from(new Set((assignments.data ?? []).map((a) => a.department_id as string)))
  const own = fromAssignments.length > 0 ? fromAssignments : suggestedDepartmentId ? [suggestedDepartmentId] : []

  return NextResponse.json({
    departments: departments.data ?? [],
    subjects: subjects.data ?? [],
    own_department_ids: own,
  })
}
