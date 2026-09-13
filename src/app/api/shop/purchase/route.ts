import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

const BodySchema = z.object({
  item_id: z.string().uuid(),
})

// Maps the RAISE EXCEPTION message from purchase_shop_item() (see migration
// 20260913_proj19_proj20_coins_shop.sql) to an HTTP status + German message.
const ERROR_MAP: Record<string, { status: number; message: string }> = {
  not_authenticated:   { status: 401, message: 'Unauthorized' },
  item_not_found:      { status: 404, message: 'Item nicht gefunden' },
  item_inactive:       { status: 409, message: 'Dieses Item ist nicht mehr verfügbar' },
  already_owned:       { status: 409, message: 'Du besitzt dieses Item bereits' },
  insufficient_funds:  { status: 409, message: 'Nicht genug Frachtmünzen' },
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // purchase_shop_item() does the price/active/ownership check and the coin
  // deduction + ownership insert as one atomic transaction (SECURITY
  // DEFINER function) — see the PROJ-20 architecture decision to avoid a
  // check-then-write race between two concurrent purchases.
  const { data: newBalance, error } = await supabase.rpc('purchase_shop_item', {
    p_item_id: parsed.data.item_id,
  })

  if (error) {
    const known = ERROR_MAP[error.message]
    if (known) {
      return NextResponse.json({ error: known.message }, { status: known.status })
    }
    console.error('[POST /api/shop/purchase]', error)
    return NextResponse.json({ error: 'Kauf fehlgeschlagen' }, { status: 500 })
  }

  return NextResponse.json({ new_coin_balance: newBalance })
}
