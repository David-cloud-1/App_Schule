import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../../../_lib/auth'
import { periodSchema } from '@/lib/content-history'

const BodySchema = periodSchema.extend({
  /** Inhalte mit Konflikt (seither von anderen weiter bearbeitet) trotzdem überschreiben */
  includeConflicts: z.boolean().default(false),
})

/** Pro Datenbank-Aufruf höchstens so viele Inhalte (Zeitlimit der Abfrage) */
const CHUNK_SIZE = 100

type PlanRow = { content_type: string; content_id: string; action: 'restore' | 'trash' | 'skip'; conflict: boolean }

/**
 * Nimmt alle Änderungen einer Person im Zeitraum gesammelt zurück (PROJ-70),
 * als EIN Vorgang. Inhalte mit Konflikt bleiben standardmäßig unberührt. Die
 * Rücknahme ist selbst ein Vorgang und lässt sich über die bestehende
 * Vorgangs-Rücknahme wieder umkehren. Nur Super-Admin.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Nur der Super-Admin kann Änderungen einer Person zurücknehmen.' }, { status: 403 })
  }
  const { supabase, user } = auth

  const { id } = await ctx.params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Ungültige Person' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Anfrage' }, { status: 400 })
  }
  const { from, to, includeConflicts } = parsed.data

  const { data: plan, error: planError } = await supabase.rpc('person_revert_plan', {
    p_person: id,
    p_from: from,
    p_to: to,
  })
  if (planError) {
    console.error('[POST .../people/[id]/revert] plan', planError)
    return NextResponse.json({ error: 'Rücknahme konnte nicht vorbereitet werden.' }, { status: 500 })
  }

  const items = ((plan ?? []) as PlanRow[])
    .filter((r) => r.action !== 'skip' && (includeConflicts || !r.conflict))
    .map((r) => ({ type: r.content_type, id: r.content_id }))

  if (items.length === 0) {
    return NextResponse.json({ batchId: null, restored: 0, skipped: ((plan ?? []) as PlanRow[]).length })
  }

  const description = `Sammel-Rücknahme: Änderungen von ${id} vom ${from.slice(0, 10)} bis ${to.slice(0, 10)}`
  let batchId: string | null = null
  let restored = 0
  let skipped = 0

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const { data, error } = await supabase.rpc('revert_person_changes', {
      p_person: id,
      p_from: from,
      p_to: to,
      p_include_conflicts: includeConflicts,
      p_description: description,
      p_items: items.slice(i, i + CHUNK_SIZE),
      p_batch: batchId,
    })
    if (error) {
      console.error('[POST .../people/[id]/revert] chunk', error)
      // Bisher Zurückgenommenes bleibt als Vorgang erhalten und lässt sich umkehren
      return NextResponse.json(
        { error: 'Die Rücknahme wurde unterbrochen.', batchId, restored, skipped },
        { status: 500 }
      )
    }
    const row = (Array.isArray(data) ? data[0] : data) as { r_batch: string; r_done: number; r_skipped: number }
    batchId = row.r_batch
    restored += row.r_done
    skipped += row.r_skipped
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'person.rollback',
    object_type: 'content_change_batch',
    object_id: batchId,
    details: { person: id, from, to, restored, skipped, includeConflicts },
  })

  return NextResponse.json({ batchId, restored, skipped })
}
