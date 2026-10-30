import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { fehler, kern, kernFehlerAntwort, ladeEigenenAblauf, ungueltig, zeileZuAblauf } from '@/lib/werkzeugkiste-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

const wunschSchema = z.object({
  index: z.number().int().min(0).max(500),
  wunsch: z.string().trim().min(1, 'Bitte beschreibe, was am Kapitel geändert werden soll.').max(4000, 'Der Wunsch ist zu lang.'),
})

/**
 * GET  …/ablaeufe/:id/kapitel (PROJ-52, Paket 2) — Titel der Kapitel der gespeicherten Antwort.
 * POST …/ablaeufe/:id/kapitel — Prompt nur für ein Kapitel. Der Kern baut ihn aus
 * derselben Funktion wie die alte Werkzeugkiste, nichts wird hier nachgebaut.
 */
export async function GET(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.antwort) return NextResponse.json({ kapitel: [] })
  try {
    const r = await kern<{ kapitel: string[] }>('/api/kapitel-liste', { antwort: zeile.antwort })
    return NextResponse.json({ kapitel: (r.kapitel ?? []).map((t) => String(t).slice(0, 300)) })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}

export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = wunschSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)

  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.antwort) return fehler('Füge zuerst die Antwort der KI ein.', 400)
  const ablauf = zeileZuAblauf(zeile)
  try {
    const r = await kern<{ prompt: string; titel: string }>('/api/kapitel-prompt', {
      antwort: zeile.antwort,
      index: parsed.data.index,
      wunsch: parsed.data.wunsch,
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
    })
    return NextResponse.json({ prompt: r.prompt, titel: String(r.titel ?? '').slice(0, 300) })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
