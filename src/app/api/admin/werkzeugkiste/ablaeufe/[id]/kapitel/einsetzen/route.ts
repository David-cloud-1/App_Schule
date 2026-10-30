import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import {
  aktualisiere,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  ungueltig,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

const schema = z.object({
  index: z.number().int().min(0).max(500),
  antwort: z.string().min(1, 'Füge zuerst die Antwort der KI zum Kapitel ein.').max(500_000),
})

/**
 * POST …/ablaeufe/:id/kapitel/einsetzen (PROJ-52, Paket 2) — setzt die KI-Antwort
 * zu einem Kapitel an dessen Stelle in die gespeicherte Antwort ein. Alle anderen
 * Kapitel bleiben unangetastet. Die Prüfung gilt danach als veraltet und läuft
 * in der Oberfläche von selbst neu; die gebaute Datei bleibt bis zum Neubau die alte.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)

  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.antwort) return fehler('Füge zuerst die Antwort der KI ein.', 400)
  try {
    const r = await kern<{ antwort: string }>('/api/kapitel-einsetzen', {
      antwort: zeile.antwort,
      index: parsed.data.index,
      kapitel_antwort: parsed.data.antwort,
    })
    if (!r.antwort) return fehler('Das Kapitel konnte nicht eingesetzt werden.', 500)
    const neu = await aktualisiere(auth.supabase, zeile.id, { antwort: r.antwort, pruefung: null, schritt: Math.max(zeile.schritt, 4) })
    if (!neu) return fehler('Die Antwort konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu) })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
