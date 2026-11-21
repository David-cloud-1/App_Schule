import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/push/decline (PROJ-18) — „Nein danke“ auf der Opt-in-Karte.
 * Merkt Zeitpunkt und Anzahl; die Karte kommt nach 14 Tagen höchstens einmal
 * wieder (Regel in `shouldShowOptInCard`).
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: current, error: readError } = await service
    .from('push_reminder_state')
    .select('decline_count')
    .eq('user_id', user.id)
    .maybeSingle()
  if (readError) {
    console.error('[push/decline]', readError.message)
    return NextResponse.json({ error: 'Konnte nicht gespeichert werden' }, { status: 500 })
  }

  const now = new Date().toISOString()
  const { error } = await service.from('push_reminder_state').upsert(
    {
      user_id: user.id,
      declined_at: now,
      decline_count: ((current?.decline_count as number | undefined) ?? 0) + 1,
      updated_at: now,
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    console.error('[push/decline]', error.message)
    return NextResponse.json({ error: 'Konnte nicht gespeichert werden' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
