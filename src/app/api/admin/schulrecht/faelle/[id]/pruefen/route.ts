import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { fehler, kern, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import { aktualisiereFall, FALL_FEHLT, fallAntwortSchema, ladeEigenenFall, ohneZwischenspeicher, zeileZuFall } from '@/lib/schulrecht-server'
import type { FallPruefung } from '@/lib/schulrecht'

export const maxDuration = 30

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/schulrecht/faelle/:id/pruefen (PROJ-55) — speichert die KI-Antwort
 * (höchstens 24 Stunden) und meldet Fundstellen, die der KI nicht gegeben wurden
 * oder gar nicht existieren. Blockiert nie; nur eine leere Antwort gilt als unlesbar.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = fallAntwortSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)
  const zeile = await ladeEigenenFall(auth.supabase, (await params).id)
  if (!zeile) return fehler(FALL_FEHLT, 404)
  if (!zeile.prompt) return fehler('Der Prompt ist noch nicht erstellt.', 400)
  try {
    const pruefung = await kern<FallPruefung>('/api/recht/pruefen', { antwort: parsed.data.antwort, fundstellen: zeile.fundstellen })
    const neu = await aktualisiereFall(auth.supabase, zeile.id, { antwort: parsed.data.antwort, pruefung, schritt: Math.max(zeile.schritt, 3) })
    if (!neu) return fehler('Die Antwort konnte nicht gespeichert werden.', 500)
    return ohneZwischenspeicher(NextResponse.json({ fall: zeileZuFall(neu) }))
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
