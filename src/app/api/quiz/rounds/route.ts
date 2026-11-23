import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import { getLockedQuestionIds } from '@/lib/answer-key'
import { getDepartmentOfUser, getDepartmentSubjectIds } from '@/lib/departments-server'
import { BLITZ_SECONDS, RoundStartRequestSchema, type BlitzRoundStart } from '@/lib/quiz-round'
import {
  BLITZ_CLASSIC_CARDS,
  BLITZ_TF_CARDS,
  BLITZ_TF_MIN_KNOWN,
  getBerlinDateStr,
  shuffle,
  toClientQuestion,
  variantsEnabled,
} from '@/lib/quiz-round-rules'
import {
  buildSlip,
  cleanupOldRounds,
  eligibilityOf,
  fetchKnownQuestionIds,
  insertRound,
  toSlipSources,
  type PoolQuestion,
} from '@/lib/quiz-round-server'
import { badRequest, readJson, requireUser } from './route-helpers'

const CLASSIC_POOL_SIZE = 300
const ID_CHUNK = 200
const SELECT_COLS =
  'id, question_text, explanation, difficulty, answer_options ( id, option_text, display_order ), question_subjects!inner(subject_id)'

/**
 * PROJ-129: Blitzrunde starten (das normale Quiz legt seinen Zettel beim
 * Laden von /quiz an). Bei genug gekannten Fragen komplett Richtig/Falsch,
 * sonst klassisch – in beiden Fällen ohne Lösung im Browser.
 */
export async function POST(request: NextRequest) {
  const { supabase, user, denied } = await requireUser()
  if (denied) return denied

  const json = await readJson(request)
  if (!json.ok) return json.res
  const parsed = RoundStartRequestSchema.safeParse(json.body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  const today = getBerlinDateStr()
  const { data: existingRound } = await supabase
    .from('blitz_rounds')
    .select('id')
    .eq('user_id', user.id)
    .eq('calendar_day', today)
    .maybeSingle()
  if (existingRound) return NextResponse.json({ error: 'Blitzrunde heute schon gespielt' }, { status: 409 })

  const department = await getDepartmentOfUser(supabase, user.id)
  const subjectIds = department ? await getDepartmentSubjectIds(department.id) : []
  if (subjectIds.length === 0) return NextResponse.json({ error: 'Keine Fragen verfügbar' }, { status: 500 })

  const service = createServiceClient()
  const [locked] = await Promise.all([getLockedQuestionIds(), cleanupOldRounds(service, user.id)])

  // ── Richtig/Falsch aus gekannten, geeigneten Fragen ──────────────────────
  let form: 'true_false' | 'classic' = 'classic'
  let sources = variantsEnabled()
    ? await trueFalseSources(supabase, service, user.id, subjectIds, locked)
    : []
  if (sources.length >= BLITZ_TF_MIN_KNOWN) {
    form = 'true_false'
    sources = shuffle(sources).slice(0, BLITZ_TF_CARDS)
  } else {
    const { data, error } = await supabase
      .from('questions')
      .select(SELECT_COLS)
      .eq('is_active', true)
      .in('question_subjects.subject_id', subjectIds)
      .order('id')
      .limit(CLASSIC_POOL_SIZE)
    if (error) {
      console.error('[POST /api/quiz/rounds] questions:', error)
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
    }
    const pool = ((data ?? []) as unknown as PoolQuestion[]).filter((q) => !locked.has(q.id))
    sources = await toSlipSources(shuffle(pool).slice(0, BLITZ_CLASSIC_CARDS))
  }
  if (sources.length === 0) return NextResponse.json({ error: 'Keine Fragen verfügbar' }, { status: 500 })

  const slip = buildSlip(
    sources,
    sources.map(() => (form === 'true_false' ? 'true_false' : 'classic')),
    false, // Blitzrunde: kein Joker, keine Wette
  )
  const roundId = await insertRound(service, { user_id: user.id, kind: 'blitz', blitz_form: form, slip })
  if (!roundId) return NextResponse.json({ error: 'Failed to start round' }, { status: 500 })

  const body: BlitzRoundStart = {
    round_id: roundId,
    form,
    seconds: BLITZ_SECONDS,
    questions: slip.questions.map(toClientQuestion),
  }
  return NextResponse.json(body)
}

async function trueFalseSources(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  service: SupabaseClient,
  userId: string,
  subjectIds: string[],
  locked: Set<string>,
) {
  const known = [...(await fetchKnownQuestionIds(service, userId))].filter((id) => !locked.has(id))
  if (known.length < BLITZ_TF_MIN_KNOWN) return []
  // Nicht mehr Fragen laden als nötig: zufällige Auswahl, großzügig für die Eignungsprüfung
  const ids = shuffle(known).slice(0, BLITZ_TF_CARDS * 3)
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += ID_CHUNK) chunks.push(ids.slice(i, i + ID_CHUNK))
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from('questions')
        .select(SELECT_COLS)
        .eq('is_active', true)
        .in('question_subjects.subject_id', subjectIds)
        .in('id', chunk),
    ),
  )
  const pool: PoolQuestion[] = []
  for (const { data, error } of results) {
    if (error) {
      console.error('[POST /api/quiz/rounds] known questions:', error)
      return []
    }
    pool.push(...((data ?? []) as unknown as PoolQuestion[]))
  }
  const sources = await toSlipSources(pool)
  return sources.filter((s) => eligibilityOf(s).true_false)
}
