import { NextRequest, NextResponse } from 'next/server'
import { emailChangeSchema } from '@/lib/konto'
import { requireTeacherRoleUser } from '../_lib/teacher-user'

/**
 * E-Mail-Adresse (= Anmeldename) selbst ändern (PROJ-50). Der Anmeldedienst
 * schickt einen Bestätigungslink an die NEUE Adresse; bis zum Klick gilt die
 * alte weiter. Voraussetzung in Supabase Auth: „Secure email change“ aus.
 */

/** Rücksprung nach dem Klick auf den Link: zurück auf „Mein Konto“ mit Erfolgsmeldung */
function redirectTo(request: NextRequest): string {
  const next = encodeURIComponent('/admin/konto?email=bestaetigt')
  return `${new URL(request.url).origin}/auth/callback?next=${next}`
}

const GENERIC_ERROR = 'Die Adresse konnte nicht geändert werden. Bitte prüfe sie oder versuche eine andere.'

/** Neue Adresse eintragen; eine bereits ausstehende Änderung wird dadurch ersetzt */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherRoleUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }
  const parsed = emailChangeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message, field: 'email' }, { status: 400 })

  if (parsed.data.email === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'Das ist schon deine aktuelle Adresse.', field: 'email' }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({ email: parsed.data.email }, { emailRedirectTo: redirectTo(request) })
  if (error) {
    if (error.status === 429) {
      return NextResponse.json({ error: 'Zu viele Versuche. Bitte warte einen Moment.', field: 'email' }, { status: 429 })
    }
    // Vergebene Adresse und ungültige Adresse klingen gleich: so erfährt niemand, wem eine Adresse gehört
    if (error.status === 422 || error.code === 'email_exists' || error.code === 'validation_failed') {
      return NextResponse.json({ error: GENERIC_ERROR, field: 'email' }, { status: 400 })
    }
    console.error('[POST /api/profile/email]', error.code ?? error.message)
    return NextResponse.json({ error: 'Die Adresse konnte nicht geändert werden.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

/** Bestätigungslink für die ausstehende Adresse erneut senden */
export async function PUT(request: NextRequest) {
  const auth = await requireTeacherRoleUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  if (!user.new_email) {
    return NextResponse.json({ error: 'Es wartet keine Änderung auf Bestätigung.' }, { status: 400 })
  }
  const { error } = await supabase.auth.resend({
    type: 'email_change',
    email: user.new_email,
    options: { emailRedirectTo: redirectTo(request) },
  })
  if (error) {
    if (error.status === 429) {
      return NextResponse.json({ error: 'Bitte warte einen Moment, bevor du den Link erneut sendest.' }, { status: 429 })
    }
    console.error('[PUT /api/profile/email]', error.code ?? error.message)
    return NextResponse.json({ error: 'Der Link konnte nicht gesendet werden.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
