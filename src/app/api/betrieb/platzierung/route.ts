import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { istImLand, landSeite } from '@/lib/betrieb-land'

/**
 * Items in „Mein Betrieb" setzen, verschieben und zurücklegen (PROJ-34).
 *
 *   PUT    /api/betrieb/platzierung        { item_id, x, y }  → setzen oder verschieben
 *   DELETE /api/betrieb/platzierung?item_id=…                 → zurück ins Lager
 *
 * Geprüft wird hier (Service-Rolle, es gibt keine Schreib-Policies):
 * angemeldet · Item gehört dem Nutzer · Kachel liegt im aktuellen Land.
 * Doppelbelegung verhindert zusätzlich die Datenbank (UNIQUE user_id, x, y).
 */

const PutSchema = z.object({
  item_id: z.string().uuid(),
  x: z.number().int().min(0).max(9),
  y: z.number().int().min(0).max(9),
})

const UNIQUE_VIOLATION = '23505'

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = PutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', code: 'invalid' }, { status: 400 })
  }
  const { item_id, x, y } = parsed.data

  const service = createServiceClient()
  const { data: kaeufe, error: kaufFehler } = await service
    .from('user_shop_items')
    .select('item_id')
    .eq('user_id', user.id)
    .limit(500)
  if (kaufFehler) {
    console.error('[PUT /api/betrieb/platzierung] kaeufe:', kaufFehler)
    return NextResponse.json({ error: 'Failed to place item' }, { status: 500 })
  }

  const gehoert = (kaeufe ?? []).some((k) => k.item_id === item_id)
  if (!gehoert) {
    return NextResponse.json({ error: 'Item nicht gefunden', code: 'not_owned' }, { status: 404 })
  }

  const seite = landSeite((kaeufe ?? []).length)
  if (!istImLand(x, y, seite)) {
    return NextResponse.json({ error: 'Diese Kachel gehört noch nicht zu deinem Land', code: 'outside_land' }, { status: 400 })
  }

  const { error } = await service
    .from('betrieb_platzierungen')
    .upsert({ user_id: user.id, item_id, x, y }, { onConflict: 'user_id,item_id' })

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'Auf dieser Kachel steht schon etwas', code: 'tile_taken' }, { status: 409 })
    }
    console.error('[PUT /api/betrieb/platzierung]', error)
    return NextResponse.json({ error: 'Failed to place item' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = z.string().uuid().safeParse(request.nextUrl.searchParams.get('item_id'))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid item_id', code: 'invalid' }, { status: 400 })
  }

  // Nur die eigene Zeile; ein fremdes oder nicht gesetztes Item ist ein No-Op (idempotent).
  const { error } = await createServiceClient()
    .from('betrieb_platzierungen')
    .delete()
    .eq('user_id', user.id)
    .eq('item_id', parsed.data)

  if (error) {
    console.error('[DELETE /api/betrieb/platzierung]', error)
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
