import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import {
  HILFE_ANGEBOT_TABELLE,
  hilfeAngebotAbfrageSchema,
  hilfeAngebotSpeichernSchema,
  type HilfeAngebot,
  type HilfeAngebotAntwort,
} from '@/lib/werkzeugkiste-hilfe-angebot'
import { fehler, ungueltig } from '@/lib/werkzeugkiste-server'

const KEIN_CACHE = { 'Cache-Control': 'no-store' }

/**
 * GET /api/admin/werkzeugkiste/hilfe-angebot?werkzeug= (PROJ-87) — hat die
 * angemeldete Lehrkraft das Angebot „Neu hier? Ich führe dich durch.“ für
 * dieses Werkzeug schon beantwortet? Nur die eigene Zeile (RLS + owner_id).
 */
export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const parsed = hilfeAngebotAbfrageSchema.safeParse({
    werkzeug: new URL(request.url).searchParams.get('werkzeug') ?? undefined,
  })
  if (!parsed.success) return ungueltig(parsed.error)

  const { data, error } = await auth.supabase
    .from(HILFE_ANGEBOT_TABELLE)
    .select('antwort')
    .eq('owner_id', auth.user.id)
    .eq('werkzeug', parsed.data.werkzeug)
    .maybeSingle()
  if (error) return fehler('Das Angebot konnte gerade nicht geprüft werden.', 500)

  const antwort = (data as { antwort: HilfeAngebotAntwort } | null)?.antwort ?? null
  const ergebnis: HilfeAngebot = { werkzeug: parsed.data.werkzeug, beantwortet: antwort !== null, antwort }
  return NextResponse.json(ergebnis, { headers: KEIN_CACHE })
}

/**
 * PUT /api/admin/werkzeugkiste/hilfe-angebot (PROJ-87) — Antwort merken
 * ({ werkzeug, antwort: 'ja' | 'nein' }). Höchstens eine Zeile je Konto und
 * Werkzeug; wer erneut antwortet (z. B. auf einem zweiten Gerät), überschreibt
 * mit der letzten Antwort.
 */
export async function PUT(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fehler('Ungültige Anfrage.', 400)
  }
  const parsed = hilfeAngebotSpeichernSchema.safeParse(body)
  if (!parsed.success) return ungueltig(parsed.error)

  const { error } = await auth.supabase.from(HILFE_ANGEBOT_TABELLE).upsert(
    {
      owner_id: auth.user.id,
      werkzeug: parsed.data.werkzeug,
      antwort: parsed.data.antwort,
      beantwortet_am: new Date().toISOString(),
    },
    { onConflict: 'owner_id,werkzeug' },
  )
  if (error) return fehler('Die Antwort konnte gerade nicht gespeichert werden.', 500)

  const ergebnis: HilfeAngebot = { werkzeug: parsed.data.werkzeug, beantwortet: true, antwort: parsed.data.antwort }
  return NextResponse.json(ergebnis, { headers: KEIN_CACHE })
}
