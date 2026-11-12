import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { fehler, kern, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import { bildQuelle, editorZeileOderFehler } from '@/lib/werkzeugkiste-editor-server'
import { eigeneListe, leseEigenesBild } from '@/lib/werkzeugkiste-bilder-server'
import { istEigenerPfad } from '@/lib/werkzeugkiste-bilder'
import { einlesungPfad } from '@/lib/werkzeugkiste-server'
import type { MaterialBild } from '@/lib/werkzeugkiste-editor'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

/** Ein Bildname aus dem Paket des Materials, z. B. `images/seite3_x42.png` – nie ein Pfad nach oben */
const eingabeSchema = z
  .object({
    pfad: z
      .string()
      .max(300)
      .regex(/^images\/[^\\]+$/)
      .refine((p) => !p.split('/').includes('..'))
      .optional(),
  })
  .strict()

/**
 * POST …/ablaeufe/:id/editor/bilder (PROJ-90) — Bilder des Materials für die
 * Bildauswahl im Katalog. Die Bilder liegen gepackt in der Einlesung bzw. im
 * Bilder-Auszug; nur der Kern öffnet dieses Paket und verkleinert sie.
 *   {}      → {bilder: [{pfad, vorschau, breite, hoehe}], mehr, skript}
 *   {pfad}  → {pfad, bild, breite, hoehe}   (Arbeitsgröße für Bild-Block und Bildzuordnung)
 * PROJ-92: Die Liste enthält auch die hochgeladenen Bilder des Materials (zuerst);
 * `skript` sagt, ob das Skript noch da ist (sonst nur der Bilder-Auszug).
 * Gespeichert wird nichts.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const eingabe = eingabeSchema.safeParse(await request.json().catch(() => ({})))
  if (!eingabe.success) return ungueltig(eingabe.error)
  const { zeile, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!zeile) return antwort
  try {
    const service = createServiceClient()
    // Hochgeladene Bilder liegen einzeln im Ordner des Materials, nicht im Paket
    if (eingabe.data.pfad && istEigenerPfad(eingabe.data.pfad)) {
      const bild = await leseEigenesBild(service, zeile, eingabe.data.pfad)
      if (bild) return NextResponse.json({ pfad: eingabe.data.pfad, bild, breite: 0, hoehe: 0 })
    }
    const quelle = await bildQuelle(service, zeile)
    const einlesung = quelle ? { url: quelle.url } : null
    if (eingabe.data.pfad) {
      if (!einlesung) return fehler('Dieses Bild gibt es im Material nicht.', 404)
      const r = await kern<MaterialBild & { bild: string }>('/api/editor/bild', { einlesung, pfad: eingabe.data.pfad })
      return NextResponse.json({ pfad: r.pfad, bild: r.bild, breite: r.breite, hoehe: r.hoehe })
    }
    const eigene = await eigeneListe(service, zeile)
    const skript = quelle?.pfad === einlesungPfad(zeile.owner_id, zeile.id)
    if (!einlesung) return NextResponse.json({ bilder: eigene, mehr: false, skript })
    const r = await kern<{ bilder: MaterialBild[]; mehr: boolean }>('/api/editor/bilder', { einlesung })
    const eigenePfade = new Set(eigene.map((b) => b.pfad))
    const aus = (Array.isArray(r.bilder) ? r.bilder : []).filter((b) => !eigenePfade.has(b.pfad))
    return NextResponse.json({ bilder: [...eigene, ...aus], mehr: !!r.mehr, skript })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
