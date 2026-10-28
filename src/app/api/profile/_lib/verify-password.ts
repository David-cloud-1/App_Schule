import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAttemptLimiter } from '@/lib/attempt-limiter'

/**
 * Aktuelles Passwort prüfen (PROJ-50), ohne die laufende Sitzung anzufassen:
 * Die Anmeldung läuft über einen eigenen Wegwerf-Client, der nichts speichert,
 * und die dabei entstandene Sitzung wird sofort wieder beendet (nur diese,
 * nie die der Person). Genutzt beim Ändern von Passwort und E-Mail-Adresse.
 *
 * Alle Prüfungen kommen von der Adresse des Servers, der Dienst begrenzt die
 * Anmeldeversuche aber je Adresse. Damit eine einzelne Person das Limit nicht
 * für alle Lehrkräfte aufbraucht, sind Fehlversuche je Person begrenzt.
 */
export type PasswordCheck = { ok: true } | { ok: false; status: 400 | 429; error: string }

const MAX_FAILURES = 5
const WINDOW_MS = 10 * 60_000

export const passwordCheckLimiter = createAttemptLimiter({ max: MAX_FAILURES, windowMs: WINDOW_MS })

export async function verifyCurrentPassword(userId: string, email: string, password: string): Promise<PasswordCheck> {
  const wait = passwordCheckLimiter.blockedFor(userId)
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60)
    return { ok: false, status: 429, error: `Zu viele Fehlversuche. Bitte versuche es in ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'} erneut.` }
  }

  const verifier = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await verifier.auth.signInWithPassword({ email, password })
  if (!error) {
    passwordCheckLimiter.reset(userId)
    // scope „local“ beendet nur die eben erzeugte Sitzung, nicht die der Person
    await verifier.auth.signOut({ scope: 'local' }).catch(() => {})
    return { ok: true }
  }
  if (error.status === 429) return { ok: false, status: 429, error: 'Zu viele Versuche. Bitte warte einen Moment.' }
  passwordCheckLimiter.recordFailure(userId)
  return { ok: false, status: 400, error: 'Das aktuelle Passwort stimmt nicht.' }
}

/** Konten ohne eigenes Passwort (nur Google/Apple) können es nicht bestätigen */
export function accountHasPassword(appMetadata: Record<string, unknown> | undefined): boolean {
  const providers = (appMetadata?.providers as string[] | undefined) ?? [appMetadata?.provider as string | undefined]
  return providers.includes('email')
}
