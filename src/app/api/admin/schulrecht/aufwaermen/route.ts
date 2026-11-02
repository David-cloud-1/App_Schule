import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { kern, kernFehlerAntwort } from '@/lib/werkzeugkiste-server'

export const maxDuration = 60

/** POST /api/admin/schulrecht/aufwaermen (PROJ-55) — lädt das Einbettungsmodell im Kern vor; ohne Frage, ohne Inhalt. */
export async function POST() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  try {
    await kern<{ ok: true }>('/api/recht/aufwaermen', {}, 50_000)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
