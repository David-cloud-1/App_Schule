import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [itemsResult, ownedResult, profileResult] = await Promise.all([
    supabase
      .from('shop_items')
      .select('id, name, description, icon, price')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('user_shop_items')
      .select('item_id')
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', user.id)
      .single(),
  ])

  if (itemsResult.error) {
    console.error('[GET /api/shop/items] items:', itemsResult.error)
    return NextResponse.json({ error: 'Failed to load shop items' }, { status: 500 })
  }

  const ownedIds = new Set((ownedResult.data ?? []).map((r) => r.item_id as string))

  const items = (itemsResult.data ?? []).map((item) => ({
    ...item,
    owned: ownedIds.has(item.id),
  }))

  return NextResponse.json({
    items,
    coin_balance: (profileResult.data?.coin_balance as number | null) ?? 0,
  })
}
