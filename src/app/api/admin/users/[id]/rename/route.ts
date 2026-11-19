import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeAuditLog } from '../../../_lib/auth'
import { readJsonBody, requireSuperAdminTarget } from '../../_lib/target'
import { displayNameSchema, USER_ACTIONS } from '@/lib/user-detail'
import { composeDisplayName, personNameSchema } from '@/lib/personen-name'
import { isTeacherRole } from '@/lib/roles'

const BodySchema = z.object({ name: displayNameSchema })

/**
 * POST /api/admin/users/[id]/rename — Anzeigenamen ändern (PROJ-59, nur
 * Super-Admin). Ändert nur den Anzeigenamen, nicht das Pseudonym der
 * Lehrkräfte (PROJ-44).
 *
 * Bei Lehrer-Rollen (PROJ-121) heißt der Körper `{ firstName, lastName }`: Der
 * Super-Admin ändert Vor- und Nachnamen, der Anzeigename zieht automatisch nach,
 * damit die Werte nie auseinanderlaufen. Bei Azubis bleibt es bei `{ name }`.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const access = await requireSuperAdminTarget(id)
  if (access.error) return access.error
  const { auth, service, target } = access

  const rawBody = await readJsonBody(request)
  const teacherTarget = isTeacherRole(target.role)

  let name: string
  let update: { display_name: string; first_name?: string; last_name?: string }
  if (teacherTarget) {
    const person = personNameSchema.safeParse(rawBody)
    if (!person.success) {
      return NextResponse.json({ error: person.error.issues[0]?.message ?? 'Ungültige Eingabe' }, { status: 400 })
    }
    name = composeDisplayName(person.data.firstName, person.data.lastName)
    update = { first_name: person.data.firstName, last_name: person.data.lastName, display_name: name }
  } else {
    const parsed = BodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' }, { status: 400 })
    }
    name = parsed.data.name
    update = { display_name: name }
  }
  if (name === target.display_name && !teacherTarget) {
    return NextResponse.json({ error: 'Das ist schon der aktuelle Name.' }, { status: 400 })
  }

  const { error } = await service.from('profiles').update(update).eq('id', id)
  if (error) {
    console.error('[POST /api/admin/users/:id/rename]', error.message)
    return NextResponse.json({ error: 'Der Name konnte nicht geändert werden.' }, { status: 500 })
  }

  await writeAuditLog(auth.supabase, {
    admin_id: auth.user.id,
    action_type: USER_ACTIONS.rename,
    object_type: 'user',
    object_id: id,
    object_label: name,
    details: { old: target.display_name, new: name },
    department_id: target.department_id,
  })

  return NextResponse.json({ ok: true, name })
}
