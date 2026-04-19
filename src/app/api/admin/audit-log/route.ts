import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

const QuerySchema = z.object({
  period: z.enum(['7d', '30d', 'all']).default('30d'),
  action_type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
})

const PAGE_SIZE = 50

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { period, action_type, page } = parsed.data
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  try {
    const service = createServiceClient()

    let query = service
      .from('admin_audit_log')
      .select(
        `
          id, created_at, admin_id, action_type, object_type, object_id, object_label, details
        `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (period !== 'all') {
      const days = period === '7d' ? 7 : 30
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', since)
    }
    if (action_type) {
      query = query.eq('action_type', action_type)
    }

    const { data, error, count } = await query.range(from, to)
    if (error) {
      // Table likely does not exist yet
      return NextResponse.json({ entries: [], total: 0, page, totalPages: 0 })
    }

    const entries = data ?? []
    const adminIds = Array.from(
      new Set(entries.map((e) => e.admin_id as string).filter(Boolean))
    )

    let adminMap = new Map<string, string | null>()
    if (adminIds.length > 0) {
      const { data: admins } = await service
        .from('profiles')
        .select('id, display_name')
        .in('id', adminIds)
      adminMap = new Map(
        (admins ?? []).map((a) => [a.id as string, (a.display_name as string) ?? null])
      )
    }

    const enriched = entries.map((e) => ({
      ...e,
      admin_name: adminMap.get(e.admin_id as string) ?? null,
    }))

    const total = count ?? enriched.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE)

    return NextResponse.json({ entries: enriched, total, page, totalPages })
  } catch (err) {
    console.error('[GET /api/admin/audit-log]', err)
    return NextResponse.json({ entries: [], total: 0, page, totalPages: 0 })
  }
}
