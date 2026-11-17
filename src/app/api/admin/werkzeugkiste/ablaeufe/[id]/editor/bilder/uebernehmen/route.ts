import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { speicherPruefen } from '@/lib/werkzeugkiste-materialien-server'
import { fehler, ungueltig } from '@/lib/werkzeugkiste-server'
import { editorZeileOderFehler, ladeEditorZeile } from '@/lib/werkzeugkiste-editor-server'
import { kopiereBilder } from '@/lib/werkzeugkiste-bilder-kopie-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

const BILD_NAME = /^images\/[A-Za-z0-9_][A-Za-z0-9_.-]{0,120}$/

const eingabeSchema = z
  .object({
    von: z.string().uuid(),
    pfade: z
      .array(z.string().max(160).regex(BILD_NAME).refine((p) => !p.split('/').includes('..')))
      .min(1)
      .max(40),
    seitenGroesse: z.number().int().min(0).max(50_000_000),
  })
  .strict()

const NUR_EIGENE = 'Du kannst Blöcke nur zwischen deinen eigenen Materialien übertragen.'

/**
 * POST …/ablaeufe/:id/editor/bilder/uebernehmen (PROJ-102) — Bilder aus einem anderen **eigenen**
 * Material in dieses Material übernehmen (Einfügen aus der Zwischenablage). Das Ziel bekommt eine
 * eigene Kopie unter neuem Namen. Bevor etwas geschrieben wird, prüft der Server Anzahl und
 * Seitengröße: Reicht der Platz nicht, wird nichts kopiert. Namen kommen nie als Pfad nach oben
 * in den Speicher; den Zielnamen vergibt immer der Server.
 *   → 200 {zuordnung: {alter Name: neuer Name}, fehlend: [Namen ohne Bild]}
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const eingabe = eingabeSchema.safeParse(await request.json().catch(() => ({})))
  if (!eingabe.success) return ungueltig(eingabe.error)
  const { von, seitenGroesse } = eingabe.data
  const pfade = [...new Set(eingabe.data.pfade)]

  const { zeile: ziel, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!ziel) return antwort
  if (ziel.owner_id !== auth.user.id) return fehler(NUR_EIGENE, 403)
  // Im selben Material zeigen beide Blöcke auf dasselbe Bild: nichts zu kopieren
  if (von === ziel.id) return NextResponse.json({ zuordnung: {}, fehlend: [] })

  const quelle = await ladeEditorZeile(auth.supabase, von)
  // Material inzwischen gelöscht: Die Blöcke kommen ohne Bild (die App weist darauf hin)
  if (!quelle) return NextResponse.json({ zuordnung: {}, fehlend: pfade })
  if (quelle.owner_id !== auth.user.id) return fehler(NUR_EIGENE, 403)

  const gesperrt = await speicherPruefen(auth.supabase)
  if (gesperrt) return gesperrt

  const ergebnis = await kopiereBilder(createServiceClient(), quelle, ziel, pfade, seitenGroesse)
  return ergebnis instanceof NextResponse ? ergebnis : NextResponse.json(ergebnis)
}
