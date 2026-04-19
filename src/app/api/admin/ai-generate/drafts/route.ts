import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../../_lib/auth'

const ListQuerySchema = z.object({
  job_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'review_required', 'accepted', 'rejected', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
})

const PAGE_SIZE = 50

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const parsed = ListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Parameter', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { job_id, status, page } = parsed.data
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('questions_draft')
    .select(
      'id, job_id, question_text, options, correct_index, explanation, subject_code, difficulty, status, expires_at, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: true })

  if (job_id) query = query.eq('job_id', job_id)
  if (status !== 'all') query = query.eq('status', status)

  const { data, error, count } = await query.range(from, to)

  if (error) {
    console.error('[GET /api/admin/ai-generate/drafts]', error)
    return NextResponse.json({ error: 'Entwürfe konnten nicht geladen werden.' }, { status: 500 })
  }

  const total = count ?? 0
  return NextResponse.json({ drafts: data ?? [], total, page, totalPages: Math.ceil(total / PAGE_SIZE) })
}
