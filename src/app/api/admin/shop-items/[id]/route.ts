import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'

const UpdateSchema = z
  .object({
    name:        z.string().min(1).max(60).optional(),
    description: z.string().min(1).max(200).optional(),
    icon:        z.string().min(1).max(8).optional(),
    price:       z.number().int().min(1).optional(),
    is_active:   z.boolean().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: 'No fields provided',
  })

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Note: a price change here only affects future purchases — past rows in
  // user_shop_items keep the price_paid they were bought at (PROJ-20 spec).
  const { error } = await supabase.from('shop_items').update(parsed.data).eq('id', id)

  if (error) {
    console.error('[PATCH /api/admin/shop-items/[id]]', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type:
      parsed.data.is_active !== undefined && Object.keys(parsed.data).length === 1
        ? parsed.data.is_active
          ? 'shop_item.activate'
          : 'shop_item.deactivate'
        : 'shop_item.update',
    object_type: 'shop_item',
    object_id: id,
  })

  return NextResponse.json({ ok: true })
}
