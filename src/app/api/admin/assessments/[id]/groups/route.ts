import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin, assertCanViewAssessment } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  buildGroupOrders,
  GROUP_LABELS,
  groupDistribution,
  isGroupLabel,
  isGroupOrders,
  optionLetter,
  questionsNeedingReview,
  type GroupLabel,
  type GroupOrders,
  type MixQuestion,
} from '@/lib/assessment-groups'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type KeyRow = { number: number; id: string; text: string; options: string[]; correctLetter: string | null }

/**
 * Gruppen eines Nachweises (PROJ-76). Im Entwurf: Vorschau von Gruppe A/B aus dem
 * Mischwert (nichts wird gespeichert). Nach dem Öffnen: die eingefrorene Reihenfolge.
 * Liefert je Gruppe Fragenfolge mit richtigem Buchstaben — Grundlage für Vorschau und
 * Lösungsschlüssel. Nur für Lehrkräfte; die Antworten bleiben für Azubis unsichtbar.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('title, status, groups_enabled, group_mix_seed, group_orders, question_ids_snapshot, draft_question_ids, department_id, created_by, shared_with_department, exam_question_sets(question_ids)')
    .eq('id', id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const forbidden = assertCanViewAssessment(auth, assessment)
  if (forbidden) return forbidden
  if (!assessment.groups_enabled) {
    return NextResponse.json({ error: 'Dieser Nachweis hat keine Gruppen.' }, { status: 404 })
  }

  const draft = assessment.status === 'draft'
  const set = assessment.exam_question_sets as unknown as { question_ids: string[] } | null
  const questionIds: string[] = draft
    ? (assessment.draft_question_ids ?? set?.question_ids ?? [])
    : (assessment.question_ids_snapshot ?? [])

  const service = createServiceClient()
  const rows: { id: string; question_text: string; answer_options: { id: string; option_text: string; display_order: number; is_correct: boolean }[] }[] = []
  for (let i = 0; i < questionIds.length; i += 100) {
    const { data, error } = await service
      .from('questions')
      .select('id, question_text, answer_options(id, option_text, display_order, is_correct)')
      .in('id', questionIds.slice(i, i + 100))
    if (error) return NextResponse.json({ error: 'Fragen konnten nicht geladen werden.' }, { status: 500 })
    rows.push(...((data ?? []) as typeof rows))
  }
  const byId = new Map(rows.map((r) => [r.id, r]))
  const ordered = questionIds.map((qid) => byId.get(qid)).filter((r): r is (typeof rows)[number] => !!r)
  const mix: MixQuestion[] = ordered.map((r) => ({
    id: r.id,
    options: r.answer_options.map((o) => ({ id: o.id, text: o.option_text, order: o.display_order })),
  }))

  const orders: GroupOrders | null = draft
    ? buildGroupOrders(mix, (assessment.group_mix_seed as number | null) ?? 1)
    : isGroupOrders(assessment.group_orders) ? assessment.group_orders : null
  if (!orders) return NextResponse.json({ error: 'Gruppen sind noch nicht vorbereitet.' }, { status: 409 })

  const groups = {} as Record<GroupLabel, KeyRow[]>
  for (const label of GROUP_LABELS) {
    const order = orders[label]
    groups[label] = order.questionOrder
      .map((qid) => byId.get(qid))
      .filter((q): q is (typeof rows)[number] => !!q)
      .map((q, idx) => {
        const optRank = new Map((order.optionOrder[q.id] ?? []).map((oid, i) => [oid, i]))
        const opts = [...q.answer_options].sort((a, b) => (optRank.get(a.id) ?? 1e9) - (optRank.get(b.id) ?? 1e9))
        const correct = opts.findIndex((o) => o.is_correct)
        return {
          number: idx + 1,
          id: q.id,
          text: q.question_text,
          options: opts.map((o) => o.option_text),
          correctLetter: correct >= 0 ? optionLetter(correct + 1) : null,
        }
      })
  }

  const { data: sessions } = await service.from('exam_sessions').select('group_label').eq('assessment_id', id).limit(5000)
  const counts = groupDistribution((sessions ?? []).map((s) => (isGroupLabel(s.group_label) ? s.group_label : null)))

  return NextResponse.json({
    title: assessment.title,
    frozen: !draft,
    groups,
    counts,
    reviewQuestionIds: questionsNeedingReview(mix),
  })
}
