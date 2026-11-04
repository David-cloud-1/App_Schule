import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../../_lib/auth'
import { periodSchema } from '@/lib/content-history'

const QuerySchema = periodSchema.extend({
  department_id: z.string().uuid().optional(),
})

/**
 * Änderungen je Person im Zeitraum (PROJ-70): angelegt / geändert / gelöscht /
 * wiederhergestellt. Nur Super-Admin; die Zählung läuft in der Datenbank
 * (eine Abfrage), nicht über tausende Versionen in der App.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Nur der Super-Admin sieht die Auswertung je Person.' }, { status: 403 })
  }

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Anfrage' }, { status: 400 })
  }
  const { from, to, department_id } = parsed.data

  const { data, error } = await auth.supabase.rpc('content_changes_per_person', {
    p_from: from,
    p_to: to,
    p_department_id: department_id ?? null,
  })
  if (error) {
    console.error('[GET /api/admin/content-history/people]', error)
    return NextResponse.json({ error: 'Auswertung konnte nicht geladen werden.' }, { status: 500 })
  }

  const rows = (data ?? []) as {
    person_id: string | null
    person_label: string | null
    angelegt: number
    geaendert: number
    geloescht: number
    wiederhergestellt: number
  }[]

  // Anzeigenamen in einer Abfrage nachladen
  const ids = rows.map((r) => r.person_id).filter((v): v is string => !!v)
  const names = new Map<string, string>()
  if (ids.length > 0) {
    const { data: profiles } = await auth.supabase.from('profiles').select('id, display_name').in('id', ids)
    for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
      if (p.display_name) names.set(p.id, p.display_name)
    }
  }

  return NextResponse.json({
    people: rows.map((r) => ({
      personId: r.person_id,
      name: (r.person_id && names.get(r.person_id)) || r.person_label || (r.person_id ? 'Unbekannt' : 'Gelöschtes Konto'),
      created: Number(r.angelegt),
      updated: Number(r.geaendert),
      deleted: Number(r.geloescht),
      restored: Number(r.wiederhergestellt),
    })),
  })
}
