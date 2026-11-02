import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { kern, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import { ohneZwischenspeicher, sucheSchema } from '@/lib/schulrecht-server'
import type { SuchErgebnis } from '@/lib/schulrecht'

// Der erste Aufruf nach einer Pause lädt das Einbettungsmodell (Ziel: unter 10 s)
export const maxDuration = 60

/**
 * POST /api/admin/schulrecht/suche (PROJ-55) — Fundstellen zu einer Frage, ohne KI.
 * Die Frage kommt nur im Nachrichtenkörper, wird nicht gespeichert und nicht
 * protokolliert (E4). Antworten werden nie zwischengespeichert.
 */
export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = sucheSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)
  try {
    const r = await kern<SuchErgebnis>('/api/recht/suche', parsed.data, 50_000)
    return ohneZwischenspeicher(NextResponse.json(r))
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}

