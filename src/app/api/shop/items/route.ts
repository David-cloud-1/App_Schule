import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { getDepartmentOfUser } from '@/lib/departments-server'
import { NO_DEPARTMENT_ID } from '@/lib/departments'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Nur Artikel des eigenen Bereichs (PROJ-23); der Kauf selbst prüft das in
  // der Datenbankfunktion purchase_shop_item() noch einmal.
  const departmentId = (await getDepartmentOfUser(supabase, user.id))?.id ?? NO_DEPARTMENT_ID

  const [itemsResult, ownedResult, profileResult] = await Promise.all([
    supabase
      .from('shop_items')
      .select('id, name, description, icon, category, icon_key, price')
      .eq('is_active', true)
      .eq('department_id', departmentId)
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

  // "Mein Hof" shows everything the user bought — including items the admin
  // has since deactivated (PROJ-20 BUG-2). Students can only SELECT active
  // shop_items via RLS, so the owned catalogue rows come via the service
  // client, strictly scoped to this user's own purchases.
  const { data: ownedRows } = await createServiceClient()
    .from('user_shop_items')
    .select('purchased_at, shop_items(id, name, description, icon, category, icon_key)')
    .eq('user_id', user.id)
    .order('purchased_at')

  type OwnedShopItem = {
    id: string
    name: string
    description: string
    icon: string | null
    category: string
    icon_key: string
  }

  const owned_items = (ownedRows ?? [])
    .map((r) => r.shop_items as unknown as OwnedShopItem | null)
    .filter((i): i is OwnedShopItem => i != null)

  return NextResponse.json({
    items,
    owned_items,
    coin_balance: (profileResult.data?.coin_balance as number | null) ?? 0,
  })
}
