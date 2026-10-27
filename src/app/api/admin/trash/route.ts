import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../_lib/auth'
import { CONTENT_TABLE, isContentType } from '@/lib/content-history'

const QuerySchema = z.object({
  type: z.string().refine(isContentType, { message: 'Unbekannter Inhaltstyp' }),
})

const LABEL_COLUMNS: Record<string, string> = {
  question: 'id, question_text, deleted_at',
  topic: 'id, name, deleted_at',
  subject: 'id, name, code, deleted_at',
  exam_question_set: 'id, name, deleted_at',
}

/** Papierkorb je Inhaltstyp (PROJ-47) — nur Super-Admin und Bereichs-Admin. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, departmentId, isSuperAdmin } = auth

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' }, { status: 400 })
  }
  const type = parsed.data.type as keyof typeof CONTENT_TABLE
  const table = CONTENT_TABLE[type]

  let query = supabase
    .from(table)
    .select(LABEL_COLUMNS[type])
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(200)

  // Fragen/Themen/Prüfungssets haben keine eigene department_id-Spalte auf
  // Super-Admin-Ebene filterbar — Bereichs-Admin sieht hier nur, was zu
  // seinem Bereich gehört (Fächer direkt, Rest über Fach-Beziehung clientseitig
  // nicht trivial ohne Join; für Fragen/Themen/Sets daher bewusst nur
  // Super-Admin, bis PROJ-48 eine feinere Zuständigkeit bringt).
  if (type === 'subject' && !isSuperAdmin) {
    query = query.eq('department_id', departmentId)
  } else if (type !== 'subject' && !isSuperAdmin) {
    return NextResponse.json({ items: [] })
  }

  const { data, error } = await query
  if (error) {
    console.error('[GET /api/admin/trash]', error)
    return NextResponse.json({ error: 'Papierkorb konnte nicht geladen werden.' }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}
