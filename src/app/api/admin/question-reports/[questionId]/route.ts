import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../_lib/auth'

/**
 * Einzelmeldungen zu einer Frage (PROJ-73) für das Aufklappen in der Inbox.
 * Der Melder bleibt bewusst unsichtbar: Lehrkräfte brauchen Grund und Text,
 * keine Namen.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const { questionId } = await params
  if (!z.string().uuid().safeParse(questionId).success) {
    return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
  }

  const { data, error } = await auth.supabase
    .from('question_reports')
    .select('id, reason, note, chosen_option_text, status, created_at, closed_at, response_text, silent, reward_coins')
    .eq('question_id', questionId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    console.error('[api/admin/question-reports/[questionId]]', error)
    return NextResponse.json({ error: 'Das hat nicht geklappt. Bitte versuche es erneut.' }, { status: 500 })
  }
  return NextResponse.json({ items: data ?? [] })
}
