import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { emailChangeSchema } from '@/lib/konto'
import { requireTeacherRoleUser } from '../_lib/teacher-user'
import { accountHasPassword, verifyCurrentPassword } from '../_lib/verify-password'

const schema = emailChangeSchema.extend({ currentPassword: z.string().min(1, 'Bitte gib dein aktuelles Passwort ein.').max(200) })

const GENERIC_ERROR = 'Die Adresse konnte nicht geändert werden. Bitte prüfe sie oder versuche eine andere.'

/**
 * E-Mail-Adresse (= Anmeldename) selbst ändern (PROJ-50). Diese App
 * verschickt keine Bestätigungs-Mails (Entscheidung 2026-10-27), die Änderung
 * gilt deshalb sofort. Schutz statt Link: Die Person bestätigt mit dem
 * aktuellen Passwort, die Oberfläche lässt die Adresse zweimal eingeben.
 * Konten ohne eigenes Passwort (Google/Apple) können das nicht tun.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherRoleUser()
  if (auth.error) return auth.error
  const { user } = auth

  if (!accountHasPassword(user.app_metadata)) {
    return NextResponse.json(
      { error: 'Du meldest dich über Google oder Apple an. Die Adresse kann dort geändert werden, hier nicht.' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json({ error: issue.message, field: issue.path[0] === 'currentPassword' ? 'currentPassword' : 'email' }, { status: 400 })
  }
  const { email, currentPassword } = parsed.data

  if (!user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (email === user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Das ist schon deine aktuelle Adresse.', field: 'email' }, { status: 400 })
  }

  const check = await verifyCurrentPassword(user.id, user.email, currentPassword)
  if (!check.ok) return NextResponse.json({ error: check.error, field: 'currentPassword' }, { status: check.status })

  // `email_confirm` hält die Änderung unabhängig von der Projekt-Einstellung sofort gültig
  const { error } = await createServiceClient().auth.admin.updateUserById(user.id, { email, email_confirm: true })
  if (error) {
    // Vergebene und ungültige Adresse klingen gleich: so erfährt niemand, wem eine Adresse gehört
    if (error.status === 422 || error.code === 'email_exists' || error.code === 'validation_failed') {
      return NextResponse.json({ error: GENERIC_ERROR, field: 'email' }, { status: 400 })
    }
    console.error('[POST /api/profile/email]', error.code ?? error.message)
    return NextResponse.json({ error: 'Die Adresse konnte nicht geändert werden.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, email })
}
