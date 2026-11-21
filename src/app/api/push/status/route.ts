import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * GET /api/push/status (PROJ-18) — Stand der Erinnerungen des eigenen Kontos:
 * ob mindestens ein Gerät angemeldet ist und wie es um die Opt-in-Karte steht.
 * Die Tabellen sind nur für die Service-Rolle lesbar; die Anmeldung prüfen wir hier.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const [subs, state] = await Promise.all([
    service.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    service.from('push_reminder_state').select('declined_at, decline_count').eq('user_id', user.id).maybeSingle(),
  ])
  if (subs.error || state.error) {
    console.error('[push/status]', subs.error?.message ?? state.error?.message)
    return NextResponse.json({ error: 'Status konnte nicht geladen werden' }, { status: 500 })
  }

  return NextResponse.json(
    {
      enabled: (subs.count ?? 0) > 0,
      declined_at: (state.data?.declined_at as string | null | undefined) ?? null,
      decline_count: (state.data?.decline_count as number | undefined) ?? 0,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
