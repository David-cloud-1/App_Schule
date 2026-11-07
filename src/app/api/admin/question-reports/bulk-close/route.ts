import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin, writeAuditLog } from '../../_lib/auth'
import { reportBulkCloseSchema, reportErrorResponse } from '@/lib/question-reports'

/** Mehrere Fragen gemeinsam als „Nicht übernommen“ schließen (PROJ-73). Keine Belohnung. */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }
  const parsed = reportBulkCloseSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, { status: 400 })
  }

  let closed = 0
  for (const questionId of parsed.data.question_ids) {
    const { data, error } = await auth.supabase.rpc('close_question_reports', {
      p_question_id: questionId,
      p_result: 'nicht_uebernommen',
      p_response: parsed.data.response ?? null,
      p_silent: false,
      p_report_ids: null,
    })
    if (error) {
      const res = reportErrorResponse(error)
      if (res.status >= 500) console.error('[api/admin/question-reports/bulk-close]', error)
      return NextResponse.json({ error: res.message, closed }, { status: res.status })
    }
    closed += ((data ?? {}) as { closed?: number }).closed ?? 0
  }

  if (closed > 0) {
    await writeAuditLog(auth.supabase, {
      admin_id: auth.user.id,
      action_type: 'question_reports_bulk_closed',
      object_type: 'question',
      details: { questions: parsed.data.question_ids.length, closed },
    })
  }
  return NextResponse.json({ closed })
}
