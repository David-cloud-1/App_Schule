import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireManager, writeAuditLog, writeAuditLogStrict, auditFailedResponse } from '../../../_lib/auth'
import { mayManageUserTarget } from '../../_lib/manage-target'
import { createServiceClient } from '@/lib/supabase-server'
import { PASSWORD_MIN_LENGTH } from '@/lib/password-suggestion'
import { MUST_CHANGE_PASSWORD_FLAG } from '@/lib/roles'

/** Höchstens so viele Vergaben pro Admin und Stunde (gezählt im Änderungsprotokoll) */
export const PASSWORD_SET_LIMIT_PER_HOUR = 20

const BodySchema = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Das Passwort braucht mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`)
    .max(72, 'Das Passwort ist zu lang.'),
})

/**
 * POST /api/admin/users/[id]/password — Passwort neu vergeben (PROJ-58).
 * Setzt das Passwort, markiert das Konto für den Pflichtwechsel beim nächsten
 * Login und beendet alle Sitzungen der Person. Das Passwort steht nie im
 * Protokoll, in Logs oder in der Antwort.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  const { id } = await ctx.params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (id === user.id) {
    return NextResponse.json({ error: 'Dein eigenes Passwort änderst du in deinem Konto.' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 })
  }

  // Service-Role-Route (umgeht RLS) — Bereichstrennung passiert hier im Code,
  // mit derselben Regel wie beim Sperren (PATCH /api/admin/users/[id]).
  const service = createServiceClient()
  const { data: target } = await service
    .from('profiles')
    .select('department_id, role, linked_main_user_id, display_name, first_name, last_name')
    .eq('id', id)
    .maybeSingle()
  const row = target as {
    department_id: string | null
    role: string
    linked_main_user_id: string | null
    display_name: string | null
    first_name: string | null
    last_name: string | null
  } | null
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Lehrkraft (PROJ-127): nur Azubis im gewählten Bereich; andere Lehrkräfte
  // und der Super-Admin sind tabu (403, nicht nur ausgeblendet).
  if (!mayManageUserTarget(auth, row)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // Verknüpfter Zweitaccount des Super-Admins (PROJ-29) ist kein echtes Konto zum Verwalten
  if (row.linked_main_user_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const label = [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(' ') || row.display_name?.trim() || null

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await service
    .from('admin_audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('admin_id', user.id)
    .eq('action_type', 'user.password_set')
    .gte('created_at', since)
  if ((count ?? 0) >= PASSWORD_SET_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: 'Zu viele Passwörter in kurzer Zeit vergeben. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  // Ein neues Passwort lässt sich nicht zurücknehmen: deshalb zuerst der
  // Protokolleintrag (PROJ-127). Ohne Eintrag wird nichts geändert.
  const logged = await writeAuditLogStrict(supabase, {
    admin_id: user.id,
    action_type: 'user.password_set',
    object_type: 'user',
    object_id: id,
    object_label: label,
    details: { pflichtwechsel: true },
    department_id: row.department_id,
  })
  if (!logged) return auditFailedResponse()

  const { error: updateError } = await service.auth.admin.updateUserById(id, {
    password: parsed.data.password,
    app_metadata: { [MUST_CHANGE_PASSWORD_FLAG]: true },
  })
  if (updateError) {
    // Der Eintrag steht schon; der Nachtrag hält fest, dass es nicht geklappt hat
    await writeAuditLog(supabase, {
      admin_id: user.id,
      action_type: 'user.password_set_failed',
      object_type: 'user',
      object_id: id,
      object_label: label,
      department_id: row.department_id,
    })
    const code = (updateError as { code?: string }).code
    if (code === 'weak_password') {
      return NextResponse.json({ error: 'Dieses Passwort ist zu schwach. Bitte ein anderes wählen.' }, { status: 400 })
    }
    console.error('[POST /api/admin/users/:id/password] update failed', { code })
    return NextResponse.json({ error: 'Passwort konnte nicht gesetzt werden.' }, { status: 500 })
  }

  // Andere Geräte abmelden. Schlägt das fehl, schützt trotzdem der Proxy:
  // jede alte Sitzung landet sofort auf „Neues Passwort festlegen“.
  const { error: revokeError } = await service.rpc('admin_revoke_user_sessions', { target_user_id: id })
  if (revokeError) console.error('[POST /api/admin/users/:id/password] revoke sessions', revokeError.message)

  return NextResponse.json({ ok: true })
}
