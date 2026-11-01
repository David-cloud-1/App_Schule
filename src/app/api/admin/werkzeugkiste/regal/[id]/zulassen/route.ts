import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '@/app/api/admin/_lib/auth'
import { fehlerAusFunktion } from '@/lib/werkzeugkiste-regal-server'
import { fehler } from '@/lib/werkzeugkiste-server'

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/werkzeugkiste/regal/:id/zulassen (PROJ-53, Paket 2) — der
 * Super-Admin hebt die Sperre nach einer Entnahme auf. Die gesperrte Freigabe
 * wird gelöscht; die Besitzerin oder der Besitzer kann das Material danach
 * neu teilen. Der Vorgang steht im Änderungsprotokoll.
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) return fehler('Nicht gefunden.', 404)

  const id = (await params).id
  if (!z.string().uuid().safeParse(id).success) return fehler('Diese Freigabe gibt es nicht mehr.', 404)

  const { error } = await auth.supabase.rpc('regal_wieder_zulassen', { p_freigabe_id: id })
  if (error) return fehlerAusFunktion(error)

  await writeAuditLog(auth.supabase, {
    admin_id: auth.user.id,
    action_type: 'regal_wieder_zugelassen',
    object_type: 'regal_freigabe',
    object_id: id,
  })
  return NextResponse.json({ ok: true })
}
