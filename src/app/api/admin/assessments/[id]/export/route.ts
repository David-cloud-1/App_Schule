import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { buildParticipantRows, type SessionRow } from '@/lib/graded-assessments'

function csvEscape(value: string): string {
  if (/[;"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('title, part, grading_scale')
    .eq('id', id)
    .single()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const service = createServiceClient()
  const { data: sessions } = await service
    .from('exam_sessions')
    .select('id, participant_name, started_at, ended_at, status, results_json, excluded_from_grading')
    .eq('assessment_id', id)
    .order('participant_name', { ascending: true })

  const rows = (sessions ?? []) as unknown as SessionRow[]
  const participants = buildParticipantRows(rows, assessment.part, assessment.grading_scale)

  const header = ['Name', 'Punkte', 'Von', 'Prozent', 'Note', 'Dauer (Min.)', 'Abgegeben', 'Zaehlt in Wertung']
  const lines = [header.join(';')]
  for (const p of participants) {
    lines.push([
      csvEscape(p.name),
      p.points != null ? String(p.points) : '',
      p.totalPoints != null ? String(p.totalPoints) : '',
      p.percent != null ? String(p.percent) : '',
      p.grade != null ? String(p.grade) : '',
      p.durationMinutes != null ? String(p.durationMinutes) : '',
      p.submittedAt ? new Date(p.submittedAt).toLocaleString('de-DE') : 'Schreibt noch',
      p.excluded ? 'Nein' : 'Ja',
    ].join(';'))
  }

  // UTF-8 BOM so Excel renders Umlaute correctly.
  const csv = '﻿' + lines.join('\r\n')
  const filename = `${assessment.title.replace(/[^\w\- ]/g, '')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
