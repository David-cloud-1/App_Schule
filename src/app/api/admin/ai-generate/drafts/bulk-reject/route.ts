import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../../_lib/auth'

const BulkRejectSchema = z.object({
  draft_ids: z.array(z.string().uuid()).min(1).max(200),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON' }, { status: 400 })
  }

  const parsed = BulkRejectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Daten', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { draft_ids } = parsed.data

  const { error } = await supabase
    .from('questions_draft')
    .update({ status: 'rejected' })
    .in('id', draft_ids)
    .not('status', 'eq', 'accepted') // never reject already-accepted drafts

  if (error) {
    console.error('[POST /api/admin/ai-generate/drafts/bulk-reject]', error)
    return NextResponse.json({ error: 'Ablehnen fehlgeschlagen.' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'draft.bulk_reject',
    object_type: 'questions_draft',
    details: { count: draft_ids.length },
  })

  return NextResponse.json({ rejected: draft_ids.length })
}
