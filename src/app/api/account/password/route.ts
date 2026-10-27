import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { PASSWORD_MIN_LENGTH } from '@/lib/password-suggestion'
import { MUST_CHANGE_PASSWORD_FLAG, mustChangePassword } from '@/lib/roles'

const BodySchema = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Das Passwort braucht mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`)
    .max(72, 'Das Passwort ist zu lang.'),
})

/**
 * POST /api/account/password — die angemeldete Person setzt ihr eigenes
 * Passwort (PROJ-58). Genutzt vom Pflichtwechsel nach „Passwort neu vergeben“
 * und von „Passwort vergessen“ (/reset-password). Entfernt danach den Merker
 * für den Pflichtwechsel; das kann nur der Server.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  // Über die eigene Sitzung setzen: Supabase lehnt dann ein unverändertes
  // Passwort selbst ab, ohne dass das vergebene irgendwo gespeichert sein muss.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    const code = (error as { code?: string }).code
    if (code === 'same_password') {
      return NextResponse.json(
        { error: 'Bitte wähle ein anderes Passwort als das, das du bekommen hast.' },
        { status: 400 }
      )
    }
    if (code === 'weak_password') {
      return NextResponse.json({ error: 'Dieses Passwort ist zu schwach. Bitte wähle ein anderes.' }, { status: 400 })
    }
    if (code === 'session_not_found' || code === 'session_expired' || error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[POST /api/account/password] update failed', { code })
    return NextResponse.json({ error: 'Passwort konnte nicht gesetzt werden.' }, { status: 500 })
  }

  if (mustChangePassword(user)) {
    const service = createServiceClient()
    const { error: flagError } = await service.auth.admin.updateUserById(user.id, {
      app_metadata: { [MUST_CHANGE_PASSWORD_FLAG]: false },
    })
    if (flagError) {
      // Passwort ist gesetzt, der Merker aber noch da. Den Merker hier nicht
      // auf anderem Weg entfernen — sonst ließe sich der Pflichtwechsel umgehen.
      // Ein neuer Versuch braucht ein anderes Passwort (gleiches lehnt Supabase ab).
      console.error('[POST /api/account/password] clear flag failed', flagError.message)
      return NextResponse.json(
        { error: 'Das hat nicht ganz geklappt. Bitte wähle noch einmal ein anderes neues Passwort.' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ ok: true })
}
