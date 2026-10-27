import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../../_lib/auth'
import { isContentType } from '@/lib/content-history'

const BodySchema = z.object({
  version_number: z.number().int().min(1),
})

/**
 * Setzt einen Inhalt auf eine ältere Version zurück. Das ist selbst eine
 * Änderung (change_type 'restored' in der Datenbank-Funktion
 * restore_content_version) — nichts wird überschrieben, es entsteht eine
 * neue Version, die sich genauso wieder zurücknehmen lässt.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ type: string; id: string }> }
) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { type, id } = await ctx.params
  if (!isContentType(type)) {
    return NextResponse.json({ error: 'Unbekannter Inhaltstyp' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { error } = await supabase.rpc('restore_content_version', {
    p_content_type: type,
    p_content_id: id,
    p_version_number: parsed.data.version_number,
  })

  if (error) {
    console.error('[POST .../restore]', error)
    if (error.message?.includes('nicht berechtigt')) {
      return NextResponse.json({ error: 'Nicht berechtigt.' }, { status: 403 })
    }
    if (error.message?.includes('Version nicht gefunden')) {
      return NextResponse.json({ error: 'Version nicht gefunden.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Wiederherstellen fehlgeschlagen.' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: `${type}.restore`,
    object_type: type,
    object_id: id,
    details: { restored_version: parsed.data.version_number },
  })

  return NextResponse.json({ ok: true })
}
