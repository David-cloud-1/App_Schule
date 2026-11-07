import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../_lib/auth'
import { reportCloseSchema, reportErrorResponse } from '@/lib/question-reports'

/**
 * Meldungen einer Frage abschließen (PROJ-73). Belohnung, Gelesen-Marker und
 * Verweis auf den Änderungsverlauf setzt die Datenbank-Funktion
 * close_question_reports in einem Schritt.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const { questionId } = await params
  if (!z.string().uuid().safeParse(questionId).success) {
    return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }
  const parsed = reportCloseSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, { status: 400 })
  }
  const body = parsed.data

  const { data, error } = await auth.supabase.rpc('close_question_reports', {
    p_question_id: questionId,
    p_result: body.result,
    p_response: body.response ?? null,
    p_silent: body.silent ?? false,
    p_report_ids: body.report_ids ?? null,
  })
  if (error) {
    const res = reportErrorResponse(error)
    if (res.status >= 500) console.error('[api/admin/question-reports/close]', error)
    return NextResponse.json({ error: res.message }, { status: res.status })
  }

  const result = (data ?? { closed: 0, rewarded: 0 }) as { closed: number; rewarded: number }
  if (result.closed > 0) {
    await writeAuditLog(auth.supabase, {
      admin_id: auth.user.id,
      action_type: 'question_reports_closed',
      object_type: 'question',
      object_id: questionId,
      details: { result: body.result, closed: result.closed, rewarded: result.rewarded, silent: body.silent ?? false },
    })
  }
  return NextResponse.json(result)
}
