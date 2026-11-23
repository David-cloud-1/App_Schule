import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireManager } from '../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

const QuerySchema = z.object({
  period: z.enum(['7d', '30d', 'all']).default('30d'),
  action_type: z.string().optional(),
  /** Nur Einträge zu dieser Person (Nutzer-Detailseite, PROJ-59) */
  object_id: z.string().uuid().optional(),
  /** Nur Einträge dieser handelnden Person (PROJ-127) */
  admin_id: z.string().uuid().optional(),
  /** Bereichsleiste (PROJ-70): nur für den Super-Admin, der sonst alle Bereiche sieht */
  department_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
})

const PAGE_SIZE = 50

/** "david.zach@…" → "David Zach" (Ersatz, wenn im Profil kein Anzeigename steht) */
function nameFromEmail(email: string | undefined): string | null {
  const local = email?.split('@')[0]
  if (!local) return null
  const words = local.split(/[._-]+/).filter((w) => /^\p{L}{2,}$/u.test(w))
  if (words.length === 0) return local
  return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export async function GET(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const { isSuperAdmin, departmentId, scopeIsAll } = auth

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { period, action_type, object_id, admin_id, department_id, page } = parsed.data
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  try {
    const service = createServiceClient()

    let query = service
      .from('admin_audit_log')
      .select(
        `
          id, created_at, admin_id, admin_name, action_type, object_type, object_id, object_label, details, department_id
        `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    // Service-Role-Route (umgeht RLS) — Lehrkraft sieht den Bereich der
    // Bereichsleiste (bei „Alle Bereiche“ alle Einträge mit Bereich), Einträge
    // ohne Bereich (z. B. Rollenvergabe ohne Bereich) nur der Super-Admin.
    if (!isSuperAdmin) {
      query = scopeIsAll ? query.not('department_id', 'is', null) : query.eq('department_id', departmentId)
    } else if (department_id) {
      query = query.eq('department_id', department_id)
    }

    if (period !== 'all') {
      const days = period === '7d' ? 7 : 30
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', since)
    }
    if (action_type) {
      query = query.eq('action_type', action_type)
    }
    if (admin_id) {
      query = query.eq('admin_id', admin_id)
    }
    if (object_id) {
      query = query.eq('object_type', 'user').eq('object_id', object_id)
    }

    const { data, error, count } = await query.range(from, to)
    if (error) {
      // Table likely does not exist yet
      return NextResponse.json({ entries: [], total: 0, page, totalPages: 0 })
    }

    const entries = data ?? []
    // Gespeicherter Name (PROJ-127) zuerst; nur ältere Einträge ohne Namen nachschlagen
    const adminIds = Array.from(
      new Set(entries.filter((e) => !e.admin_name).map((e) => e.admin_id as string).filter(Boolean))
    )

    let adminMap = new Map<string, string | null>()
    if (adminIds.length > 0) {
      const { data: admins } = await service
        .from('profiles')
        .select('id, first_name, last_name, display_name')
        .in('id', adminIds)
      adminMap = new Map(
        (admins ?? []).map((a) => [
          a.id as string,
          [String(a.first_name ?? '').trim(), String(a.last_name ?? '').trim()].filter(Boolean).join(' ') ||
            (a.display_name as string) ||
            null,
        ])
      )

      // Die meisten Admin-Profile haben keinen Anzeigenamen — dann aus der E-Mail ableiten
      const missing = adminIds.filter((id) => !adminMap.get(id))
      await Promise.all(
        missing.map(async (id) => {
          try {
            const { data: au } = await service.auth.admin.getUserById(id)
            const name = nameFromEmail(au?.user?.email)
            if (name) adminMap.set(id, name)
          } catch {
            // Name bleibt leer, die Seite zeigt dann „Gelöschtes Konto“/ID
          }
        })
      )
    }

    const enriched = entries.map((e) => ({
      ...e,
      admin_name: (e.admin_name as string | null) || adminMap.get(e.admin_id as string) || null,
    }))

    const total = count ?? enriched.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE)

    return NextResponse.json({ entries: enriched, total, page, totalPages })
  } catch (err) {
    console.error('[GET /api/admin/audit-log]', err)
    return NextResponse.json({ entries: [], total: 0, page, totalPages: 0 })
  }
}
