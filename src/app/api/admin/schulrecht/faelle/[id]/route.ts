import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { fehler, ungueltig } from '@/lib/werkzeugkiste-server'
import {
  aktualisiereFall,
  FALL_FEHLT,
  FALL_TABELLE,
  fallAenderungSchema,
  ladeEigenenFall,
  ohneZwischenspeicher,
  zeileZuFall,
} from '@/lib/schulrecht-server'

type Kontext = { params: Promise<{ id: string }> }

/** GET /api/admin/schulrecht/faelle/:id (PROJ-55) — eigenen Fall lesen; abgelaufene und fremde Fälle gibt es nicht (404). */
export async function GET(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenFall(auth.supabase, (await params).id)
  if (!zeile) return fehler(FALL_FEHLT, 404)
  return ohneZwischenspeicher(NextResponse.json({ fall: zeileZuFall(zeile) }))
}

/** PATCH — weitesten erreichten Schritt merken; nur erhöhen, und nur so weit, wie der Fall vorbereitet ist. */
export async function PATCH(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = fallAenderungSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)
  const zeile = await ladeEigenenFall(auth.supabase, (await params).id)
  if (!zeile) return fehler(FALL_FEHLT, 404)
  if (parsed.data.schritt > 1 && !zeile.prompt) return fehler('Der Prompt ist noch nicht erstellt.', 400)
  const neu = await aktualisiereFall(auth.supabase, zeile.id, { schritt: Math.max(zeile.schritt, parsed.data.schritt) })
  if (!neu) return fehler('Das konnte nicht gespeichert werden.', 500)
  return ohneZwischenspeicher(NextResponse.json({ fall: zeileZuFall(neu) }))
}

/** DELETE — Fall verwerfen */
export async function DELETE(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenFall(auth.supabase, (await params).id)
  if (!zeile) return fehler(FALL_FEHLT, 404)
  const { error } = await auth.supabase.from(FALL_TABELLE).delete().eq('id', zeile.id)
  if (error) return fehler('Der Fall konnte nicht gelöscht werden.', 500)
  return NextResponse.json({ ok: true })
}
