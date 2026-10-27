import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { fetchDepartmentSubjects } from '@/lib/subjects'
import { fetchUsedClassNames } from '@/lib/assessment-category'

const QuerySchema = z.object({ departmentId: z.string().uuid() })

/**
 * PROJ-46: Fächer und bereits verwendete Klassen des Zielbereichs für die
 * Ablage (PROJ-39) im Anlegen-Dialog — der Zielbereich kommt jetzt vom
 * Dialog, nicht mehr aus dem Arbeitsbereich der anlegenden Person.
 */
export async function GET(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }
  const { departmentId } = parsed.data

  try {
    const [subjects, classes] = await Promise.all([
      fetchDepartmentSubjects(supabase, departmentId, { activeOnly: true }),
      fetchUsedClassNames(supabase, departmentId),
    ])
    return NextResponse.json({
      subjects: subjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
      classes: classes ?? [],
    })
  } catch (err) {
    console.error('[GET /api/admin/assessments/category-options]', err)
    return NextResponse.json({ error: 'Ablage-Optionen konnten nicht geladen werden.' }, { status: 500 })
  }
}
