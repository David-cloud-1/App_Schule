import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../../_lib/auth'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'

const QuerySchema = z.object({ part: z.coerce.number().int().min(1).max(20) })

/** Wählbare Fragen (aktiv, Multiple-Choice) eines Prüfungsteils im eigenen Fachbereich */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, departmentId } = auth

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) return NextResponse.json({ error: 'Ungültiger Prüfungsteil.' }, { status: 400 })

  try {
    const questions = await fetchSelectableQuestions(supabase, departmentId, parsed.data.part)
    if (!questions) return NextResponse.json({ error: 'Prüfungsteil nicht gefunden.' }, { status: 404 })
    return NextResponse.json({ questions })
  } catch (err) {
    console.error('[GET /api/admin/assessments/questions]', err)
    return NextResponse.json({ error: 'Fragen konnten nicht geladen werden.' }, { status: 500 })
  }
}
