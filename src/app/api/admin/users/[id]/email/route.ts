import { NextRequest, NextResponse } from 'next/server'
import { writeAuditLog } from '../../../_lib/auth'
import { readJsonBody, requireSuperAdminTarget } from '../../_lib/target'
import { emailChangeSchema } from '@/lib/konto'
import { USER_ACTIONS } from '@/lib/user-detail'

const TAKEN_MESSAGE = 'Diese E-Mail gehört schon zu einem anderen Konto.'

/**
 * POST /api/admin/users/[id]/email — E-Mail (= Anmeldename) ändern (PROJ-59,
 * nur Super-Admin). Die neue Adresse gilt sofort, ohne Bestätigungsmail
 * (Entscheidung 2026-10-27, wie bei der Selbständerung in PROJ-50). Der
 * Fachbereich wird bewusst nicht mitgeändert.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const access = await requireSuperAdminTarget(id, { blockSelf: true })
  if (access.error) return access.error
  const { auth, service, target } = access

  const parsed = emailChangeSchema.safeParse(await readJsonBody(request))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' }, { status: 400 })
  }
  const email = parsed.data.email

  const { data: current, error: readError } = await service.auth.admin.getUserById(id)
  if (readError || !current?.user) {
    return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 })
  }
  const oldEmail = current.user.email ?? null
  if (oldEmail && oldEmail.toLowerCase() === email) {
    return NextResponse.json({ error: 'Das ist schon die aktuelle Adresse.' }, { status: 400 })
  }

  // `email_confirm` hält die Änderung unabhängig von der Projekt-Einstellung sofort gültig
  const { error } = await service.auth.admin.updateUserById(id, { email, email_confirm: true })
  if (error) {
    if (error.status === 422 || error.code === 'email_exists') {
      return NextResponse.json({ error: TAKEN_MESSAGE }, { status: 409 })
    }
    if (error.code === 'validation_failed') {
      return NextResponse.json({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }, { status: 400 })
    }
    console.error('[POST /api/admin/users/:id/email]', error.code ?? error.message)
    return NextResponse.json({ error: 'Die Adresse konnte nicht geändert werden.' }, { status: 500 })
  }

  await writeAuditLog(auth.supabase, {
    admin_id: auth.user.id,
    action_type: USER_ACTIONS.emailChange,
    object_type: 'user',
    object_id: id,
    object_label: target.display_name,
    details: { old: oldEmail, new: email },
    department_id: target.department_id,
  })

  return NextResponse.json({ ok: true, email })
}
