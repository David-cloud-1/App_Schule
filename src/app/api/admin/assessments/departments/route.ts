import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'

/**
 * PROJ-46: aktive Fachbereiche für den Zielbereich-Schritt im Anlegen-Dialog —
 * bewusst unter /api/admin/assessments/**, damit die Middleware sie auch
 * einer Lehrkraft ohne Fachbereich öffnet. Enthält nur, was die Oberfläche
 * zur Auswahl braucht (keine internen Konfigurationsfelder, PROJ-24 BUG-3).
 */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { data, error } = await supabase
    .from('departments')
    .select('id, name, code, class_levels')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at')
  if (error) {
    console.error('[GET /api/admin/assessments/departments]', error)
    return NextResponse.json({ error: 'Fachbereiche konnten nicht geladen werden.' }, { status: 500 })
  }

  return NextResponse.json({
    departments: (data ?? []).map((d) => ({
      id: d.id as string,
      name: d.name as string,
      code: d.code as string,
      classLevels: (d.class_levels as number[] | null) ?? [],
    })),
    suggestedDepartmentId: auth.suggestedDepartmentId,
  })
}
