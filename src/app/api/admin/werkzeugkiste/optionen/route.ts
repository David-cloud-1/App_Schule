import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { kern, kernFehlerAntwort } from '@/lib/werkzeugkiste-server'
import type { WerkzeugOptionen } from '@/lib/werkzeugkiste-api'

/** Auswahllisten ändern sich nur mit einer neuen Kern-Fassung — eine Stunde zwischenspeichern */
const HALTEZEIT_MS = 60 * 60 * 1000
let zwischenspeicher: { daten: WerkzeugOptionen; bis: number } | null = null

/** GET /api/admin/werkzeugkiste/optionen — Niveaus, Bildungsgänge, Lernfelder, Umfang (PROJ-51) */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  if (zwischenspeicher && zwischenspeicher.bis > Date.now()) return NextResponse.json(zwischenspeicher.daten)
  try {
    const daten = await kern<WerkzeugOptionen>('/api/optionen', undefined, 30_000)
    zwischenspeicher = { daten, bis: Date.now() + HALTEZEIT_MS }
    return NextResponse.json(daten)
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
