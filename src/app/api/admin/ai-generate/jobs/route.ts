import { NextResponse } from 'next/server'
import { requireAdmin } from '../../_lib/auth'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { data, error } = await supabase
    .from('generation_jobs')
    .select('id, filename, file_size_bytes, status, questions_generated, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[GET /api/admin/ai-generate/jobs]', error)
    return NextResponse.json({ error: 'Jobs konnten nicht geladen werden.' }, { status: 500 })
  }

  return NextResponse.json({ jobs: data ?? [] })
}
