import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { composeDisplayName, NAME_SET_ACTION, personNameSchema } from '@/lib/personen-name'
import { writeAuditLog } from '../../admin/_lib/auth'
import { requireTeacherRoleUser } from '../_lib/teacher-user'

/**
 * Eigenen Vor- und Nachnamen speichern (PROJ-121). Nur Lehrer-Rollen; Azubis
 * bekommen 403. Der Server prüft die Eingabe und schreibt Vorname, Nachname und
 * den abgeleiteten Anzeigenamen in einem Schritt mit der Service-Rolle, damit
 * die drei nie auseinanderlaufen. Nutzer haben auf diese Spalten kein
 * Schreibrecht. Geschrieben wird ausschließlich die Zeile der angemeldeten Person.
 *
 * Diese Schnittstelle bleibt auch ohne Namen erreichbar (liegt nicht unter
 * /api/admin) — sonst käme die Pflicht-Seite nie weiter.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireTeacherRoleUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }
  const parsed = personNameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe',
        // Meldung am passenden Feld anzeigen können
        field: parsed.error.issues[0]?.path[0] ?? null,
      },
      { status: 400 },
    )
  }
  const { firstName, lastName } = parsed.data
  const displayName = composeDisplayName(firstName, lastName)

  const { data: before } = await supabase
    .from('profiles')
    .select('first_name, last_name, display_name, department_id')
    .eq('id', user.id)
    .single()
  const old = before as {
    first_name: string | null
    last_name: string | null
    display_name: string | null
    department_id: string | null
  } | null

  const service = createServiceClient()
  const { error } = await service
    .from('profiles')
    .update({ first_name: firstName, last_name: lastName, display_name: displayName })
    .eq('id', user.id)
  if (error) {
    console.error('[PATCH /api/profile/name]', error.message)
    return NextResponse.json({ error: 'Der Name konnte nicht gespeichert werden.' }, { status: 500 })
  }

  const firstTime = !old?.first_name?.trim() && !old?.last_name?.trim()
  const changed = old?.first_name !== firstName || old?.last_name !== lastName
  if (changed) {
    await writeAuditLog(service, {
      admin_id: user.id,
      action_type: NAME_SET_ACTION,
      object_type: 'user',
      object_id: user.id,
      object_label: displayName,
      details: firstTime
        ? { first_time: true, new: displayName }
        : { old: old?.display_name ?? null, new: displayName },
      department_id: old?.department_id ?? null,
    })
  }

  return NextResponse.json({ firstName, lastName, displayName })
}
