import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/** Returns a date string in YYYY-MM-DD format using Europe/Berlin timezone. */
function getBerlinDateStr(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

/** Berlin UTC offset (in minutes) on the given calendar day, DST-aware. */
function berlinOffsetMinutesForDate(dateStr: string): number {
  const probe = new Date(`${dateStr}T12:00:00.000Z`)
  const tzPart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const match = tzPart.match(/GMT([+-]\d+)/)
  return match ? Number(match[1]) * 60 : 60
}

function nextBerlinMidnightISO(): string {
  const tomorrowStr = getBerlinDateStr(1)
  const offsetMin = berlinOffsetMinutesForDate(tomorrowStr)
  const utcMs = new Date(`${tomorrowStr}T00:00:00.000Z`).getTime() - offsetMin * 60_000
  return new Date(utcMs).toISOString()
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = getBerlinDateStr()

  const { data: existingRound, error } = await supabase
    .from('blitz_rounds')
    .select('id')
    .eq('user_id', user.id)
    .eq('calendar_day', today)
    .maybeSingle()

  if (error) {
    console.error('[GET /api/quiz/blitz/status]', error)
    return NextResponse.json({ error: 'Failed to load blitz status' }, { status: 500 })
  }

  const available = !existingRound

  return NextResponse.json({
    available,
    next_available_at: available ? null : nextBerlinMidnightISO(),
  })
}
