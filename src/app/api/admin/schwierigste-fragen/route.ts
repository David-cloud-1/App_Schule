import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireContentAdmin } from '../_lib/auth'
import { MIN_ATTEMPTS_LOWEST, changedAfterAnswers } from '@/lib/difficulty'

const ROUTE = 'api/admin/schwierigste-fragen'
const TEXT_MAX = 200

const querySchema = z.object({
  class_level: z.coerce.number().int().refine((n) => [10, 11, 12].includes(n)).optional(),
  days: z.coerce.number().int().refine((n) => n === 30 || n === 90).optional(),
})

/**
 * Auswertung „Schwierigste Fragen“ (PROJ-74). Die Zahlen rechnet die
 * Datenbank-Funktion question_difficulty_stats aus (nur Summen, keine
 * Personen). Der Bereich folgt der Bereichsleiste (PROJ-70). Nur Fragen mit
 * Antworten gehen an den Browser; Mindestanzahl und Ranking passieren dort.
 * Personenbeziehbares (Zeitpunkt der ersten Antwort, Wahl bei sehr wenigen
 * Antworten) bleibt auf dem Server.
 */
export async function GET(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error

  const params: Record<string, string> = {}
  request.nextUrl.searchParams.forEach((value, key) => {
    if (value !== '') params[key] = value
  })
  const parsed = querySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
  }

  const { data, error } = await auth.supabase.rpc('question_difficulty_stats', {
    p_department_ids: auth.scopeDepartmentIds,
    p_class_level: parsed.data.class_level ?? null,
    p_days: parsed.data.days ?? null,
    p_subject_id: null,
  })
  if (error) {
    console.error(`[${ROUTE}]`, error)
    return NextResponse.json({ error: 'Das hat nicht geklappt. Bitte versuche es erneut.' }, { status: 500 })
  }

  type StatRow = Record<string, unknown> & {
    attempts: number
    question_text: string
    last_changed_at: string | null
    first_counted_at: string | null
  }
  const rows = (data ?? []) as StatRow[]
  const withAnswers = rows.filter((r) => r.attempts > 0)
  // Datenschutz (QA PROJ-74 B2): kein Zeitstempel einzelner Antworten an den Browser, und
  // bei sehr wenigen Antworten keine gewählte falsche Antwort – sonst wird eine Person erkennbar.
  const items = withAnswers.map(({ first_counted_at, ...r }) => {
    const few = r.attempts < MIN_ATTEMPTS_LOWEST
    return {
      ...r,
      question_text: r.question_text.length > TEXT_MAX ? `${r.question_text.slice(0, TEXT_MAX)}…` : r.question_text,
      changed_after_answers: changedAfterAnswers({ last_changed_at: r.last_changed_at, first_counted_at }),
      ...(few ? { top_wrong_option_text: null, top_wrong_count: 0 } : {}),
    }
  })
  return NextResponse.json({ items, totalQuestions: rows.length })
}
