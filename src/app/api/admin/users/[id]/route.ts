import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

const UpdateSchema = z.object({
  banned: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  if (id === user.id) {
    return NextResponse.json(
      { error: 'Du kannst dich nicht selbst sperren.' },
      { status: 400 }
    )
  }

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

  const service = createServiceClient()
  const banDuration = parsed.data.banned ? '876000h' : 'none'

  const { error } = await service.auth.admin.updateUserById(id, {
    ban_duration: banDuration,
  })

  if (error) {
    console.error('[PATCH /api/admin/users/:id]', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: parsed.data.banned ? 'user.ban' : 'user.unban',
    object_type: 'user',
    object_id: id,
  })

  return NextResponse.json({ ok: true })
}
