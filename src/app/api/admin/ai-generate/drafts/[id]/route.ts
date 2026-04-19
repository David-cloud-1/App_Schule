import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../../_lib/auth'

const UpdateDraftSchema = z.object({
  question_text: z.string().min(1).max(1000).optional(),
  options: z.array(z.string().min(1).max(500)).length(4).optional(),
  correct_index: z.number().int().min(0).max(3).optional(),
  explanation: z.string().max(2000).nullable().optional(),
  subject_code: z.enum(['BGP', 'KSK', 'STG', 'LOP']).nullable().optional(),
  difficulty: z.enum(['leicht', 'mittel', 'schwer']).nullable().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON' }, { status: 400 })
  }

  const parsed = UpdateDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Daten', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from('questions_draft')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Entwurf nicht gefunden.' }, { status: 404 })
  }

  if (existing.status === 'accepted' || existing.status === 'rejected') {
    return NextResponse.json(
      { error: 'Bereits entschiedene Entwürfe können nicht bearbeitet werden.' },
      { status: 409 }
    )
  }

  const updates: Record<string, unknown> = { ...parsed.data }
  // If review_required and user edits, downgrade to pending so they can accept
  if (existing.status === 'review_required' && Object.keys(updates).length > 0) {
    updates.status = 'pending'
  }

  const { data, error } = await supabase
    .from('questions_draft')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[PUT /api/admin/ai-generate/drafts/[id]]', error)
    return NextResponse.json({ error: 'Entwurf konnte nicht aktualisiert werden.' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'draft.edit',
    object_type: 'questions_draft',
    object_id: id,
  })

  return NextResponse.json({ draft: data })
}
