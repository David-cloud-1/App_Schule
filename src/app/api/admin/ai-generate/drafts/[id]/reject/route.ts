import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, writeAuditLog } from '../../../../_lib/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await params

  const { data: draft } = await supabase
    .from('questions_draft')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!draft) {
    return NextResponse.json({ error: 'Entwurf nicht gefunden.' }, { status: 404 })
  }

  if (draft.status === 'accepted') {
    return NextResponse.json(
      { error: 'Bereits akzeptierte Entwürfe können nicht abgelehnt werden.' },
      { status: 409 }
    )
  }

  await supabase.from('questions_draft').update({ status: 'rejected' }).eq('id', id)

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'draft.reject',
    object_type: 'questions_draft',
    object_id: id,
  })

  return NextResponse.json({ success: true })
}
