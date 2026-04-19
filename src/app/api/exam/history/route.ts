import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('exam_sessions')
    .select('id, parts_selected, started_at, ended_at, status, results_json')
    .eq('user_id', user.id)
    .neq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })

  return NextResponse.json({ sessions: data ?? [] })
}
