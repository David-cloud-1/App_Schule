import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '../../_lib/auth'

/** Eine eigene Zuständigkeit austragen (PROJ-48). */
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireTeacher()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data, error } = await supabase
    .from('teacher_subject_assignments')
    .delete()
    .eq('id', id)
    .eq('teacher_id', user.id)
    .select('id')
  if (error) {
    console.error('[DELETE /api/admin/my-subjects/[id]]', error)
    return NextResponse.json({ error: 'Austragen fehlgeschlagen.' }, { status: 500 })
  }
  // Keine eigene Zuständigkeit mit dieser ID (fremd oder nicht vorhanden) —
  // ehrliche Rückmeldung statt stillem "ok" ohne Wirkung (QA-Fund PROJ-48).
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
