import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { baueBetriebStand, type KaufZeile, type PlatzierungsZeile } from '@/lib/betrieb-stand'

/**
 * GET /api/betrieb – Stand von „Mein Betrieb" (PROJ-34): Land, Items, Lager.
 *
 * Alle Käufe kommen über die Service-Rolle, weil Azubis deaktivierte Items nicht
 * mehr per RLS lesen dürfen, sie aber weiter besitzen und setzen können (wie in
 * PROJ-20 BUG-2). Strikt auf die eigenen Käufe des angemeldeten Nutzers begrenzt.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const [kaeufe, platz] = await Promise.all([
    service
      .from('user_shop_items')
      .select('purchased_at, shop_items(id, name, description, icon, category, icon_key, price, rarity_override)')
      .eq('user_id', user.id)
      .order('purchased_at')
      .limit(500),
    service.from('betrieb_platzierungen').select('item_id, x, y').eq('user_id', user.id).limit(500),
  ])

  if (kaeufe.error || platz.error) {
    console.error('[GET /api/betrieb]', kaeufe.error ?? platz.error)
    return NextResponse.json({ error: 'Failed to load Betrieb' }, { status: 500 })
  }

  return NextResponse.json(
    baueBetriebStand(
      (kaeufe.data ?? []) as unknown as KaufZeile[],
      (platz.data ?? []) as unknown as PlatzierungsZeile[],
    ),
  )
}
