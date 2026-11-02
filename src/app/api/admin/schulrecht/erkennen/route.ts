import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { bremse } from '@/lib/schulrecht-limit'
import { kern, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import { erkennenSchema, ohneZwischenspeicher } from '@/lib/schulrecht-server'
import type { Fund } from '@/lib/schulrecht'

export const maxDuration = 30

/**
 * POST /api/admin/schulrecht/erkennen (PROJ-55) — Personenbezüge im Originaltext
 * mit Ersetzungsvorschlag. Der Text wird nicht gespeichert und nicht protokolliert (E3/E4).
 */
export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zuSchnell = bremse(auth.user.id)
  if (zuSchnell) return zuSchnell
  const parsed = erkennenSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)
  try {
    return ohneZwischenspeicher(NextResponse.json(await kern<{ funde: Fund[] }>('/api/recht/erkennen', parsed.data)))
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
