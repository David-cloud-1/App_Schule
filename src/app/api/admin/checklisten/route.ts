import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../_lib/auth'
import type { Durchlauf } from '@/lib/checklisten/katalog'
import { NO_STORE, fehlerAntwort } from './_lib/checklisten-api'

const ROUTE = 'api/admin/checklisten'

interface Zeile {
  id: string
  checkliste: string
  variante: string | null
  gestartet_am: string
  archiviert_am: string | null
  checklisten_haken: { schritt: string }[] | null
}

/**
 * GET /api/admin/checklisten (PROJ-122): alle OFFENEN Durchläufe der eigenen
 * Person mit ihren Haken – daraus rechnet die Übersicht den Fortschritt je
 * Liste. Fremde Durchläufe liefert die Datenbank nie (Zeilenregel), die
 * Eigentümer-Bedingung ist die zweite Absicherung.
 */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('checklisten_durchlaeufe')
    .select('id, checkliste, variante, gestartet_am, archiviert_am, checklisten_haken(schritt)')
    .eq('owner_id', auth.user.id)
    .is('archiviert_am', null)
    .limit(100)
  if (error) return fehlerAntwort(ROUTE, error)

  const offen: Durchlauf[] = ((data ?? []) as unknown as Zeile[]).map((z) => ({
    id: z.id,
    checkliste: z.checkliste,
    variante: z.variante,
    gestartet_am: z.gestartet_am,
    archiviert_am: z.archiviert_am,
    haken: (z.checklisten_haken ?? []).map((h) => h.schritt),
  }))
  return NextResponse.json({ offen }, { headers: NO_STORE })
}
