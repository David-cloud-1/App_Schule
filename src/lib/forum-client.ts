/**
 * Dünner Fetch-Helfer für die Lehrerzimmer-Schnittstellen (PROJ-63): liefert
 * entweder die Daten oder einen verständlichen Fehlertext. Wirft nie.
 */
export type ForumResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }

const NETWORK_ERROR = 'Keine Verbindung. Bitte versuche es erneut.'
const GENERIC_ERROR = 'Das hat nicht geklappt. Bitte versuche es erneut.'

export async function forumRequest<T = unknown>(url: string, init?: RequestInit): Promise<ForumResult<T>> {
  try {
    const headers: Record<string, string> = init?.body ? { 'Content-Type': 'application/json' } : {}
    const res = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string>) } })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const message = typeof json?.error === 'string' ? json.error : GENERIC_ERROR
      return { ok: false, status: res.status, error: message }
    }
    return { ok: true, data: json as T }
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR }
  }
}

export const forumJson = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
})
