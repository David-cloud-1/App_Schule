import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, actorNameOf } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { applyGroupOrder, buildGroupOrders, isGroupOrders, newMixSeed, type GroupLabel, type MixQuestion } from '@/lib/assessment-groups'
import { shuffle } from '@/lib/graded-assessments'

// PROJ-134: „Als Azubi ausprobieren“. Ein Testlauf ist eine eigene Sitzung der
// Lehrkraft mit trial_assessment_id. assessment_id bleibt leer, deshalb findet ihn
// keine Auswertung (Teilnehmer, Notenspiegel, Aufgabenanalyse, Fokus, Export,
// Aufgabenliste, automatisches Schließen).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MIN_TRIAL_QUESTIONS = 1
const MAX_TRIALS = 20

const StartSchema = z.object({ group: z.enum(['A', 'B']).optional() })

type Row = { id: string; question_text: string; type: string; difficulty: string | null; answer_options: { id: string; option_text: string; display_order: number }[] }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const parsed = StartSchema.safeParse(body ?? {})
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  // Zeilenschutz: wer den Nachweis nicht sehen darf, bekommt 404
  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('id, title, access_code, part, duration_minutes, status, question_ids_snapshot, draft_question_ids, groups_enabled, group_orders, group_mix_seed, exam_question_sets(question_ids)')
    .eq('id', id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (assessment.status === 'closed') {
    return NextResponse.json({ error: 'Ein geschlossener Nachweis lässt sich nicht mehr ausprobieren.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { count } = await service
    .from('exam_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('trial_assessment_id', id)
    .eq('user_id', user.id)
  if ((count ?? 0) >= MAX_TRIALS) {
    return NextResponse.json({ error: 'Du hast schon viele Testläufe. Lösche zuerst ein paar unter „Meine Testläufe“.' }, { status: 400 })
  }

  const set = assessment.exam_question_sets as unknown as { question_ids: string[] } | null
  const questionIds: string[] =
    assessment.status === 'open'
      ? (assessment.question_ids_snapshot ?? [])
      : (assessment.draft_question_ids ?? set?.question_ids ?? [])

  // Wie beim Beitritt: ohne Lösungen, der Schlüssel wird erst bei der Abgabe gelesen
  const rows: Row[] = []
  for (let i = 0; i < questionIds.length; i += 100) {
    const { data } = await service
      .from('questions')
      .select('id, question_text, type, difficulty, answer_options(id, option_text, display_order)')
      .in('id', questionIds.slice(i, i + 100))
    rows.push(...((data ?? []) as unknown as Row[]).map((r) => ({ ...r, answer_options: r.answer_options ?? [] })))
  }
  if (rows.length < MIN_TRIAL_QUESTIONS) {
    return NextResponse.json({ error: 'Für einen Testlauf braucht der Nachweis mindestens eine verfügbare Frage.' }, { status: 400 })
  }
  const byId = new Map(rows.map((r) => [r.id, r]))
  const ordered = questionIds.map((qid) => byId.get(qid)).filter((r): r is Row => !!r)

  let group: GroupLabel | null = null
  let finalRows: Row[]
  if (assessment.groups_enabled) {
    group = parsed.data.group ?? 'A'
    let orders = assessment.group_orders
    if (!isGroupOrders(orders)) {
      // Entwurf: Reihenfolge nur für diesen Testlauf berechnen
      const mix: MixQuestion[] = ordered.map((q) => ({
        id: q.id,
        options: (q.answer_options ?? []).map((o) => ({ id: o.id, text: o.option_text, order: o.display_order })),
      }))
      orders = buildGroupOrders(mix, (assessment.group_mix_seed as number | null) ?? newMixSeed())
    }
    finalRows = applyGroupOrder(ordered, orders[group])
  } else {
    finalRows = shuffle(ordered).map((q) => ({
      ...q,
      answer_options: shuffle(q.answer_options ?? []).map((opt, idx) => ({ ...opt, display_order: idx + 1 })),
    }))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, display_name')
    .eq('id', user.id)
    .maybeSingle()
  const name = actorNameOf(profile as { first_name?: string | null; last_name?: string | null; display_name?: string | null } | null) ?? 'Lehrkraft'

  const questions = finalRows.map((q) => ({ ...q, part: assessment.part, explanation: null, sample_answer: null }))
  const { data: session, error } = await supabase
    .from('exam_sessions')
    .insert({
      user_id: user.id,
      parts_selected: [assessment.part],
      started_at: new Date().toISOString(),
      status: 'in_progress',
      assessment_id: null,
      trial_assessment_id: assessment.id,
      group_label: group,
      participant_name: `Testlauf (${name})`,
      results_json: {
        durationMinutes: assessment.duration_minutes,
        assessment: { title: assessment.title, accessCode: assessment.access_code, released: false },
        parts: { [assessment.part]: questions },
      },
    })
    .select('id')
    .single()
  if (error || !session) {
    console.error('[POST testlauf]', error?.message)
    return NextResponse.json({ error: 'Der Testlauf konnte nicht gestartet werden.' }, { status: 500 })
  }
  return NextResponse.json({ sessionId: session.id })
}

/** Eigene Testläufe zu diesem Nachweis */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('exam_sessions')
    .select('id, started_at, ended_at, status, group_label, results_json')
    .eq('trial_assessment_id', id)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(MAX_TRIALS)
  if (error) return NextResponse.json({ error: 'Testläufe konnten nicht geladen werden.' }, { status: 500 })

  const trials = (data ?? []).map((s) => {
    const a = (s.results_json as { assessment?: { grade?: number; percent?: number } } | null)?.assessment
    return {
      id: s.id as string,
      startedAt: s.started_at as string,
      endedAt: (s.ended_at as string | null) ?? null,
      submitted: s.status !== 'in_progress',
      group: (s.group_label as string | null) ?? null,
      grade: a?.grade ?? null,
      percent: a?.percent ?? null,
    }
  })
  return NextResponse.json({ trials })
}
