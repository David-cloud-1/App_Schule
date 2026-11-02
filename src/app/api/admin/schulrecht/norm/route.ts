import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { kern, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import { kuerzelParam, merkbar, nrParam } from '@/lib/schulrecht-server'
import type { Fundstelle } from '@/lib/schulrecht'

export const maxDuration = 30

/** GET /api/admin/schulrecht/norm?kuerzel=&nr= (PROJ-55) — Wortlaut einer einzelnen Norm. */
export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const suche = new URL(request.url).searchParams
  const kuerzel = kuerzelParam.safeParse(suche.get('kuerzel') ?? '')
  if (!kuerzel.success) return ungueltig(kuerzel.error)
  const nr = nrParam.safeParse(suche.get('nr') ?? '')
  if (!nr.success) return ungueltig(nr.error)
  try {
    const pfad = `/api/recht/norm?kuerzel=${encodeURIComponent(kuerzel.data)}&nr=${encodeURIComponent(nr.data)}`
    return merkbar(NextResponse.json(await kern<{ fundstelle: Fundstelle }>(pfad)))
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
