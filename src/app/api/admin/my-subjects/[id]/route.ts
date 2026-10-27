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

  const { error } = await supabase
    .from('teacher_subject_assignments')
    .delete()
    .eq('id', id)
    .eq('teacher_id', user.id)
  if (error) {
    console.error('[DELETE /api/admin/my-subjects/[id]]', error)
    return NextResponse.json({ error: 'Austragen fehlgeschlagen.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
