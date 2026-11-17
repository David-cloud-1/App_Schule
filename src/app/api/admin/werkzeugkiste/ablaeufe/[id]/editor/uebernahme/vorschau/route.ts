import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { kernWerkzeug } from '@/lib/werkzeugkiste-editor'
import { bildQuelle } from '@/lib/werkzeugkiste-editor-server'
import { eigeneFuerBau } from '@/lib/werkzeugkiste-bilder-server'
import { ablaufOrdner, fehler, kern, kernFehlerAntwort, leseAdresse, schreibAdresse, ungueltig } from '@/lib/werkzeugkiste-server'
import { miniStruktur, waehleInhalte } from '@/lib/werkzeugkiste-uebernahme'
import { auswahlSchema, ladeQuelle, quelleSchema, zielOderFehler } from '@/lib/werkzeugkiste-uebernahme-server'

export const maxDuration = 120

type Kontext = { params: Promise<{ id: string }> }

const eingabeSchema = z.object({ quelle: quelleSchema, auswahl: auswahlSchema }).strict()

/**
 * POST …/ablaeufe/:id/editor/uebernahme/vorschau (PROJ-108) — baut eine Mini-Seite aus dem Gewählten
 * (Deckblatt der Quelle plus nur die gewählten Themen und Blöcke) und legt sie als kurzlebige Datei
 * `uebernahme-vorschau.html` im Ordner des **Ziel-Materials** ab. Zurück kommt eine Leseadresse,
 * nie die Seite selbst. Bilder liest der Kern aus der Quelle (bei Regal-Material nur aus dem Auszug).
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
  if (inhalte.themen.length === 0 && inhalte.bloecke.length === 0) return fehler('Dazu gibt es nichts zu zeigen.', 400)
  const mini = miniStruktur(k.struktur, inhalte)

  try {
    const service = createServiceClient()
    const pfad = `${ablaufOrdner(ziel.zeile.owner_id, ziel.zeile.id)}/uebernahme-vorschau.html`
    const [quellePaket, schreib] = await Promise.all([bildQuelle(service, k.ablauf, k.nurAuszug), schreibAdresse(service, pfad)])
    if (!schreib) return fehler('Die Vorschau konnte nicht vorbereitet werden.', 502)
    const eigene = await eigeneFuerBau(service, k.ablauf, JSON.stringify(mini))
    const ergebnis = await kern<{ groesse?: number }>('/api/editor/bauen', {
      struktur: mini,
      werkzeug: kernWerkzeug(k.werkzeug),
      einstellungen: k.einstellungen,
      ...(quellePaket ? { einlesung: { url: quellePaket.url } } : {}),
      datei_ziel: schreib,
      ...(eigene.length ? { eigene_bilder: eigene } : {}),
    })
    const adresse = await leseAdresse(service, pfad)
    if (!adresse) return fehler('Die Vorschau konnte nicht geladen werden.', 502)
    return NextResponse.json({ adresse, groesse: Number(ergebnis.groesse) || 0 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}

