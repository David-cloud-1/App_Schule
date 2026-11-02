import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { kern, kernFehlerAntwort } from '@/lib/werkzeugkiste-server'
import { merkbar } from '@/lib/schulrecht-server'
import type { ThemenAntwort } from '@/lib/schulrecht'

export const maxDuration = 30

/** GET /api/admin/schulrecht/themen (PROJ-55) — Themen-Chips und Rechtsquellen aus dem Kern. Enthält keine Nutzereingaben. */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  try {
    return merkbar(NextResponse.json(await kern<ThemenAntwort>('/api/recht/themen')))
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
