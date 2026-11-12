import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { bremse } from '@/lib/schulrecht-limit'
import { kern, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import { fragePromptSchema, ohneZwischenspeicher } from '@/lib/schulrecht-server'

export const maxDuration = 30

/**
 * POST /api/admin/schulrecht/frage-prompt (PROJ-88) — „Mit meiner KI beantworten“.
 * Der Kern baut aus Frage und Fundstellen denselben Prompt wie für die
 * Aktennotiz (Wortlaut der Stellen, Verbot erfundener Fundstellen). Es gibt
 * bewusst keine Namenserkennung (Entscheidung 2026-11-11); die Oberfläche
 * zeigt den Hinweis „keine Namen“. Nichts wird gespeichert oder protokolliert.
 */
export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zuSchnell = bremse(auth.user.id)
  if (zuSchnell) return zuSchnell
  const parsed = fragePromptSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)
  try {
    const r = await kern<{ prompt: string }>('/api/recht/prompt', {
      sachverhalt: parsed.data.frage,
      fundstellen: parsed.data.fundstellen,
    })
    return ohneZwischenspeicher(NextResponse.json({ prompt: r.prompt }))
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
