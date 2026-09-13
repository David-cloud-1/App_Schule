import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../_lib/auth'

const CreateSchema = z.object({
  name:        z.string().min(1).max(60),
  description: z.string().min(1).max(200),
  icon:        z.string().min(1).max(8),
  price:       z.number().int().min(1),
})

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const [itemsResult, ownedCountsResult] = await Promise.all([
    supabase
      .from('shop_items')
      .select('id, name, description, icon, price, is_active, sort_order')
      .order('sort_order'),
    supabase.from('user_shop_items').select('item_id'),
  ])

  if (itemsResult.error) {
    console.error('[GET /api/admin/shop-items]', itemsResult.error)
    return NextResponse.json({ error: 'Failed to load shop items' }, { status: 500 })
  }

  const purchaseCounts = new Map<string, number>()
  for (const row of ownedCountsResult.data ?? []) {
    const id = row.item_id as string
    purchaseCounts.set(id, (purchaseCounts.get(id) ?? 0) + 1)
  }

  const items = (itemsResult.data ?? []).map((item) => ({
    ...item,
    purchase_count: purchaseCounts.get(item.id) ?? 0,
  }))

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('shop_items')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[POST /api/admin/shop-items]', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'shop_item.create',
    object_type: 'shop_item',
    object_id: data.id,
    object_label: parsed.data.name,
  })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
