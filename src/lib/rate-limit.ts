import { createClient } from '@supabase/supabase-js'

/**
 * Rate-Limit für angemeldete Schnittstellen. Der Zähler liegt in der Datenbank
 * (Tabelle `rate_limits`, Funktion `rate_limit_hit`), gilt also über alle
 * Server-Instanzen hinweg und braucht keinen zusätzlichen Dienst.
 *
 * Login, Registrierung und „Passwort vergessen“ laufen direkt vom Browser zu
 * Supabase Auth und werden hier NICHT erfasst – dafür gelten die Grenzen im
 * Supabase-Dashboard (siehe docs/production/rate-limiting.md).
 */
export interface RateLimitPolicy {
  bucket: 'schreiben' | 'teuer'
  max: number
  windowSeconds: number
}

const SCHREIBEND = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Teure Wege (KI-Aufrufe, Dateien einlesen): deutlich knapper als normales Schreiben. */
const TEUER = [
  /^\/api\/admin\/ai-generate\/upload(\/|$)/,
  /^\/api\/admin\/exam-sets\/extract(\/|$)/,
  /^\/api\/admin\/werkzeugkiste\/ablaeufe\/[^/]+\/(einlesen|direkt|weiterschreiben|fortsetzung)(\/|$)/,
]

/**
 * Welche Grenze gilt für diese Anfrage? `null` = keine (Lesezugriffe,
 * Zeitpläne und interne Arbeiter, die ein eigenes Geheimnis prüfen).
 */
export function rateLimitPolicy(method: string, pathname: string): RateLimitPolicy | null {
  if (!pathname.startsWith('/api/')) return null
  if (pathname.startsWith('/api/cron/') || pathname.startsWith('/api/intern/')) return null
  if (!SCHREIBEND.has(method.toUpperCase())) return null
  if (TEUER.some((re) => re.test(pathname))) return { bucket: 'teuer', max: 20, windowSeconds: 600 }
  return { bucket: 'schreiben', max: 120, windowSeconds: 60 }
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfter: number }

/**
 * Zählt den Aufruf. Bei jedem Fehler (Funktion fehlt, Datenbank nicht
 * erreichbar, kein Schlüssel) gilt „erlaubt“: Das Limit darf die App nie
 * lahmlegen, es soll nur Missbrauch bremsen.
 */
export async function checkRateLimit(userId: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { allowed: true }
  try {
    const service = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await service.rpc('rate_limit_hit', {
      p_key: `${userId}:${policy.bucket}`,
      p_max: policy.max,
      p_window_seconds: policy.windowSeconds,
    })
    if (error) return { allowed: true }
    const row = Array.isArray(data) ? data[0] : data
    if (!row || typeof row.allowed !== 'boolean') return { allowed: true }
    return row.allowed ? { allowed: true } : { allowed: false, retryAfter: Number(row.retry_after) || 60 }
  } catch {
    return { allowed: true }
  }
}
