import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import type { Durchlauf, FruehererDurchlauf } from '@/lib/checklisten/katalog'
import { NOT_FOUND, NO_STORE, fehlerAntwort, listenKennung } from '../_lib/checklisten-api'

const ROUTE = 'api/admin/checklisten/[id]'

type Ctx = { params: Promise<{ id: string }> }

interface OffenZeile {
  id: string
  checkliste: string
  variante: string | null
  gestartet_am: string
  archiviert_am: string | null
  checklisten_haken: { schritt: string }[] | null
}

interface ArchivZeile {
  id: string
  variante: string | null
  gestartet_am: string
  archiviert_am: string
  checklisten_haken: { count: number }[] | null
}

/**
 * GET /api/admin/checklisten/[id] (PROJ-122): der offene Durchlauf dieser Liste
 * (oder null, solange noch nichts abgehakt oder gewählt wurde) und die
 * früheren, archivierten Durchläufe – diese nur mit der Zahl der Haken.
 */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  const checkliste = listenKennung(id)
  if (!checkliste) return NOT_FOUND()

  const offenRes = await auth.supabase
    .from('checklisten_durchlaeufe')
    .select('id, checkliste, variante, gestartet_am, archiviert_am, checklisten_haken(schritt)')
    .eq('owner_id', auth.user.id)
    .eq('checkliste', checkliste)
    .is('archiviert_am', null)
    .limit(1)
  if (offenRes.error) return fehlerAntwort(ROUTE, offenRes.error)

  const archivRes = await auth.supabase
    .from('checklisten_durchlaeufe')
    .select('id, variante, gestartet_am, archiviert_am, checklisten_haken(count)')
    .eq('owner_id', auth.user.id)
    .eq('checkliste', checkliste)
    .not('archiviert_am', 'is', null)
    .order('archiviert_am', { ascending: false })
    .limit(50)
  if (archivRes.error) return fehlerAntwort(ROUTE, archivRes.error)

  const zeile = ((offenRes.data ?? []) as unknown as OffenZeile[])[0]
  const offen: Durchlauf | null = zeile
    ? {
        id: zeile.id,
        checkliste: zeile.checkliste,
        variante: zeile.variante,
        gestartet_am: zeile.gestartet_am,
        archiviert_am: zeile.archiviert_am,
        haken: (zeile.checklisten_haken ?? []).map((h) => h.schritt),
      }
    : null

  const fruehere: FruehererDurchlauf[] = ((archivRes.data ?? []) as unknown as ArchivZeile[]).map((z) => ({
    id: z.id,
    variante: z.variante,
    gestartet_am: z.gestartet_am,
    archiviert_am: z.archiviert_am,
    anzahl_haken: z.checklisten_haken?.[0]?.count ?? 0,
  }))

  return NextResponse.json({ offen, fruehere }, { headers: NO_STORE })
}
