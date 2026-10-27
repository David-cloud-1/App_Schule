import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'

/** Eine Zuständigkeit entfernen — nur der Super-Admin (PROJ-48 AC). */
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user, isSuperAdmin } = auth

  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Nur der Super-Admin kann Zuständigkeiten entfernen.' }, { status: 403 })
  }

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: existing } = await supabase
    .from('teacher_subject_assignments')
    .select('teacher_id, department_id, subject_id')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { error } = await supabase.from('teacher_subject_assignments').delete().eq('id', id)
  if (error) {
    console.error('[DELETE /api/admin/teacher-assignments/[id]]', error)
    return NextResponse.json({ error: 'Entfernen fehlgeschlagen.' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'teacher_assignment.remove',
    object_type: 'teacher_subject_assignment',
    object_id: id,
    details: existing,
  })

  return NextResponse.json({ ok: true })
}
