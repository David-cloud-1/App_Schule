import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { reportErrorResponse } from '@/lib/question-reports'

/** Meldungen einer Frage übernehmen („in Prüfung“, PROJ-73). Nur ein Hinweis, keine Sperre. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const { questionId } = await params
  if (!z.string().uuid().safeParse(questionId).success) {
    return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
  }

  const { data, error } = await auth.supabase.rpc('claim_question_reports', { p_question_id: questionId })
  if (error) {
    const res = reportErrorResponse(error)
    if (res.status >= 500) console.error('[api/admin/question-reports/claim]', error)
    return NextResponse.json({ error: res.message }, { status: res.status })
  }
  return NextResponse.json({ claimed: data })
}
