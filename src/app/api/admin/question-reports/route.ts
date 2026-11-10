import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireContentAdmin } from '../_lib/auth'
import { REPORT_REASONS } from '@/lib/question-reports'

const ROUTE = 'api/admin/question-reports'
const PAGE_SIZE = 25

const querySchema = z.object({
  status: z.enum(['offen', 'korrigiert', 'nicht_uebernommen', 'entfaellt', 'alle']).default('offen'),
  department: z.string().uuid().optional(),
  subject: z.string().uuid().optional(),
  topic: z.string().uuid().optional(),
  reason: z.enum(REPORT_REASONS).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
})

/**
 * Inbox der gemeldeten Fragen (PROJ-73): gebündelt je Frage und Status,
 * serverseitig gefiltert und seitenweise. Gelesen wird über die Ansicht
 * question_report_groups, die den Zeilenschutz des Aufrufers beachtet.
 */
export async function GET(request: NextRequest) {
  // Bereich = Bereichsleiste (PROJ-70), wie auf den übrigen Inhalts-Seiten
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error

  const params: Record<string, string> = {}
  request.nextUrl.searchParams.forEach((value, key) => {
    if (value !== '') params[key] = value
  })
  const parsed = querySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, { status: 400 })
  }
  const q = parsed.data

  let query = auth.supabase
    .from('question_report_groups')
    .select('*', { count: 'exact' })
    .order('report_count', { ascending: false })
    .order('oldest_at', { ascending: true })
    .range((q.page - 1) * PAGE_SIZE, q.page * PAGE_SIZE - 1)

  if (q.status === 'offen') query = query.in('status', ['offen', 'in_pruefung'])
  else if (q.status !== 'alle') query = query.eq('status', q.status)
  if (q.department) query = query.eq('department_id', q.department)
  else if (auth.scopeDepartmentIds) query = query.in('department_id', auth.scopeDepartmentIds)
  if (q.subject) query = query.eq('subject_id', q.subject)
  if (q.topic) query = query.eq('topic_id', q.topic)
  if (q.reason) query = query.contains('reasons', [q.reason])

  const { data, error, count } = await query
  if (error) {
    console.error(`[${ROUTE}]`, error)
    return NextResponse.json({ error: 'Das hat nicht geklappt. Bitte versuche es erneut.' }, { status: 500 })
  }

  const items = (data ?? []).map((g) => ({
    ...g,
    // „Seit der Meldung geändert“: Eine Korrektur lag nach der ältesten Meldung
    changed_since_report:
      !!g.last_changed_at && !!g.oldest_at && new Date(g.last_changed_at).getTime() > new Date(g.oldest_at).getTime(),
    claimed_by_me: g.handled_by === auth.user.id,
  }))
  return NextResponse.json({ items, total: count ?? 0, page: q.page, pageSize: PAGE_SIZE })
}
