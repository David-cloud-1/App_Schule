import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { aktualisiere, fehler, ladeEigenenAblauf, zeileZuAblauf } from '@/lib/werkzeugkiste-server'
import { loescheTeilDateien } from '@/lib/werkzeugkiste-teile-server'

type Kontext = { params: Promise<{ id: string }> }

/**
 * DELETE /api/admin/werkzeugkiste/ablaeufe/:id/teile (PROJ-69) — verwirft die Teil-Liste
 * samt aller eingefügten Teil-Antworten. Die Oberfläche ruft das erst nach der Rückfrage
 * („Deine eingefügten Teile gehen dabei verloren“) auf, wenn Auswahl oder Einstellungen
 * sich ändern. Die Gesamtantwort des Ablaufs, falls schon zusammengefügt, entfällt mit.
 */
export async function DELETE(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.teile) return NextResponse.json({ ablauf: zeileZuAblauf(zeile) })
  if (zeile.status === 'fertig') {
    return fehler('Dieses Material ist fertig. Die Teile werden nicht mehr gebraucht.', 400)
  }

  const neu = await aktualisiere(auth.supabase, zeile.id, {
    teile: null,
    prompt: null,
    antwort: zeile.teile.zusammengefuegt ? null : zeile.antwort,
    pruefung: zeile.teile.zusammengefuegt ? null : zeile.pruefung,
    // Der erreichte Schritt kann nicht über den Prompt hinausgehen, den es nicht mehr gibt
    schritt: Math.min(zeile.schritt, 2),
  })
  if (!neu) return fehler('Die Teile konnten nicht verworfen werden.', 500)
  await loescheTeilDateien(createServiceClient(), zeile.owner_id, zeile.id)
  return NextResponse.json({ ablauf: zeileZuAblauf(neu) })
}
