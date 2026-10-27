import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'

const QuerySchema = z.object({ departmentId: z.string().uuid() })

/**
 * Wählbare Fragen (aktiv, Multiple-Choice) des Zielbereichs über alle
 * Fächer: der Bereichs-Pool plus die eigenen privaten Nachweis-Fragen der
 * anfragenden Person in diesem Bereich (PROJ-46). Der Zielbereich kommt
 * jetzt vom Dialog, nicht mehr aus dem Arbeitsbereich der Person — eine
 * Lehrkraft hat keinen.
 */
export async function GET(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  // Deckt sich mit der isOwnDepartment-Regel beim Datei-Import (PROJ-46):
  // nur in diesem Fall landen neue/geänderte Fragen im Bereichs-Pool statt privat.
  const canEditPool = auth.isSuperAdmin || (auth.isDepartmentAdmin && parsed.data.departmentId === auth.suggestedDepartmentId)

  try {
    const questions = await fetchSelectableQuestions(supabase, parsed.data.departmentId, user.id)
    return NextResponse.json({ questions, canEditPool })
  } catch (err) {
    console.error('[GET /api/admin/assessments/questions]', err)
    return NextResponse.json({ error: 'Fragen konnten nicht geladen werden.' }, { status: 500 })
  }
}
