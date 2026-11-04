import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../../../../_lib/auth'
import { periodSchema } from '@/lib/content-history'

type PlanRow = {
  content_type: string
  content_id: string
  title: string | null
  action: 'restore' | 'trash' | 'skip'
  conflict: boolean
}

/**
 * Vorschau der Sammel-Rücknahme (PROJ-70): wie viele Inhalte betroffen sind
 * und wo jemand anderes seitdem weiter bearbeitet hat. Ändert nichts. Nur
 * Super-Admin (zusätzlich in der Datenbank-Funktion geprüft).
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Nur der Super-Admin kann Änderungen einer Person zurücknehmen.' }, { status: 403 })
  }

  const { id } = await ctx.params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Ungültige Person' }, { status: 400 })
  }
  const parsed = periodSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Anfrage' }, { status: 400 })
  }

  const { data, error } = await auth.supabase.rpc('person_revert_plan', {
    p_person: id,
    p_from: parsed.data.from,
    p_to: parsed.data.to,
  })
  if (error) {
    console.error('[GET .../people/[id]/preview]', error)
    return NextResponse.json({ error: 'Vorschau konnte nicht erstellt werden.' }, { status: 500 })
  }

  const rows = (data ?? []) as PlanRow[]
  const actionable = rows.filter((r) => r.action !== 'skip')
  const conflicts = actionable.filter((r) => r.conflict)

  return NextResponse.json({
    total: actionable.length,
    toRestore: actionable.filter((r) => r.action === 'restore').length,
    toTrash: actionable.filter((r) => r.action === 'trash').length,
    conflictCount: conflicts.length,
    skippedCount: rows.length - actionable.length,
    conflicts: conflicts.slice(0, 200).map((r) => ({
      contentType: r.content_type,
      contentId: r.content_id,
      title: r.title,
    })),
  })
}
