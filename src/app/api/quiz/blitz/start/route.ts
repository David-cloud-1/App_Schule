import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const QUESTION_POOL_SIZE = 300
const BLITZ_QUESTION_COUNT = 40

/** Returns a date string in YYYY-MM-DD format using Europe/Berlin timezone. */
function getBerlinDateStr(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type RawQuestion = {
  id: string
  question_text: string
  explanation: string | null
  difficulty: string
  answer_options: { id: string; option_text: string; is_correct: boolean; display_order: number }[]
}

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Today's daily bonus already claimed — no point starting a new round.
  const today = getBerlinDateStr()
  const { data: existingRound } = await supabase
    .from('blitz_rounds')
    .select('id')
    .eq('user_id', user.id)
    .eq('calendar_day', today)
    .maybeSingle()

  if (existingRound) {
    return NextResponse.json({ error: 'Blitzrunde heute schon gespielt' }, { status: 409 })
  }

  // Mixed-subject pool: the existing questions endpoint already returns
  // cross-subject results when no `subject` filter is given (PROJ-19
  // architecture decision — no new question-fetching mechanism needed).
  const { data: rawQuestions, error: questionsError } = await supabase
    .from('questions')
    .select('id, question_text, explanation, difficulty, answer_options ( id, option_text, is_correct, display_order )')
    .eq('is_active', true)
    .order('id')
    .limit(QUESTION_POOL_SIZE)

  if (questionsError) {
    console.error('[POST /api/quiz/blitz/start] questions:', questionsError)
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
  }

  if (!rawQuestions || rawQuestions.length === 0) {
    return NextResponse.json({ error: 'Keine Fragen verfügbar' }, { status: 500 })
  }

  const questions = shuffle(rawQuestions as RawQuestion[])
    .slice(0, BLITZ_QUESTION_COUNT)
    .map((q) => ({
      id: q.id,
      question_text: q.question_text,
      explanation: q.explanation,
      difficulty: q.difficulty,
      answer_options: shuffle(q.answer_options ?? []),
    }))

  const { data: startRow, error: startError } = await supabase
    .from('blitz_starts')
    .insert({ user_id: user.id })
    .select('token')
    .single()

  if (startError || !startRow) {
    console.error('[POST /api/quiz/blitz/start] insert:', startError)
    return NextResponse.json({ error: 'Failed to start round' }, { status: 500 })
  }

  return NextResponse.json({ token: startRow.token, questions })
}
