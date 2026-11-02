import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { kern, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import { kuerzelParam, merkbar } from '@/lib/schulrecht-server'
import type { VorschriftInhalt } from '@/lib/schulrecht'

export const maxDuration = 30

/** GET /api/admin/schulrecht/vorschrift?kuerzel= (PROJ-55) — Inhaltsverzeichnis einer Rechtsquelle zum Durchblättern. */
export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = kuerzelParam.safeParse(new URL(request.url).searchParams.get('kuerzel') ?? '')
  if (!parsed.success) return ungueltig(parsed.error)
  try {
    return merkbar(NextResponse.json(await kern<VorschriftInhalt>(`/api/recht/vorschrift?kuerzel=${encodeURIComponent(parsed.data)}`)))
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
