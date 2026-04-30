import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'

const BulkIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
})

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BulkIdsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { ids } = parsed.data
  const { error } = await supabase.from('questions').delete().in('id', ids)
  if (error) {
    console.error('[DELETE /api/admin/questions/bulk]', error)
    return NextResponse.json({ error: 'Bulk delete failed' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'question.bulk_delete',
    object_type: 'question',
    object_id: ids[0],
    object_label: `${ids.length} Fragen`,
  })

  return NextResponse.json({ ok: true, deleted: ids.length })
}

const BulkUpdateSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(200),
    topic_id: z.string().uuid().nullable().optional(),
    difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
    is_active: z.boolean().optional(),
    class_level: z.union([z.literal(10), z.literal(11), z.literal(12), z.null()]).optional(),
    subject_id: z.string().uuid().optional(),
  })
  .refine(
    (val) =>
      val.topic_id !== undefined ||
      val.difficulty !== undefined ||
      val.is_active !== undefined ||
      val.class_level !== undefined ||
      val.subject_id !== undefined,
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

  const { ids, topic_id, difficulty, is_active, class_level, subject_id } = parsed.data

  // Update direct fields on questions table
  const update: Record<string, unknown> = {}
  if (topic_id !== undefined) update.topic_id = topic_id
  if (difficulty !== undefined) update.difficulty = difficulty
  if (is_active !== undefined) update.is_active = is_active
  if (class_level !== undefined) update.class_level = class_level

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from('questions').update(update).in('id', ids)
    if (error) {
      console.error('[PATCH /api/admin/questions/bulk] questions update', error)
      return NextResponse.json({ error: 'Bulk update failed' }, { status: 500 })
    }
  }

  // Replace subject links if a subject was selected
  if (subject_id) {
    const { error: delErr } = await supabase
      .from('question_subjects')
      .delete()
      .in('question_id', ids)
    if (delErr) {
      console.error('[PATCH /api/admin/questions/bulk] subject delete', delErr)
      return NextResponse.json({ error: 'Bulk subject update failed' }, { status: 500 })
    }
    const linkRows = ids.map((id) => ({ question_id: id, subject_id }))
    const { error: insErr } = await supabase.from('question_subjects').insert(linkRows)
    if (insErr) {
      console.error('[PATCH /api/admin/questions/bulk] subject insert', insErr)
      return NextResponse.json({ error: 'Bulk subject update failed' }, { status: 500 })
    }
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
