import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { idSchema } from '@/lib/werkzeugkiste-links-server'
import { fehlerAusFunktion } from '@/lib/werkzeugkiste-regal-server'
import { fehler } from '@/lib/werkzeugkiste-server'

type Kontext = { params: Promise<{ id: string }> }

/**
 * DELETE /api/admin/werkzeugkiste/links/:id (PROJ-67) — der Super-Admin schaltet
 * einen beliebigen öffentlichen Link ab (z. B. bei Missbrauch). Alle anderen
 * bekommen 404; die Datenbankfunktion prüft es zusätzlich selbst.
 */
export async function DELETE(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) return fehler('Nicht gefunden.', 404)
  const id = (await params).id
  if (!idSchema.safeParse(id).success) return fehler('Diesen Link gibt es nicht.', 404)

  const { error } = await auth.supabase.rpc('link_admin_abschalten', { p_link_id: id })
  if (error) return fehlerAusFunktion(error)
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
