import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, assertCanViewAssessment } from '../../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { applyGroupOrder, isGroupOrders } from '@/lib/assessment-groups'

const Schema = z
  .object({ excluded: z.boolean().optional(), group: z.enum(['A', 'B']).optional() })
  .refine((v) => v.excluded !== undefined || v.group !== undefined)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  const { id, sessionId } = await params
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  // graded_assessments ist RLS-seitig streng bereichsgebunden — dieselbe
  // Prüfung hier, bevor die Service-Role-Route unten RLS umgeht (PROJ-24).
  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('department_id, created_by, shared_with_department, part, groups_enabled, group_orders')
    .eq('id', id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const forbidden = assertCanViewAssessment(auth, assessment)
  if (forbidden) return forbidden

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const service = createServiceClient()

  // PROJ-76: Gruppe wechseln — nur solange noch keine Antwort gespeichert ist
  if (parsed.data.group) {
    if (!assessment.groups_enabled || !isGroupOrders(assessment.group_orders)) {
      return NextResponse.json({ error: 'Dieser Nachweis hat keine Gruppen.' }, { status: 400 })
    }
    const { data: session } = await service
      .from('exam_sessions')
      .select('id, status, group_label, results_json')
      .eq('id', sessionId)
      .eq('assessment_id', id)
      .maybeSingle()
    if (!session) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    if (session.status !== 'in_progress') {
      return NextResponse.json({ error: 'Dieser Teilnehmer hat schon abgegeben.' }, { status: 409 })
    }
    const results = (session.results_json ?? {}) as {
      parts?: Record<string, { id: string; answer_options?: { id: string; display_order: number }[] }[]>
      draft_answers?: Record<string, string>
    }
    if (Object.keys(results.draft_answers ?? {}).length > 0) {
      return NextResponse.json({ error: 'Dieser Teilnehmer hat schon Antworten gegeben. Die Gruppe lässt sich nicht mehr ändern.' }, { status: 409 })
    }
    if (session.group_label === parsed.data.group) return NextResponse.json({ success: true })
    const partKey = String(assessment.part)
    const current = results.parts?.[partKey] ?? []
    const reordered = applyGroupOrder(current, assessment.group_orders[parsed.data.group])
    // Nur ein laufender Versuch wird umgestellt (hat der Azubi zwischendurch abgegeben, passiert nichts)
    const { error: groupError } = await service
      .from('exam_sessions')
      .update({ group_label: parsed.data.group, results_json: { ...results, parts: { ...results.parts, [partKey]: reordered } } })
      .eq('id', sessionId)
      .eq('assessment_id', id)
      .eq('status', 'in_progress')
    if (groupError) return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const { error } = await service
    .from('exam_sessions')
    .update({ excluded_from_grading: parsed.data.excluded })
    .eq('id', sessionId)
    .eq('assessment_id', id)

  if (error) return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
