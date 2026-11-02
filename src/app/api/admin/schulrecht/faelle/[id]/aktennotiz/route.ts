import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { fehler, kernFehlerAntwort } from '@/lib/werkzeugkiste-server'
import { FALL_FEHLT, kernDatei, ladeEigenenFall } from '@/lib/schulrecht-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/schulrecht/faelle/:id/aktennotiz (PROJ-55) — die Word-Datei geht
 * direkt an den Browser. Sie wird nirgends abgelegt, auch nicht in „Meine Materialien“ (E4).
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenFall(auth.supabase, (await params).id)
  if (!zeile) return fehler(FALL_FEHLT, 404)
  if (!zeile.antwort?.trim()) return fehler('Bitte füge zuerst die Antwort der KI ein.', 400)
  if ((zeile.pruefung as { lesbar?: boolean } | null)?.lesbar === false) {
    return fehler('Die Antwort ist leer oder unvollständig.', 400, 'Bitte füge die vollständige Antwort der KI ein.')
  }
  try {
    const datei = await kernDatei('/api/recht/aktennotiz', {
      sachverhalt: zeile.sachverhalt,
      fundstellen: zeile.fundstellen,
      antwort: zeile.antwort,
    })
    return new NextResponse(datei.blob, {
      status: 200,
      headers: {
        'Content-Type': datei.typ,
        'Content-Disposition': `attachment; filename="${datei.dateiname}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
