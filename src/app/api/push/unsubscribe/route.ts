import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'

const BodySchema = z.object({ endpoint: z.string().min(20).max(2048) })

/**
 * POST /api/push/unsubscribe (PROJ-18) — meldet nur dieses Gerät ab; andere
 * Geräte des Kontos bleiben. Antwort: ob danach noch ein Gerät angemeldet ist.
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
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })

  const service = createServiceClient()
  // Nur eigene Zeilen: user_id steht mit in der Bedingung
  const { error } = await service
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', parsed.data.endpoint)
  if (error) {
    console.error('[push/unsubscribe]', error.message)
    return NextResponse.json({ error: 'Abmelden fehlgeschlagen' }, { status: 500 })
  }

  const { count } = await service
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  return NextResponse.json({ enabled: (count ?? 0) > 0 })
}
