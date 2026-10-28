import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { PASSWORD_MIN } from '@/lib/konto'
import { requireTeacherRoleUser } from '../_lib/teacher-user'
import { accountHasPassword, verifyCurrentPassword } from '../_lib/verify-password'

const schema = z.object({
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(PASSWORD_MIN, `Das Passwort braucht mindestens ${PASSWORD_MIN} Zeichen.`).max(72, 'Das Passwort ist zu lang.'),
})

/**
 * Passwort ändern oder (bei Google/Apple-Konten ohne eigenes Passwort)
 * festlegen (PROJ-50). Das aktuelle Passwort wird auf dem Server geprüft
 * (`verifyCurrentPassword`, die laufende Sitzung bleibt unberührt). Erst danach setzt das Service-Konto das neue
 * Passwort; die Person bleibt angemeldet.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherRoleUser()
  if (auth.error) return auth.error
  const { user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message, field: 'newPassword' }, { status: 400 })
  }
  const { currentPassword, newPassword } = parsed.data

  const hasPassword = accountHasPassword(user.app_metadata)

  if (hasPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Bitte gib dein aktuelles Passwort ein.', field: 'currentPassword' }, { status: 400 })
    }
    if (!user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const check = await verifyCurrentPassword(user.email, currentPassword)
    if (!check.ok) return NextResponse.json({ error: check.error, field: 'currentPassword' }, { status: check.status })
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'Das neue Passwort muss sich vom aktuellen unterscheiden.', field: 'newPassword' }, { status: 400 })
    }
  }

  const { error } = await createServiceClient().auth.admin.updateUserById(user.id, { password: newPassword })
  if (error) {
    if (error.code === 'weak_password' || error.code === 'same_password') {
      return NextResponse.json({ error: 'Dieses Passwort ist nicht zulässig. Bitte wähle ein anderes.', field: 'newPassword' }, { status: 400 })
    }
    console.error('[POST /api/profile/password]', error.code ?? error.message)
    return NextResponse.json({ error: 'Das Passwort konnte nicht geändert werden.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
