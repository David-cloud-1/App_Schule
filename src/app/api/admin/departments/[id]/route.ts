import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'
import { DEPARTMENTS_CACHE_TAG } from '@/lib/departments-server'

const UpdateSchema = z
  .object({
    domain: z.string().min(1).max(200).nullable().optional(),
    name: z.string().min(1).max(100).optional(),
    app_name: z.string().min(1).max(60).optional(),
    tagline: z.string().max(200).optional(),
    meta_title: z.string().min(1).max(120).optional(),
    meta_description: z.string().max(300).optional(),
    icon_name: z.string().min(1).max(60).optional(),
    currency_name: z.string().min(1).max(40).optional(),
    hof_name: z.string().min(1).max(40).optional(),
    hof_short_name: z.string().min(1).max(20).optional(),
    prompt_role: z.string().min(1).max(500).optional(),
    target_group: z.string().min(1).max(200).optional(),
    prompt_notes: z.string().max(2000).nullable().optional(),
    class_levels: z.array(z.number().int().min(5).max(13)).min(1).max(6).optional(),
    pseudonym_nouns: z.array(z.string().min(1).max(30)).max(300).optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields provided' })

/** Nur Super-Admin: vollständige Bereichs-Bearbeitung (PROJ-24, E9). */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      { status: 400 }
    )
  }

  const update = { ...parsed.data }
  if (update.domain !== undefined && update.domain !== null) {
    update.domain = update.domain.toLowerCase()
  }

  const { error } = await supabase.from('departments').update(update).eq('id', id)
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Adresse wird bereits von einem anderen Bereich verwendet.' }, { status: 409 })
    }
    console.error('[PATCH /api/admin/departments/[id]]', error)
    return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
  }

  revalidateTag(DEPARTMENTS_CACHE_TAG, { expire: 0 })

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'department.update',
    object_type: 'department',
    object_id: id,
    department_id: null,
  })

  return NextResponse.json({ ok: true })
}
