import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ZodType } from 'zod'
import { forumErrorStatus } from '@/lib/forum'

/**
 * Gemeinsame Helfer der Lehrerzimmer-Schnittstellen (PROJ-63). Alle
 * Schreib- und Lese-Wege laufen über die Datenbank-Funktionen forum_*; sie
 * prüfen Rolle, Besitz und Grenzen selbst. Die Routen prüfen vorab nur die
 * Anmeldung (requireTeacherOrAdmin) und die Form der Eingabe.
 */

const GENERIC_ERROR = 'Das hat nicht geklappt. Bitte versuche es erneut.'

/** Fehler einer Datenbank-Funktion → passende Antwort. */
export function forumRpcError(route: string, error: { code?: string; message?: string }): NextResponse {
  const status = forumErrorStatus(error.code)
  if (status) return NextResponse.json({ error: error.message ?? GENERIC_ERROR }, { status })
  console.error(`[${route}]`, error)
  return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 })
}

/** Ruft eine forum_*-Funktion auf; bei Fehler liegt die fertige Antwort in `error`. */
export async function callForum<T = unknown>(
  supabase: SupabaseClient,
  route: string,
  fn: string,
  args?: Record<string, unknown>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) return { data: null, error: forumRpcError(route, error) }
  return { data: data as T, error: null }
}

/** JSON-Body lesen und mit Zod prüfen; Fehler als fertige 400-Antwort. */
export async function parseBody<T>(
  request: NextRequest,
  schema: ZodType<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { data: null, error: NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }) }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return {
      data: null,
      error: NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, { status: 400 }),
    }
  }
  return { data: parsed.data, error: null }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID.test(value)
}

export const NOT_FOUND = () => NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
