import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { requireAdmin, writeAuditLog } from '../_lib/auth'
import { DEPARTMENT_COLUMNS, mapDepartment, type Department } from '@/lib/departments'
import { DEPARTMENTS_CACHE_TAG } from '@/lib/departments-server'

const CreateSchema = z.object({
  code: z.string().regex(/^[A-Z]{2,10}$/, 'Nur Großbuchstaben, 2–10 Zeichen.'),
  slug: z.string().regex(/^[a-z0-9-]{2,30}$/, 'Nur Kleinbuchstaben, Ziffern, Bindestrich.'),
  domain: z.string().min(1).max(200).nullable().optional(),
  name: z.string().min(1).max(100),
  app_name: z.string().min(1).max(60),
  tagline: z.string().max(200).optional(),
  meta_title: z.string().min(1).max(120),
  meta_description: z.string().max(300).optional(),
  icon_name: z.string().min(1).max(60).optional(),
  currency_name: z.string().min(1).max(40),
  hof_name: z.string().min(1).max(40),
  hof_short_name: z.string().min(1).max(20).optional(),
  prompt_role: z.string().min(1).max(500),
  target_group: z.string().min(1).max(200),
  class_levels: z.array(z.number().int().min(5).max(13)).min(1).max(6).optional(),
  pseudonym_nouns: z.array(z.string().min(1).max(30)).max(300).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

/** Nur Super-Admin: Fachbereiche anlegen/verwalten (PROJ-24, E9). */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await auth.supabase
    .from('departments')
    .select(DEPARTMENT_COLUMNS)
    .order('sort_order')
    .order('created_at')

  if (error) {
    console.error('[GET /api/admin/departments]', error)
    return NextResponse.json({ error: 'Fachbereiche konnten nicht geladen werden.' }, { status: 500 })
  }

  const departments: Department[] = (data ?? []).map((row) =>
    mapDepartment(row as Parameters<typeof mapDepartment>[0])
  )
  return NextResponse.json({ departments })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('departments')
    .insert({
      code: parsed.data.code,
      slug: parsed.data.slug,
      domain: parsed.data.domain?.toLowerCase() ?? null,
      name: parsed.data.name,
      app_name: parsed.data.app_name,
      tagline: parsed.data.tagline ?? '',
      meta_title: parsed.data.meta_title,
      meta_description: parsed.data.meta_description ?? '',
      icon_name: parsed.data.icon_name ?? 'GraduationCap',
      currency_name: parsed.data.currency_name,
      hof_name: parsed.data.hof_name,
      hof_short_name: parsed.data.hof_short_name ?? parsed.data.hof_name,
      prompt_role: parsed.data.prompt_role,
      target_group: parsed.data.target_group,
      class_levels: parsed.data.class_levels ?? [10, 11, 12],
      pseudonym_nouns: parsed.data.pseudonym_nouns ?? [],
      sort_order: parsed.data.sort_order ?? 0,
      is_active: parsed.data.is_active ?? true,
    })
    .select('id')
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Kürzel, Slug oder Adresse existiert bereits.' }, { status: 409 })
    }
    console.error('[POST /api/admin/departments]', error)
    return NextResponse.json({ error: 'Fachbereich konnte nicht angelegt werden.' }, { status: 500 })
  }

  revalidateTag(DEPARTMENTS_CACHE_TAG, { expire: 0 })

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'department.create',
    object_type: 'department',
    object_id: data.id,
    object_label: parsed.data.name,
    department_id: null,
  })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
