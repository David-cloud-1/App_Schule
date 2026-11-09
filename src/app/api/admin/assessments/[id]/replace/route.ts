import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../_lib/auth'
import { loadCandidates } from '@/lib/assessment-candidates'
import { planBulkReplacement, replacementsFor, type ReplaceTarget } from '@/lib/assessment-replace'
import type { Candidate } from '@/lib/assessment-suggest'

const ROUTE = 'api/admin/assessments/[id]/replace'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FAIL = 'Das hat nicht geklappt. Bitte versuche es erneut.'

const uuid = z.string().uuid()
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('alternatives'), questionId: uuid }),
  z.object({ action: z.literal('bulk'), questionIds: z.array(uuid).min(1).max(200) }),
  z.object({
    action: z.literal('apply'),
    swaps: z.array(z.object({ from: uuid, to: uuid })).max(200).default([]),
    removes: z.array(uuid).max(200).default([]),
  }),
])

/** Was der Browser von einer Ersatzfrage sieht */
function publicView(c: Candidate) {
  return {
    id: c.id,
    text: c.question_text,
    topic: c.topic,
    level: c.level,
    correctRate: c.rate,
    rated: c.rated,
    isPrivate: c.isPrivate,
  }
}

/**
 * Schwache oder fehlende Fragen eines Entwurfs ersetzen (PROJ-79). `alternatives` und `bulk`
 * sind rein lesend und liefern Vorschläge nach den Regeln von PROJ-78 (gleiches Thema, nächstliegende
 * Stufe, nicht gesperrt, ohne offene Meldung, nicht schon im Entwurf). Erst `apply` schreibt, und
 * zwar so, dass jede Frage ihre Position behält.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
  const body = parsed.data

  const { data: draft } = await supabase
    .from('graded_assessments')
    .select('id, title, department_id, status, draft_question_ids, created_by')
    .eq('id', id)
    .single()
  if (!draft) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (draft.status !== 'draft') {
    return NextResponse.json({ error: 'Nur ein Entwurf kann geändert werden.' }, { status: 400 })
  }
  const current: string[] = draft.draft_question_ids ?? []

  try {
    const { all } = await loadCandidates(supabase, draft.created_by ?? user.id, draft.department_id)
    const byId = new Map(all.map((q) => [q.id, q]))
    const pool = all.filter((q) => !q.blocked && q.openReports === 0)
    const exclude = new Set(current)

    if (body.action === 'apply') {
      const swapFrom = new Set(body.swaps.map((s) => s.from))
      const targets = body.swaps.map((s) => s.to)
      if (swapFrom.size !== body.swaps.length || new Set(targets).size !== targets.length) {
        return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
      }
      if (body.swaps.some((s) => !current.includes(s.from)) || body.removes.some((r) => !current.includes(r))) {
        return NextResponse.json({ error: 'Die Fragenliste hat sich geändert. Bitte Seite neu laden.' }, { status: 409 })
      }
      if (body.swaps.some((s) => swapFrom.has(s.to) || exclude.has(s.to) || !byId.has(s.to))) {
        return NextResponse.json({ error: 'Eine Ersatzfrage ist nicht zulässig oder schon im Entwurf.' }, { status: 400 })
      }
      const to = new Map(body.swaps.map((s) => [s.from, s.to]))
      const removes = new Set(body.removes.filter((r) => !to.has(r)))
      const next = current.filter((qid) => !removes.has(qid)).map((qid) => to.get(qid) ?? qid)
      const { error } = await supabase.from('graded_assessments').update({ draft_question_ids: next }).eq('id', id)
      if (error) return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
      await writeAuditLog(supabase, {
        admin_id: user.id,
        action_type: 'graded_assessment.replace_questions',
        object_type: 'graded_assessment',
        object_id: id,
        object_label: draft.title,
        department_id: draft.department_id,
        details: { replaced: body.swaps.length, removed: removes.size },
      })
      return NextResponse.json({ success: true, questionCount: next.length })
    }

    // Ziel einer Ersetzung: bekannt aus dem Pool, sonst (gelöscht/deaktiviert) Thema aus der Datenbank
    async function targetFor(questionId: string): Promise<ReplaceTarget | null> {
      const known = byId.get(questionId)
      if (known) return { id: known.id, topic: known.topic, level: known.level, question_text: known.question_text }
      const { data } = await supabase!
        .from('questions')
        .select('id, question_text, topics(name)')
        .eq('id', questionId)
        .maybeSingle()
      const topic = (data as unknown as { topics: { name: string } | null } | null)?.topics?.name ?? null
      if (!data || !topic) return null
      return { id: questionId, topic, level: 'mittel', question_text: (data as { question_text: string }).question_text }
    }

    if (body.action === 'alternatives') {
      if (!current.includes(body.questionId)) {
        return NextResponse.json({ error: 'Die Fragenliste hat sich geändert. Bitte Seite neu laden.' }, { status: 409 })
      }
      const target = await targetFor(body.questionId)
      if (!target) return NextResponse.json({ alternatives: [], topicKnown: false })
      const alternatives = replacementsFor(target, pool, exclude, Math.random)
      return NextResponse.json({ alternatives: alternatives.map(publicView), topicKnown: true })
    }

    // bulk
    const ids = [...new Set(body.questionIds)].filter((qid) => current.includes(qid))
    const targets: ReplaceTarget[] = []
    const unknown: string[] = []
    for (const qid of ids) {
      const t = await targetFor(qid)
      if (t) targets.push(t)
      else unknown.push(qid)
    }
    const plan = planBulkReplacement(targets, pool, exclude, Math.random)
    const planById = new Map(plan.map((p) => [p.targetId, p.replacement]))
    return NextResponse.json({
      items: ids.map((qid) => {
        const r = planById.get(qid) ?? null
        return { questionId: qid, replacement: r ? publicView(r) : null }
      }),
    })
  } catch (err) {
    console.error(`[${ROUTE}]`, err)
    return NextResponse.json({ error: FAIL }, { status: 500 })
  }
}
