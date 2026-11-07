import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../_lib/auth'

const BodySchema = z.object({ blocked: z.boolean() })

/**
 * Frage für künftige Nachweise sperren oder wieder freigeben (PROJ-75). Zum
 * Üben bleibt sie unverändert. Die Änderung läuft über den normalen
 * Zeilenschutz von `questions` und steht damit im Änderungsverlauf (PROJ-47).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })

  const { data, error } = await supabase
    .from('questions')
    .update({ blocked_for_assessments: parsed.data.blocked })
    .eq('id', id)
    .select('id, question_text')
  if (error) {
    console.error('[PUT /api/admin/questions/:id/assessment-block]', error)
    return NextResponse.json({ error: 'Das hat nicht geklappt. Bitte versuche es erneut.' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Frage nicht gefunden oder keine Berechtigung.' }, { status: 404 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: parsed.data.blocked ? 'question.block_for_assessments' : 'question.unblock_for_assessments',
    object_type: 'question',
    object_id: id,
    object_label: String(data[0].question_text ?? '').slice(0, 120),
  })
  return NextResponse.json({ blocked: parsed.data.blocked })
}
