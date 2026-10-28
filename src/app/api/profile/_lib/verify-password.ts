import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Aktuelles Passwort prüfen (PROJ-50), ohne die laufende Sitzung anzufassen:
 * Die Anmeldung läuft über einen eigenen Wegwerf-Client, der nichts speichert.
 * Genutzt beim Ändern von Passwort und E-Mail-Adresse.
 */
export type PasswordCheck = { ok: true } | { ok: false; status: 400 | 429; error: string }

export async function verifyCurrentPassword(email: string, password: string): Promise<PasswordCheck> {
  const verifier = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await verifier.auth.signInWithPassword({ email, password })
  if (!error) return { ok: true }
  if (error.status === 429) return { ok: false, status: 429, error: 'Zu viele Versuche. Bitte warte einen Moment.' }
  return { ok: false, status: 400, error: 'Das aktuelle Passwort stimmt nicht.' }
}

/** Konten ohne eigenes Passwort (nur Google/Apple) können es nicht bestätigen */
export function accountHasPassword(appMetadata: Record<string, unknown> | undefined): boolean {
  const providers = (appMetadata?.providers as string[] | undefined) ?? [appMetadata?.provider as string | undefined]
  return providers.includes('email')
}
