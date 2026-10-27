import { NextRequest, NextResponse } from 'next/server'
import { requireContentAdmin, writeAuditLog } from '../../../_lib/auth'
import { CONTENT_TABLE, isContentType } from '@/lib/content-history'

/** Aus dem Papierkorb wiederherstellen (PROJ-47). */
export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ type: string; id: string }> }
) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { type, id } = await ctx.params
  if (!isContentType(type)) {
    return NextResponse.json({ error: 'Unbekannter Inhaltstyp' }, { status: 400 })
  }

  const { error } = await supabase.from(CONTENT_TABLE[type]).update({ deleted_at: null }).eq('id', id)
  if (error) {
    console.error('[POST /api/admin/trash/[type]/[id]]', error)
    return NextResponse.json({ error: 'Wiederherstellen fehlgeschlagen.' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: `${type}.restore_from_trash`,
    object_type: type,
    object_id: id,
  })

  return NextResponse.json({ ok: true })
}

/** Endgültig aus dem Papierkorb entfernen — nur Super-Admin (PROJ-47). */
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ type: string; id: string }> }
) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, user, isSuperAdmin } = auth

  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Nur der Super-Admin kann den Papierkorb endgültig leeren.' }, { status: 403 })
  }

  const { type, id } = await ctx.params
  if (!isContentType(type)) {
    return NextResponse.json({ error: 'Unbekannter Inhaltstyp' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from(CONTENT_TABLE[type])
    .select('deleted_at')
    .eq('id', id)
    .maybeSingle()
  if (!existing || !(existing as { deleted_at: string | null }).deleted_at) {
    return NextResponse.json({ error: 'Inhalt liegt nicht im Papierkorb.' }, { status: 400 })
  }

  const { error } = await supabase.from(CONTENT_TABLE[type]).delete().eq('id', id)
  if (error) {
    console.error('[DELETE /api/admin/trash/[type]/[id]]', error)
    return NextResponse.json({ error: 'Endgültiges Löschen fehlgeschlagen.' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: `${type}.purge`,
    object_type: type,
    object_id: id,
  })

  return NextResponse.json({ ok: true })
}
