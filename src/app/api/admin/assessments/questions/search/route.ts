import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { loadCandidates } from '@/lib/assessment-candidates'
import { lookupQuestions, searchQuestions, MAX_LOOKUP_IDS } from '@/lib/assessment-question-search'

const ROUTE = 'api/admin/assessments/questions/search'

const searchSchema = z.object({
  action: z.literal('search'),
  departmentId: z.string().uuid(),
  text: z.string().max(200).default(''),
  subjects: z.array(z.string().max(40)).max(30).default([]),
  topics: z.array(z.string().max(200)).max(100).default([]),
  level: z.enum(['leicht', 'mittel', 'schwer']).nullable().default(null),
  offset: z.number().int().min(0).max(100000).default(0),
})

const lookupSchema = z.object({
  action: z.literal('lookup'),
  departmentId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1).max(MAX_LOOKUP_IDS),
})

const bodySchema = z.discriminatedUnion('action', [searchSchema, lookupSchema])

/**
 * PROJ-133, Schritt 2 „Prüfen“: Fragen suchen statt alle auf einmal laden.
 * Rein lesend. `search` liefert höchstens 25 Treffer je Anfrage samt Gesamtzahl,
 * `lookup` holt Fragen per Nummer (Übergabe aus „Schwierig“). Es erscheinen nur
 * Fragen, die für Nachweise zulässig sind (Bereichs-Pool plus eigene
 * „nur für Nachweise“-Fragen); der Server prüft das beim Anlegen erneut.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
  }
  const body = parsed.data

  try {
    const { all } = await loadCandidates(supabase, user.id, body.departmentId)
    if (body.action === 'lookup') {
      return NextResponse.json(lookupQuestions(all, body.ids))
    }
    return NextResponse.json(
      searchQuestions(all, {
        text: body.text,
        subjects: body.subjects,
        topics: body.topics,
        level: body.level,
        offset: body.offset,
      }),
    )
  } catch (err) {
    console.error(`[${ROUTE}]`, err)
    return NextResponse.json({ error: 'Die Suche hat nicht geklappt. Bitte versuche es erneut.' }, { status: 500 })
  }
}
