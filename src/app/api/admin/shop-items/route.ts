import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireManager, writeAuditLogStrict, auditFailedResponse, assertSingleDepartment } from '../_lib/auth'
import { lastChangesFor } from '../_lib/last-change'
import { createServiceClient } from '@/lib/supabase-server'
import { getDepartmentById } from '@/lib/departments'
import { HOF_CATEGORIES, iconKeyBelongsToCategory, type HofCategory } from '@/lib/hof-icons'
import { HOF_RARITIES, getEffectiveRarity, type HofRarity } from '@/lib/hof-rarity'

const CATEGORY_VALUES = HOF_CATEGORIES.map((c) => c.value) as [HofCategory, ...HofCategory[]]

const RARITY_VALUES = HOF_RARITIES.map((r) => r.value) as [HofRarity, ...HofRarity[]]

const CreateSchema = z.object({
  name:        z.string().min(1).max(60),
  description: z.string().min(1).max(200),
  category:    z.enum(CATEGORY_VALUES),
  icon_key:    z.string().min(1).max(60),
  price:       z.number().int().min(1),
  // null/fehlend = automatisch aus dem Preis (PROJ-32)
  rarity_override: z.enum(RARITY_VALUES).nullable().optional(),
})

export async function GET() {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const { supabase, departmentId, scopeIsAll, isSuperAdmin } = auth

  // shop_items hat zusätzlich eine öffentliche "is_active"-Lese-Policy für
  // Azubis (ohne Bereichsfilter) — ohne diesen Code-Filter sähe ein
  // Bereichs-Admin hier auch aktive Artikel anderer Bereiche (PROJ-24).
  const [itemsResult, ownedCountsResult] = await Promise.all([
    supabase
      .from('shop_items')
      .select('id, name, description, icon, category, icon_key, price, rarity_override, is_active, sort_order')
      .eq('department_id', departmentId)
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

  const lastChanges = await lastChangesFor(
    'shop_item',
    (itemsResult.data ?? []).map((item) => item.id as string)
  )

  const items = (itemsResult.data ?? []).map((item) => ({
    ...item,
    rarity: getEffectiveRarity(item.price as number, item.rarity_override as string | null),
    purchase_count: purchaseCounts.get(item.id) ?? 0,
    last_change: lastChanges.get(item.id as string) ?? null,
  }))

  // PROJ-127: Bei „Alle Bereiche“ zeigt die Seite den Hinweis, zuerst einen Bereich zu wählen
  return NextResponse.json({ items, departmentId, needsDepartment: !isSuperAdmin && scopeIsAll })
}

export async function POST(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const { supabase, user, departmentId } = auth
  const needsDepartment = assertSingleDepartment(auth)
  if (needsDepartment) return needsDepartment

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

  // Server-seitige Gegenprobe (PROJ-26): das Frontend schränkt die Icon-Auswahl
  // zwar schon auf Fachbereich + Kategorie ein, ein direkter API-Aufruf könnte
  // das aber umgehen — siehe security.md "Validate ALL user input server-side".
  const department = await getDepartmentById(supabase, departmentId)
  if (!department || !iconKeyBelongsToCategory(department.code, parsed.data.category, parsed.data.icon_key)) {
    return NextResponse.json(
      { error: 'Illustration passt nicht zur Kategorie oder zum Fachbereich' },
      { status: 400 },
    )
  }

  // Schreiben nur über diese Route mit Dienstschlüssel (PROJ-127, QA M1): Lehrkräfte
  // haben in der Datenbank kein Schreibrecht auf Items, so geht nichts ohne Protokoll.
  const service = createServiceClient()
  const { data, error } = await service
    .from('shop_items')
    .insert({ ...parsed.data, department_id: departmentId })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[POST /api/admin/shop-items]', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }

  const logged = await writeAuditLogStrict(supabase, {
    admin_id: user.id,
    action_type: 'shop_item.create',
    object_type: 'shop_item',
    object_id: data.id,
    object_label: parsed.data.name,
    details: { neu: { ...parsed.data } },
    department_id: departmentId,
  })
  if (!logged) {
    // Ohne Eintrag kein neues Item
    await service.from('shop_items').delete().eq('id', data.id)
    return auditFailedResponse()
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
