import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../../_lib/auth'
import { USER_ROLES } from '@/lib/roles'
import { ACTIVITY_FILTERS, SORT_KEYS } from '@/lib/user-list'

const BodySchema = z.object({
  /** Anzahl exportierter Zeilen */
  count: z.number().int().min(0).max(1_000_000),
  selection_only: z.boolean(),
  scope: z.enum(['department', 'all']),
  role: z.enum(['all', ...USER_ROLES] as [string, ...string[]]),
  activity: z.enum(ACTIVITY_FILTERS),
  sort: z.enum(SORT_KEYS),
  dir: z.enum(['asc', 'desc']),
  /** Nur ob gesucht wurde, nicht wonach: der Suchtext kann einen Namen enthalten */
  has_search: z.boolean(),
})

/**
 * Protokoll-Eintrag für einen CSV-Export der Nutzerliste (PROJ-61). Die Datei
 * entsteht im Browser; hier landet nur „wie viele Zeilen, welcher Filter“ im
 * Protokoll, ohne Personendaten. Schlägt das fehl, lädt der Browser nichts herunter.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { user, supabase, isSuperAdmin, departmentId } = auth
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
  const { count, ...filter } = parsed.data

  const { error } = await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action_type: 'user.export',
    object_type: 'user',
    object_id: null,
    object_label: null,
    details: { count, filter },
    department_id: departmentId,
  })
  if (error) {
    console.error('[POST /api/admin/users/export-log]', error.message)
    return NextResponse.json({ error: 'Der Export konnte nicht protokolliert werden.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
