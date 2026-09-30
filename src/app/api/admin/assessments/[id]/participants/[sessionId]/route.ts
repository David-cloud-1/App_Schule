import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, assertCanAdminDepartment } from '../../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

const Schema = z.object({ excluded: z.boolean() })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  const { id, sessionId } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  // graded_assessments ist RLS-seitig streng bereichsgebunden — dieselbe
  // Prüfung hier, bevor die Service-Role-Route unten RLS umgeht (PROJ-24).
  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('department_id')
    .eq('id', id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const forbidden = assertCanAdminDepartment(auth, assessment.department_id as string)
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
  const { error } = await service
    .from('exam_sessions')
    .update({ excluded_from_grading: parsed.data.excluded })
    .eq('id', sessionId)
    .eq('assessment_id', id)

  if (error) return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
