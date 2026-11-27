import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Einen Testlauf löschen (PROJ-134): der eigene, oder jeder zu einem Nachweis, den man bearbeiten darf */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params
  if (!UUID_RE.test(id) || !UUID_RE.test(sessionId)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  // Zeilenschutz: ohne Zugriff auf den Nachweis kein Löschen
  const { data: assessment } = await supabase.from('graded_assessments').select('id').eq('id', id).maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const service = createServiceClient()
  const { data: trial } = await service
    .from('exam_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('trial_assessment_id', id)
    .maybeSingle()
  if (!trial) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { error } = await service.from('exam_sessions').delete().eq('id', sessionId).eq('trial_assessment_id', id)
  if (error) return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
