import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '@/app/api/admin/_lib/auth'
import { entnahmeSchema, fehlerAusFunktion } from '@/lib/werkzeugkiste-regal-server'
import { fehler, ungueltig } from '@/lib/werkzeugkiste-server'

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/werkzeugkiste/regal/:id/entnehmen {grund} (PROJ-53, Paket 2) —
 * der Super-Admin nimmt ein geteiltes Material aus dem Regal, z. B. bei
 * Urheberrechtsproblemen. Das Material selbst bleibt bei der Besitzerin oder dem
 * Besitzer unangetastet, die Freigabe bekommt den Vermerk (wer, wann, Grund) und
 * ist danach gesperrt. Der Vorgang steht im Änderungsprotokoll.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) return fehler('Nicht gefunden.', 404)

  const id = (await params).id
  if (!z.string().uuid().safeParse(id).success) return fehler('Diese Freigabe gibt es nicht mehr.', 404)
  const parsed = entnahmeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)

  const { error } = await auth.supabase.rpc('regal_entnehmen', { p_freigabe_id: id, p_grund: parsed.data.grund })
  if (error) return fehlerAusFunktion(error)

  await writeAuditLog(auth.supabase, {
    admin_id: auth.user.id,
    action_type: 'regal_entnommen',
    object_type: 'regal_freigabe',
    object_id: id,
    details: { grund: parsed.data.grund },
  })
  return NextResponse.json({ ok: true })
}
