import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { bildPfadeIn, ersetzeBildPfade } from '@/lib/werkzeugkiste-bloecke'
import { kopiereBilder } from '@/lib/werkzeugkiste-bilder-kopie-server'
import { speicherPruefen } from '@/lib/werkzeugkiste-materialien-server'
import { fehler, ungueltig } from '@/lib/werkzeugkiste-server'
import { UEBERNAHME_MAX_BYTES, waehleInhalte } from '@/lib/werkzeugkiste-uebernahme'
import { auswahlSchema, ladeQuelle, quelleSchema, zielOderFehler } from '@/lib/werkzeugkiste-uebernahme-server'
import type { Block, Thema } from '@/lib/werkzeugkiste-editor'

export const maxDuration = 120

type Kontext = { params: Promise<{ id: string }> }

const eingabeSchema = z
  .object({ quelle: quelleSchema, auswahl: auswahlSchema, seitenGroesse: z.number().int().min(0).max(50_000_000) })
  .strict()

/** Wie viele Bilder eine Übernahme höchstens mitbringt (wie beim Kopieren aus der Zwischenablage) */
const MAX_BILDER = 40
const BILD_NAME = /^images\/[A-Za-z0-9_][A-Za-z0-9_.-]{0,120}$/

/**
 * POST …/ablaeufe/:id/editor/uebernahme (PROJ-108) — übernimmt gewählte Themen und Blöcke aus
 * einem eigenen Material oder dem Regal in dieses Material. Der Server liest die Inhalte selbst
 * (Grundsatz G1), lässt Typen aus, die das Material nicht kennt, und kopiert die Bilder in die
 * Ablage dieses Materials. Alles oder nichts: Reicht der Platz nicht, wird nichts geschrieben.
 * Eingefügt wird danach im Browser über die zentrale Einsetzen-Funktion (ein Rückgängig-Schritt).
 *   → 200 {themen, bloecke, ausgelassen, fehlend, titel, herkunft?}
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const eingabe = eingabeSchema.safeParse(await request.json().catch(() => null))
  if (!eingabe.success) return ungueltig(eingabe.error)

  const ziel = await zielOderFehler(auth.supabase, auth.user.id, (await params).id)
  if (!ziel.zeile) return ziel.antwort
  const geladen = await ladeQuelle(auth.supabase, auth.user.id, eingabe.data.quelle)
  if (!geladen.quelle) return geladen.antwort
  const k = geladen.quelle

  const inhalte = waehleInhalte(k.struktur, eingabe.data.auswahl)
  let themen: Thema[] = inhalte.themen
  let bloecke: Block[] = inhalte.bloecke
  if (themen.length === 0 && bloecke.length === 0) {
    return fehler(inhalte.ausgelassen > 0 ? 'Nichts davon passt in dieses Material.' : 'Es ist nichts ausgewählt.', 400)
  }
  if (JSON.stringify({ themen, bloecke }).length > UEBERNAHME_MAX_BYTES) {
    return fehler('Das ist zu viel auf einmal. Bitte übernimm weniger auf einmal.', 413)
  }

  // Bilder: nur die, die in den gewählten Inhalten der Quelle stehen (die Namen nennt nie der Browser)
  let fehlend = 0
  const pfade = bildPfadeIn({ themen, bloecke }).filter((p) => BILD_NAME.test(p) && !p.split('/').includes('..'))
  if (pfade.length > MAX_BILDER) return fehler('Das sind zu viele Bilder auf einmal. Bitte übernimm weniger auf einmal.', 409)
  // Im selben Material zeigen beide Blöcke auf dasselbe Bild: nichts zu kopieren
  if (pfade.length > 0 && k.ablauf.id !== ziel.zeile.id) {
    const gesperrt = await speicherPruefen(auth.supabase)
    if (gesperrt) return gesperrt
    const r = await kopiereBilder(createServiceClient(), k.ablauf, ziel.zeile, pfade, eingabe.data.seitenGroesse, k.nurAuszug)
    if (r instanceof NextResponse) return r
    themen = ersetzeBildPfade(themen, r.zuordnung)
    bloecke = ersetzeBildPfade(bloecke, r.zuordnung)
    fehlend = r.fehlend.length
  }

  return NextResponse.json(
    { themen, bloecke, ausgelassen: inhalte.ausgelassen, fehlend, titel: k.titel, ...(k.herkunft ? { herkunft: k.herkunft } : {}) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
