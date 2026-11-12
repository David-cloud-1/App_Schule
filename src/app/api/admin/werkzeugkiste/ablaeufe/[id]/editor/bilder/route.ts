import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { fehler, kern, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import { bildQuelle, editorZeileOderFehler } from '@/lib/werkzeugkiste-editor-server'
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
 *   {}      → {bilder: [{pfad, vorschau, breite, hoehe}], mehr}
 *   {pfad}  → {pfad, bild, breite, hoehe}   (Arbeitsgröße für Bild-Block und Bildzuordnung)
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
    const quelle = await bildQuelle(createServiceClient(), zeile)
    const einlesung = quelle ? { url: quelle.url } : null
    if (eingabe.data.pfad) {
      if (!einlesung) return fehler('Dieses Bild gibt es im Material nicht.', 404)
      const r = await kern<MaterialBild & { bild: string }>('/api/editor/bild', { einlesung, pfad: eingabe.data.pfad })
      return NextResponse.json({ pfad: r.pfad, bild: r.bild, breite: r.breite, hoehe: r.hoehe })
    }
    if (!einlesung) return NextResponse.json({ bilder: [], mehr: false })
    const r = await kern<{ bilder: MaterialBild[]; mehr: boolean }>('/api/editor/bilder', { einlesung })
    return NextResponse.json({ bilder: Array.isArray(r.bilder) ? r.bilder : [], mehr: !!r.mehr })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
