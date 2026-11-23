import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ZodType } from 'zod'
import { checklistenFehlerStatus, istChecklisteKennung, istVariante } from '@/lib/checklisten/katalog'

/**
 * Gemeinsame Helfer der Checklisten-Schnittstellen (PROJ-122). Die Haken sind
 * privat: Alle Zugriffe laufen mit der Sitzung der Person; Zeilenregeln der
 * Datenbank erlauben nur die eigenen Zeilen. Schreiben geht über die Funktionen
 * checkliste_* (atomar, idempotent). Eingaben und Fehlertexte enthalten nie
 * Daten über Dritte.
 */

const GENERIC_ERROR = 'Das hat nicht geklappt. Bitte versuche es erneut.'

export const NO_STORE = { 'Cache-Control': 'private, no-store' }

export const NOT_FOUND = () => NextResponse.json({ error: 'Diese Checkliste gibt es nicht.' }, { status: 404 })

/** Kennung aus der Adresse: nur bekannte Listen, sonst 404 (ohne die Datenbank zu fragen) */
export function listenKennung(id: string): string | null {
  return istChecklisteKennung(id) ? id : null
}

export function fehlerAntwort(route: string, error: { code?: string; message?: string }): NextResponse {
  const status = checklistenFehlerStatus(error.code)
  if (status === 400 || status === 409) {
    return NextResponse.json({ error: error.message ?? GENERIC_ERROR }, { status })
  }
  if (status === 403) {
    return NextResponse.json({ error: 'Das ist hier nicht erlaubt.' }, { status })
  }
  console.error(`[${route}]`, error.code ?? '', error.message ?? '')
  return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 })
}

export async function aufruf<T = unknown>(
  supabase: SupabaseClient,
  route: string,
  fn: string,
  args: Record<string, unknown>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) return { data: null, error: fehlerAntwort(route, error) }
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
      error: NextResponse.json({ error: issue?.message ?? 'Ungültige Eingabe.' }, { status: 400 }),
    }
  }
  return { data: parsed.data, error: null }
}

/** Gehört die Variante zur Liste? (leer/null ist erlaubt = keine Auswahl) */
export function varianteGueltig(checkliste: string, variante: string | null | undefined): boolean {
  return variante == null || istVariante(checkliste, variante)
}

export const VARIANTE_UNGUELTIG = () =>
  NextResponse.json({ error: 'Diese Auswahl gibt es für diese Checkliste nicht.' }, { status: 400 })
