import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'
import {
  alternativesFor,
  buildSuggestion,
  levelFor,
  mixSum,
  summarize,
  MAX_COUNT,
  MIN_COUNT,
  type Candidate,
} from '@/lib/assessment-suggest'

const ROUTE = 'api/admin/assessments/suggest'

const base = z.object({
  departmentId: z.string().uuid(),
  subjects: z.array(z.string().max(40)).max(30).default([]),
  topics: z.array(z.string().max(200)).max(100).default([]),
  classLevel: z.number().int().refine((n) => [10, 11, 12].includes(n)).nullable().default(null),
  exclude: z.object({
    blocked: z.boolean(),
    reported: z.boolean(),
    recent: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(5)]),
  }),
  /** Fragen, die schon in der Auswahl stehen und nicht noch einmal vorgeschlagen werden sollen */
  alreadyChosenIds: z.array(z.string().uuid()).max(500).default([]),
})

const suggestSchema = base.extend({
  action: z.literal('suggest'),
  count: z.number().int().min(MIN_COUNT).max(MAX_COUNT),
  mix: z
    .object({
      leicht: z.number().int().min(0).max(100),
      mittel: z.number().int().min(0).max(100),
      schwer: z.number().int().min(0).max(100),
    })
    .refine((m) => mixSum(m) === 100),
  keepIds: z.array(z.string().uuid()).max(MAX_COUNT).default([]),
  preferNotIds: z.array(z.string().uuid()).max(200).default([]),
})

const alternativesSchema = base.extend({
  action: z.literal('alternatives'),
  questionId: z.string().uuid(),
  /** alles, was schon im Vorschlag steht */
  excludeIds: z.array(z.string().uuid()).max(200).default([]),
})

const bodySchema = z.discriminatedUnion('action', [suggestSchema, alternativesSchema])
type Body = z.infer<typeof bodySchema>

const STATS_PAGE = 1000
const FAIL ='Das hat nicht geklappt. Bitte versuche es erneut.'

type StatRow = { question_id: string; attempts: number | null; correct: number | null; open_reports: number | null }

/** Ids der Fragen aus den letzten `n` Nachweisen dieser Person */
async function recentQuestionIds(supabase: SupabaseClient, userId: string, n: number): Promise<Set<string>> {
  if (n <= 0) return new Set()
  const { data, error } = await supabase
    .from('graded_assessments')
    .select('draft_question_ids, question_ids_snapshot')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(n)
  if (error) throw new Error(`recent: ${error.message}`)
  const ids = new Set<string>()
  for (const row of (data ?? []) as { draft_question_ids: string[] | null; question_ids_snapshot: string[] | null }[]) {
    for (const id of row.question_ids_snapshot ?? row.draft_question_ids ?? []) ids.add(id)
  }
  return ids
}

/**
 * Lädt den Pool des Zielbereichs samt Lösungsquoten (PROJ-74). Fehlt die
 * Auswertung, gelten alle Fragen als „mittel“ und der Aufrufer bekommt einen
 * Hinweis — ein Vorschlag ist dann immer noch möglich.
 */
async function loadCandidates(supabase: SupabaseClient, userId: string, departmentId: string) {
  const questions = await fetchSelectableQuestions(supabase, departmentId, userId)
  const stats = new Map<string, StatRow>()
  let statsAvailable = true
  // PostgREST kappt bei 1000 Zeilen: nur Fragen mit Antworten holen, stabil sortiert und seitenweise
  for (let from = 0; ; from += STATS_PAGE) {
    const { data, error } = await supabase
      .rpc('question_difficulty_stats', {
        p_department_ids: [departmentId],
        p_class_level: null,
        p_days: null,
        p_subject_id: null,
      })
      .gt('attempts', 0)
      .order('question_id')
      .order('subject_id')
      .range(from, from + STATS_PAGE - 1)
    if (error) {
      console.error(`[${ROUTE}] stats`, error)
      statsAvailable = false
      stats.clear()
      break
    }
    const rows = (data ?? []) as StatRow[]
    for (const row of rows) if (!stats.has(row.question_id)) stats.set(row.question_id, row)
    if (rows.length < STATS_PAGE) break
  }
  const all: Candidate[] = questions.map((q) => {
    const s = stats.get(q.id)
    const attempts = s?.attempts ?? 0
    const correct = s?.correct ?? 0
    return {
      id: q.id,
      question_text: q.question_text,
      topic: q.topic,
      class_level: q.class_level,
      subject_codes: q.subject_codes,
      isPrivate: q.isPrivate,
      attempts,
      correct,
      openReports: s?.open_reports ?? 0,
      blocked: q.blocked,
      ...levelFor(attempts, correct),
    }
  })
  return { all, statsAvailable }
}

/** Filter und Ausschlüsse aus dem Dialog anwenden */
function applyFilters(all: Candidate[], body: Body, recent: Set<string>): Candidate[] {
  const subjects = new Set(body.subjects)
  const topics = new Set(body.topics)
  const chosen = new Set(body.alreadyChosenIds)
  return all.filter((q) => {
    if (subjects.size > 0 && !q.subject_codes.some((c) => subjects.has(c))) return false
    if (topics.size > 0 && !(q.topic && topics.has(q.topic))) return false
    if (body.classLevel !== null && q.class_level !== body.classLevel) return false
    if (body.exclude.blocked && q.blocked) return false
    if (body.exclude.reported && q.openReports > 0) return false
    if (recent.has(q.id)) return false
    if (chosen.has(q.id)) return false
    return true
  })
}

/**
 * Nachweis-Vorschlag (PROJ-78). Rein lesend und regelbasiert: nichts wird
 * gespeichert, erst „Übernehmen“ im Dialog macht den Vorschlag zur Auswahl.
 * `suggest` zieht einen Vorschlag (auch „Neu würfeln“), `alternatives` liefert
 * bis zu drei Tauschkandidaten für eine Frage.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
  }
  const body = parsed.data

  try {
    const [{ all, statsAvailable }, recent] = await Promise.all([
      loadCandidates(supabase, user.id, body.departmentId),
      recentQuestionIds(supabase, user.id, body.exclude.recent),
    ])
    const pool = applyFilters(all, body, recent)

    if (body.action === 'alternatives') {
      const target = all.find((q) => q.id === body.questionId)
      if (!target) return NextResponse.json({ error: 'Frage nicht gefunden.' }, { status: 404 })
      const alternatives = alternativesFor(target, pool, new Set(body.excludeIds), Math.random)
      return NextResponse.json({ alternatives })
    }

    const byId = new Map(all.map((q) => [q.id, q]))
    const fixed = [...new Set(body.keepIds)].map((id) => byId.get(id)).filter((q): q is Candidate => !!q)
    const result = buildSuggestion(pool, {
      count: body.count,
      mix: body.mix,
      fixed,
      preferNot: new Set(body.preferNotIds),
      random: Math.random,
    })
    const emptyTopics = body.topics.filter((t) => !pool.some((q) => q.topic === t))
    return NextResponse.json({
      items: result.items,
      summary: summarize(result.items),
      shortages: result.shortages,
      emptyTopics,
      poolSize: pool.length,
      statsAvailable,
    })
  } catch (err) {
    console.error(`[${ROUTE}]`, err)
    return NextResponse.json({ error: FAIL }, { status: 500 })
  }
}
