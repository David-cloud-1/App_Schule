import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { isAllowedPushEndpoint, MAX_DEVICES_PER_USER } from '@/lib/push-reminder'

const BodySchema = z.object({
  subscription: z.object({
    endpoint: z.string().max(2048).refine(isAllowedPushEndpoint, 'Unbekannter Push-Dienst'),
    keys: z.object({
      p256dh: z.string().min(20).max(256),
      auth: z.string().min(8).max(128),
    }),
  }),
})

/**
 * POST /api/push/subscribe (PROJ-18) — meldet dieses Gerät für Erinnerungen an.
 * Die Adresse muss zu einem bekannten Push-Dienst gehören, sonst könnte der
 * Versand-Job später auf fremde Ziele zeigen (SSRF).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Anmeldung', details: parsed.error.issues.map((i) => i.message) }, { status: 400 })
  }
  const { endpoint, keys } = parsed.data.subscription

  const service = createServiceClient()

  // Derselbe Endpunkt gehört genau einem Konto: wer sich auf einem geteilten Gerät
  // neu anmeldet, übernimmt es (der Browser vergibt je Gerät und Adresse nur einen).
  const { error } = await service
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, created_at: new Date().toISOString() },
      { onConflict: 'endpoint' },
    )
  if (error) {
    console.error('[push/subscribe]', error.message)
    return NextResponse.json({ error: 'Anmeldung konnte nicht gespeichert werden' }, { status: 500 })
  }

  // Wer wieder einschaltet, startet beim Abklingen von vorn
  await service
    .from('push_reminder_state')
    .upsert({ user_id: user.id, ignored_in_a_row: 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  // Geräte-Obergrenze: das älteste fliegt raus
  const { data: devices } = await service
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  const overflow = (devices ?? []).slice(MAX_DEVICES_PER_USER).map((d) => d.id as string)
  if (overflow.length > 0) await service.from('push_subscriptions').delete().in('id', overflow)

  return NextResponse.json({ enabled: true })
}
