import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'

const UpdateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(10).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: 'No fields provided',
  })

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
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
      { status: 400 }
    )
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) update.name = parsed.data.name
  if (parsed.data.code !== undefined) update.code = parsed.data.code.toUpperCase()

  // Deactivation guard: only allow if no active questions
  if (parsed.data.is_active === false) {
    const { data: links } = await supabase
      .from('question_subjects')
      .select('questions ( is_active )')
      .eq('subject_id', id)

    const activeCount = (
      (links ?? []) as unknown as { questions: { is_active: boolean } | null }[]
    ).filter((l) => l.questions?.is_active === true).length

    if (activeCount > 0) {
      return NextResponse.json(
        {
          error: `Fach hat noch ${activeCount} aktive Fragen. Bitte Fragen zuerst deaktivieren.`,
        },
        { status: 409 }
      )
    }
  }

  if (parsed.data.is_active !== undefined) {
    update.is_active = parsed.data.is_active
  }

  const { error } = await supabase.from('subjects').update(update).eq('id', id)
  if (error) {
    // `is_active` column may not exist yet — return a clear error
    const msg = typeof error.message === 'string' ? error.message : 'Failed to update subject'
    console.error('[PATCH subject]', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type:
      parsed.data.is_active !== undefined && Object.keys(parsed.data).length === 1
        ? parsed.data.is_active
          ? 'subject.activate'
          : 'subject.deactivate'
        : 'subject.update',
    object_type: 'subject',
    object_id: id,
  })

  return NextResponse.json({ ok: true })
}
