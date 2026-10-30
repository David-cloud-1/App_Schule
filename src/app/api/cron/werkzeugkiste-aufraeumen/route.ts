import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase-server'
import { ABLAUF_TABELLE, loescheDateien } from '@/lib/werkzeugkiste-server'
import { entferneAlteSkripte } from '@/lib/werkzeugkiste-materialien-server'

export const maxDuration = 300

/** Höchstens so viele Abläufe je Lauf — der Rest folgt am nächsten Tag */
const JE_LAUF = 200

function erlaubt(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const kopf = request.headers.get('authorization') ?? ''
  if (!secret) return false
  const soll = Buffer.from(`Bearer ${secret}`)
  const ist = Buffer.from(kopf)
  return soll.length === ist.length && timingSafeEqual(soll, ist)
}

/**
 * GET /api/cron/werkzeugkiste-aufraeumen (PROJ-51, erweitert in PROJ-52) —
 * täglicher Zeitplan von Vercel. Zwei Aufgaben:
 *  1. Entwürfe löschen, die seit 7 Tagen nicht bearbeitet wurden, samt Dateien.
 *     Fertige Materialien haben keinen Ablauftermin (laeuft_ab_am ist leer) und
 *     kommen hier nie vor.
 *  2. Bei fertigen Materialien Skript und Einlesung 12 Monate nach dem
 *     Hochladen entfernen; Ergebnis, Antwort und Vorschau bleiben.
 * Ohne gültiges CRON_SECRET: 401.
 */
export async function GET(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: 'nicht erlaubt' }, { status: 401 })

  const service = createServiceClient()
  const { data, error } = await service
    .from(ABLAUF_TABELLE)
    .select('id, owner_id')
    // Nur Entwürfe: ein fertiges Material wird hier nie gelöscht, auch wenn sein Termin je gesetzt wäre
    .eq('status', 'laeuft')
    .lt('laeuft_ab_am', new Date().toISOString())
    .order('laeuft_ab_am', { ascending: true })
    .limit(JE_LAUF)
  if (error) return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 })

  const abgelaufen = (data ?? []) as { id: string; owner_id: string }[]
  let geloescht = 0
  for (const a of abgelaufen) {
    try {
      await loescheDateien(service, a.owner_id, a.id)
      const { error: e } = await service.from(ABLAUF_TABELLE).delete().eq('id', a.id)
      if (!e) geloescht++
    } catch {
      // Einzelner Fehler hält den Rest nicht auf; der Ablauf bleibt bis morgen stehen
    }
  }

  let skripteEntfernt = 0
  try {
    skripteEntfernt = await entferneAlteSkripte(service, new Date(), JE_LAUF)
  } catch {
    // Die zweite Aufgabe darf die erste nicht entwerten; sie läuft morgen wieder
  }
  return NextResponse.json({ geloescht, gefunden: abgelaufen.length, skripteEntfernt })
}
