import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { fehler, kern, kernFehlerAntwort } from '@/lib/werkzeugkiste-server'
import { aktualisiereFall, FALL_FEHLT, ladeEigenenFall, ohneZwischenspeicher, zeileZuFall } from '@/lib/schulrecht-server'

export const maxDuration = 30

type Kontext = { params: Promise<{ id: string }> }

/** POST /api/admin/schulrecht/faelle/:id/prompt (PROJ-55) — der Kern baut den Prompt aus Sachverhalt und Fundstellen, zeichengenau wie die alte Werkzeugkiste. */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenFall(auth.supabase, (await params).id)
  if (!zeile) return fehler(FALL_FEHLT, 404)
  try {
    const r = await kern<{ prompt: string }>('/api/recht/prompt', { sachverhalt: zeile.sachverhalt, fundstellen: zeile.fundstellen })
    const neu = await aktualisiereFall(auth.supabase, zeile.id, { prompt: r.prompt, schritt: Math.max(zeile.schritt, 2) })
    if (!neu) return fehler('Der Prompt konnte nicht gespeichert werden.', 500)
    return ohneZwischenspeicher(NextResponse.json({ fall: zeileZuFall(neu) }))
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
