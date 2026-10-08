import { NextResponse } from 'next/server'
import { requireAdmin } from '../../_lib/auth'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'

/** Wählbare Fragen (aktiv, Multiple-Choice) des eigenen Fachbereichs über alle Fächer */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, departmentId } = auth

  try {
    const questions = await fetchSelectableQuestions(supabase, departmentId)
    return NextResponse.json({ questions })
  } catch (err) {
    console.error('[GET /api/admin/assessments/questions]', err)
    return NextResponse.json({ error: 'Fragen konnten nicht geladen werden.' }, { status: 500 })
  }
}
