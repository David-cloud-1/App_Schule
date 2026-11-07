import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { reportCreateSchema, reportErrorResponse } from '@/lib/question-reports'

const ROUTE = 'api/question-reports'

/** Eine Frage melden (PROJ-72). Alle Regeln prüft die Datenbank-Funktion report_question. */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }
  const parsed = reportCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('report_question', {
    p_question_id: parsed.data.question_id,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note ?? null,
    p_option_id: parsed.data.option_id ?? null,
  })
  if (error) {
    const res = reportErrorResponse(error)
    if (res.status >= 500) console.error(`[${ROUTE}]`, error)
    return NextResponse.json({ error: res.message }, { status: res.status })
  }
  return NextResponse.json({ id: data }, { status: 201 })
}

/**
 * Eigene Meldungen mit Stand und Rückmeldung (PROJ-72). Gibt bewusst keine
 * Kennung der Lehrkraft heraus.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('question_reports')
    .select(
      'id, question_id, reason, status, question_text, response_text, silent, reward_coins, feedback_read_at, created_at, closed_at',
    )
    .eq('reporter_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    console.error(`[${ROUTE}]`, error)
    return NextResponse.json({ error: 'Das hat nicht geklappt. Bitte versuche es erneut.' }, { status: 500 })
  }

  const items = (data ?? []).map((r) => ({
    ...r,
    // Ein stilles Schließen soll dem Melder nichts anzeigen
    response_text: r.silent ? null : r.response_text,
    unread:
      !r.silent && r.feedback_read_at === null && r.status !== 'offen' && r.status !== 'in_pruefung',
  }))
  return NextResponse.json({ items })
}
