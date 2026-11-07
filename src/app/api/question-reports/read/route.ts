import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { reportErrorResponse, reportReadSchema } from '@/lib/question-reports'

/** Rückmeldungen als gelesen markieren (PROJ-72/73). Nur die eigenen. */
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
  const parsed = reportReadSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('mark_question_reports_read', { p_ids: parsed.data.ids })
  if (error) {
    const res = reportErrorResponse(error)
    return NextResponse.json({ error: res.message }, { status: res.status })
  }
  return NextResponse.json({ marked: data })
}
