import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'

const BulkUpdateSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(200),
    topic_id: z.string().uuid().nullable().optional(),
    difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (val) =>
      val.topic_id !== undefined || val.difficulty !== undefined || val.is_active !== undefined,
    { message: 'At least one field to update must be provided' }
  )

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BulkUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { ids, topic_id, difficulty, is_active } = parsed.data

  const update: Record<string, unknown> = {}
  if (topic_id !== undefined) update.topic_id = topic_id
  if (difficulty !== undefined) update.difficulty = difficulty
  if (is_active !== undefined) update.is_active = is_active

  const { error } = await supabase.from('questions').update(update).in('id', ids)

  if (error) {
    console.error('[PATCH /api/admin/questions/bulk]', error)
    return NextResponse.json({ error: 'Bulk update failed' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'question.bulk_update',
    object_type: 'question',
    object_id: ids[0],
    object_label: `${ids.length} Fragen`,
  })

  return NextResponse.json({ ok: true, updated: ids.length })
}
