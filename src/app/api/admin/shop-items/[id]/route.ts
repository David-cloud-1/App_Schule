import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog, assertCanAdminDepartment } from '../../_lib/auth'
import { getDepartmentById } from '@/lib/departments'
import { HOF_CATEGORIES, iconKeyBelongsToCategory, type HofCategory } from '@/lib/hof-icons'
import { HOF_RARITIES, type HofRarity } from '@/lib/hof-rarity'

const CATEGORY_VALUES = HOF_CATEGORIES.map((c) => c.value) as [HofCategory, ...HofCategory[]]

const RARITY_VALUES = HOF_RARITIES.map((r) => r.value) as [HofRarity, ...HofRarity[]]

const UpdateSchema = z
  .object({
    name:        z.string().min(1).max(60).optional(),
    description: z.string().min(1).max(200).optional(),
    category:    z.enum(CATEGORY_VALUES).optional(),
    icon_key:    z.string().min(1).max(60).optional(),
    price:       z.number().int().min(1).optional(),
    // null = zurück auf automatisch (PROJ-32)
    rarity_override: z.enum(RARITY_VALUES).nullable().optional(),
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

  const { data: existing } = await supabase
    .from('shop_items')
    .select('department_id, category, icon_key')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const forbidden = assertCanAdminDepartment(auth, existing.department_id as string)
  if (forbidden) return forbidden

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

  // Server-seitige Gegenprobe (PROJ-26), auch wenn nur eines der beiden
  // Felder im Request steht — das jeweils andere kommt dann vom Bestand.
  if (parsed.data.category !== undefined || parsed.data.icon_key !== undefined) {
    const finalCategory = parsed.data.category ?? (existing.category as string)
    const finalIconKey = parsed.data.icon_key ?? (existing.icon_key as string)
    const department = await getDepartmentById(supabase, existing.department_id as string)
    if (
      !department ||
      !iconKeyBelongsToCategory(department.code, finalCategory as HofCategory, finalIconKey)
    ) {
      return NextResponse.json(
        { error: 'Illustration passt nicht zur Kategorie oder zum Fachbereich' },
        { status: 400 },
      )
    }
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
