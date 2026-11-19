import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ZodType } from 'zod'
import { kalenderErrorStatus } from '@/lib/kalender'

/**
 * Gemeinsame Helfer der Kalender-Schnittstellen (PROJ-120). Alle Lese- und
 * Schreibwege laufen über die Datenbank-Funktionen abw_*; sie prüfen Rolle,
 * Rechte, Version und Eingaben selbst. Die Routen prüfen vorab nur die
 * Anmeldung (requireTeacherOrAdmin) und die Form der Eingabe.
 */

const GENERIC_ERROR = 'Das hat nicht geklappt. Bitte versuche es erneut.'

export const NO_STORE = { 'Cache-Control': 'private, no-store' }

export function kalenderRpcError(route: string, error: { code?: string; message?: string }): NextResponse {
  const status = kalenderErrorStatus(error.code)
  if (status) return NextResponse.json({ error: error.message ?? GENERIC_ERROR }, { status })
  console.error(`[${route}]`, error)
  return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 })
}

export async function callKalender<T = unknown>(
  supabase: SupabaseClient,
  route: string,
  fn: string,
  args?: Record<string, unknown>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) return { data: null, error: kalenderRpcError(route, error) }
  return { data: data as T, error: null }
}

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
    const issue = parsed.error.issues[0]
    return {
      data: null,
      error: NextResponse.json(
        { error: issue?.message ?? 'Ungültige Eingabe.', field: issue?.path?.[0] ?? null },
        { status: 400 }
      ),
    }
  }
  return { data: parsed.data, error: null }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string | undefined | null): value is string {
  return !!value && UUID.test(value)
}

export const NOT_FOUND = () => NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })

/** Eingabe des Formulars → Parameter von abw_anlegen / abw_aendern. */
export function eintragParams(v: {
  person_id: string
  art_id: string
  datum_von: string
  datum_bis: string
  ganztaegig: boolean
  zeit_von?: string | null
  zeit_bis?: string | null
  alle_abteilungen: boolean
  abteilungen: string[]
  freitext: string | null
  notiz: string | null
}) {
  return {
    p_person_id: v.person_id,
    p_art_id: v.art_id,
    p_von: v.datum_von,
    p_bis: v.datum_bis,
    p_ganztaegig: v.ganztaegig,
    p_zeit_von: v.ganztaegig ? null : (v.zeit_von ?? null),
    p_zeit_bis: v.ganztaegig ? null : (v.zeit_bis ?? null),
    p_alle: v.alle_abteilungen,
    p_abteilungen: v.alle_abteilungen ? [] : v.abteilungen,
    p_freitext: v.freitext,
    p_notiz: v.notiz,
  }
}
