import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'
import {
  applyGrading,
  snapshotQuestionIds,
  type GradeBoundary,
  type SessionRow,
} from '@/lib/graded-assessments'
import { fetchAnswerKey } from '@/lib/answer-key'
import { analyzeAssessment } from '@/lib/assessment-analysis'
import type { CopyReviewRow } from '@/lib/assessment-copy-types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Prüfbericht für den Entwurf einer Kopie (PROJ-79): je Frage die Ampel aus dem Durchlauf des
 * Originals (PROJ-75), ein Hinweis auf spätere Änderungen und Platzhalter für Fragen, die nicht mehr
 * verfügbar sind. Liefert nur Kennzahlen, keine Namen und keine Einzelantworten.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { data: copy } = await supabase
    .from('graded_assessments')
    .select('id, department_id, status, draft_question_ids, copied_from_id, copied_from_title, created_by')
    .eq('id', id)
    .single()
  if (!copy) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (copy.status !== 'draft' || copy.copied_from_title === null) {
    return NextResponse.json({ isCopy: false })
  }

  try {
    const ids: string[] = copy.draft_question_ids ?? []
    const selectable = await fetchSelectableQuestions(supabase, copy.department_id, copy.created_by)
    const byId = new Map(selectable.map((q) => [q.id, q]))

    // Original: nur wenn die Person es sehen darf (Zeilenschutz) und es ausgewertet werden kann
    const source = copy.copied_from_id
      ? (
          await supabase
            .from('graded_assessments')
            .select('id, part, grading_scale, status, opens_at, created_at, excluded_question_ids')
            .eq('id', copy.copied_from_id)
            .maybeSingle()
        ).data
      : null

    const itemById = new Map<string, ReturnType<typeof analyzeAssessment>['items'][number]>()
    let participants = 0
    let referenceTime: string | null = null
    const service = createServiceClient()
    if (source && source.status !== 'draft') {
      referenceTime = source.opens_at as string
      const { data: sessions } = await service
        .from('exam_sessions')
        .select('id, user_id, participant_name, started_at, ended_at, status, results_json, excluded_from_grading')
        .eq('assessment_id', source.id)
        .order('started_at', { ascending: true })
      const rawRows = (sessions ?? []) as unknown as SessionRow[]
      if (rawRows.length > 0) {
        const key = await fetchAnswerKey(snapshotQuestionIds(rawRows, source.part))
        const rows = applyGrading(
          rawRows,
          source.part,
          key,
          source.grading_scale as GradeBoundary[],
          (source.excluded_question_ids as string[] | null) ?? [],
        )
        const analysis = analyzeAssessment(rows, source.part)
        participants = analysis.participants
        for (const item of analysis.items) itemById.set(item.id, item)
      }
    } else if (source) {
      referenceTime = source.created_at as string
    }

    // Geändert seit dem Durchlauf: Eintrag im Änderungsverlauf nach dem Start des Originals
    const changed = new Set<string>()
    if (referenceTime && itemById.size > 0) {
      const wanted = ids.filter((qid) => itemById.has(qid))
      for (let i = 0; i < wanted.length; i += 100) {
        const { data } = await service
          .from('content_versions')
          .select('content_id')
          .eq('content_type', 'question')
          .in('change_type', ['updated', 'restored'])
          .gt('created_at', referenceTime)
          .in('content_id', wanted.slice(i, i + 100))
          .limit(1000)
        for (const row of data ?? []) changed.add(row.content_id as string)
      }
    }

    const rows: CopyReviewRow[] = ids.map((qid, index) => {
      const q = byId.get(qid)
      const item = itemById.get(qid)
      return {
        id: qid,
        position: index + 1,
        text: q?.question_text ?? null,
        topic: q?.topic ?? null,
        available: !!q,
        blocked: q?.blocked ?? false,
        light: item?.light ?? 'none',
        reasons: item?.reasons ?? [],
        correctRate: item?.correctRate ?? null,
        discrimination: item?.discrimination ?? null,
        changed: changed.has(qid),
      }
    })

    return NextResponse.json({
      isCopy: true,
      sourceId: source?.id ?? null,
      sourceTitle: copy.copied_from_title,
      analysisAvailable: participants > 0,
      participants,
      unavailableCount: rows.filter((r) => !r.available).length,
      rows,
    })
  } catch (err) {
    console.error('[GET /api/admin/assessments/[id]/copy-review]', err)
    return NextResponse.json({ error: 'Der Prüfbericht konnte nicht geladen werden.' }, { status: 500 })
  }
}
