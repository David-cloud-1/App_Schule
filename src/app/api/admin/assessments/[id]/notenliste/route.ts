import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  applyGrading,
  buildParticipantRows,
  snapshotQuestionIds,
  type GradeBoundary,
  type SessionRow,
} from '@/lib/graded-assessments'
import { fetchAnswerKey } from '@/lib/answer-key'
import {
  buildNotenlisteCsv,
  contentDisposition,
  hasExportableRows,
  notenlisteFilename,
  NOTENLISTE_COLUMNS,
  NOTENLISTE_SORTS,
} from '@/lib/notenliste-export'

const QuerySchema = z.object({
  columns: z
    .string()
    .default(NOTENLISTE_COLUMNS.join(','))
    .transform((v) => v.split(',').filter(Boolean))
    .pipe(z.array(z.enum(NOTENLISTE_COLUMNS)).min(1)),
  sort: z.enum(NOTENLISTE_SORTS).default('name'),
  split: z.enum(['0', '1']).default('0'),
})

/** PROJ-77: Notenliste für Excel. Der bisherige Export unter /export bleibt unverändert. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Auswahl.' }, { status: 400 })

  // Zugriff regelt die Datenbank-Regel: ohne Recht am Nachweis kommt hier nichts zurück
  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('title, part, grading_scale, excluded_question_ids')
    .eq('id', id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { data: sessions } = await createServiceClient()
    .from('exam_sessions')
    .select('id, user_id, participant_name, started_at, ended_at, status, results_json, excluded_from_grading, group_label')
    .eq('assessment_id', id)

  const rawRows = (sessions ?? []) as unknown as SessionRow[]
  const scale = assessment.grading_scale as GradeBoundary[]
  const key = await fetchAnswerKey(snapshotQuestionIds(rawRows, assessment.part))
  const graded = applyGrading(
    rawRows,
    assessment.part,
    key,
    scale,
    (assessment.excluded_question_ids as string[] | null) ?? [],
  )
  const participants = buildParticipantRows(graded, assessment.part, scale)

  if (!hasExportableRows(participants)) {
    return NextResponse.json({ error: 'Noch keine Abgaben zum Exportieren.' }, { status: 409 })
  }

  const csv = buildNotenlisteCsv(participants, {
    columns: parsed.data.columns,
    sort: parsed.data.sort,
    splitName: parsed.data.split === '1',
  })

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': contentDisposition(notenlisteFilename(assessment.title)),
      'Cache-Control': 'no-store',
    },
  })
}
