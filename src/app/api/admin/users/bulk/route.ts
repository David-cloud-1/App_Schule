import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { BULK_ACTIONS, BULK_MAX_IDS, bulkSkipReason, summarize, type BulkResultItem, type BulkTarget } from '@/lib/user-bulk'

/** So viele Konten werden gleichzeitig bearbeitet (Sperren ruft pro Person die Auth-Schnittstelle auf) */
const CONCURRENCY = 5

const BodySchema = z
  .object({
    action: z.enum(BULK_ACTIONS),
    ids: z.array(z.string().uuid()).min(1).max(BULK_MAX_IDS),
    department_id: z.string().uuid().optional(),
  })
  .refine((v) => v.action !== 'move' || !!v.department_id, {
    message: 'Für „Bereich ändern“ fehlt der Ziel-Bereich.',
    path: ['department_id'],
  })

/**
 * Sammelaktionen der Nutzerliste (PROJ-61): Sperren, Entsperren, Bereich ändern.
 * Nur Super-Admin. Der Server entscheidet pro Konto, ob es bearbeitet oder
 * übersprungen wird, und schreibt pro erledigter Änderung einen eigenen
 * Protokoll-Eintrag (wie bei der Einzelaktion).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { user, supabase, isSuperAdmin } = auth
  if (!isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }
  const { action, department_id: targetDepartmentId } = parsed.data
  const ids = [...new Set(parsed.data.ids)]

  const service = createServiceClient()

  if (action === 'move') {
    const { data: department } = await service.from('departments').select('id').eq('id', targetDepartmentId!).maybeSingle()
    if (!department) return NextResponse.json({ error: 'Der Ziel-Bereich existiert nicht.' }, { status: 400 })
  }

  const { data: profiles, error: loadError } = await service
    .from('profiles')
    .select('id, role, department_id, linked_main_user_id')
    .in('id', ids)
  if (loadError) {
    console.error('[POST /api/admin/users/bulk] load', loadError.message)
    return NextResponse.json({ error: 'Die Konten konnten nicht geladen werden.' }, { status: 500 })
  }
  const byId = new Map((profiles as unknown as BulkTarget[]).map((p) => [p.id, p]))

  const results: BulkResultItem[] = new Array(ids.length)

  async function apply(id: string): Promise<BulkResultItem> {
    const target = byId.get(id) ?? null
    const reason = bulkSkipReason(action, target, { adminId: user.id, targetDepartmentId }, id)
    if (reason) return { id, status: 'skipped', reason }
    if (!target) return { id, status: 'skipped', reason: 'not_found' }

    try {
      if (action === 'move') {
        const { error } = await service.from('profiles').update({ department_id: targetDepartmentId }).eq('id', id)
        if (error) throw error
        await writeAuditLog(supabase, {
          admin_id: user.id,
          action_type: 'user.move_department',
          object_type: 'user',
          object_id: id,
          details: { from: target.department_id, to: targetDepartmentId, bulk: true },
          department_id: targetDepartmentId,
        })
      } else {
        const { error } = await service.auth.admin.updateUserById(id, {
          ban_duration: action === 'ban' ? '876000h' : 'none',
        })
        if (error) throw error
        await writeAuditLog(supabase, {
          admin_id: user.id,
          action_type: action === 'ban' ? 'user.ban' : 'user.unban',
          object_type: 'user',
          object_id: id,
          details: { bulk: true },
          department_id: target.department_id,
        })
      }
      return { id, status: 'done' }
    } catch (err) {
      console.error('[POST /api/admin/users/bulk]', action, id, err instanceof Error ? err.message : err)
      return { id, status: 'failed' }
    }
  }

  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, ids.length) }, async () => {
      while (next < ids.length) {
        const index = next++
        results[index] = await apply(ids[index])
      }
    }),
  )

  return NextResponse.json({ results, summary: summarize(results) })
}
