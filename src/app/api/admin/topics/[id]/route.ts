import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await ctx.params

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

  const { data, error } = await supabase
    .from('topics')
    .update({ name: parsed.data.name })
    .eq('id', id)
    .select('id, name, subject_id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ein Thema mit diesem Namen existiert bereits in diesem Fach.' },
        { status: 409 }
      )
    }
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Thema nicht gefunden.' }, { status: 404 })
    }
    console.error('[PATCH /api/admin/topics/[id]]', error)
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'topic.update',
    object_type: 'topic',
    object_id: id,
    object_label: parsed.data.name,
  })

  return NextResponse.json({ topic: data })
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await ctx.params

  const { error } = await supabase.from('topics').delete().eq('id', id)
  if (error) {
    console.error('[DELETE /api/admin/topics/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'topic.delete',
    object_type: 'topic',
    object_id: id,
  })

  return NextResponse.json({ ok: true })
}
