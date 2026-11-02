import { NextResponse } from 'next/server'
import { writeAuditLog } from '../../../../_lib/auth'
import { requireSuperAdminTarget } from '../../../_lib/target'
import { USER_ACTIONS } from '@/lib/user-detail'

/**
 * POST /api/admin/users/[id]/email/confirm — E-Mail als bestätigt markieren
 * (PROJ-59, nur Super-Admin), z. B. wenn die Bestätigungsmail nicht ankommt.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const access = await requireSuperAdminTarget(id, { blockSelf: true })
  if (access.error) return access.error
  const { auth, service, target } = access

  const { data: current, error: readError } = await service.auth.admin.getUserById(id)
  if (readError || !current?.user) {
    return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 })
  }
  if (current.user.email_confirmed_at) {
    return NextResponse.json({ error: 'Die E-Mail ist schon bestätigt.' }, { status: 409 })
  }

  const { error } = await service.auth.admin.updateUserById(id, { email_confirm: true })
  if (error) {
    console.error('[POST /api/admin/users/:id/email/confirm]', error.code ?? error.message)
    return NextResponse.json({ error: 'Die E-Mail konnte nicht bestätigt werden.' }, { status: 500 })
  }

  await writeAuditLog(auth.supabase, {
    admin_id: auth.user.id,
    action_type: USER_ACTIONS.emailConfirm,
    object_type: 'user',
    object_id: id,
    object_label: target.display_name,
    details: { email: current.user.email ?? null },
    department_id: target.department_id,
  })

  return NextResponse.json({ ok: true })
}
