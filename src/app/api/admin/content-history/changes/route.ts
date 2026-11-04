import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../../_lib/auth'
import { CONTENT_TYPES } from '@/lib/content-history'

const CHANGE_TYPES = ['created', 'updated', 'deactivated', 'activated', 'deleted', 'restored'] as const

const QuerySchema = z.object({
  person: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  department_id: z.string().uuid().optional(),
  /** Fach: Frage (verknüpftes Fach), Thema (sein Fach) oder das Fach selbst */
  subject_id: z.string().uuid().optional(),
  type: z.enum(CONTENT_TYPES).optional(),
  change_type: z.enum(CHANGE_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
})

const PAGE_SIZE = 50

/**
 * Änderungsprotokoll der Inhalte (PROJ-70) mit Filtern nach Person, Zeitraum,
 * Bereich, Fach, Inhaltstyp und Art der Änderung. Nur Super-Admin; die Filter
 * laufen in der Datenbank, die Liste lädt seitenweise.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Nur der Super-Admin sieht das Änderungsprotokoll der Inhalte.' }, { status: 403 })
  }

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Anfrage' }, { status: 400 })
  }
  const q = parsed.data
  const from = (q.page - 1) * PAGE_SIZE

  let query = auth.supabase
    .from('content_versions')
    .select(
      'id, content_type, content_id, version_number, change_type, department_id, changed_by, changed_by_label, batch_id, created_at, profiles:changed_by ( display_name ), departments:department_id ( name, code )',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (q.person) query = query.eq('changed_by', q.person)
  if (q.from) query = query.gte('created_at', q.from)
  if (q.to) query = query.lt('created_at', q.to)
  if (q.department_id) query = query.eq('department_id', q.department_id)
  if (q.type) query = query.eq('content_type', q.type)
  if (q.change_type) query = query.eq('change_type', q.change_type)
  if (q.subject_id) {
    // Frage: Fach in der Momentaufnahme; Thema: sein Fach; Fach: es selbst
    query = query.or(
      [
        `and(content_type.eq.question,data->subject_ids.cs.["${q.subject_id}"])`,
        `and(content_type.eq.topic,data->>subject_id.eq.${q.subject_id})`,
        `and(content_type.eq.subject,content_id.eq.${q.subject_id})`,
      ].join(',')
    )
  }

  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1)
  if (error) {
    console.error('[GET /api/admin/content-history/changes]', error)
    return NextResponse.json({ error: 'Protokoll konnte nicht geladen werden.' }, { status: 500 })
  }

  type Row = {
    id: string
    content_type: string
    content_id: string
    version_number: number
    change_type: string
    department_id: string | null
    changed_by: string | null
    changed_by_label: string | null
    batch_id: string | null
    created_at: string
    profiles: { display_name: string | null } | null
    departments: { name: string; code: string } | null
  }

  const entries = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    contentType: r.content_type,
    contentId: r.content_id,
    versionNumber: r.version_number,
    changeType: r.change_type,
    batchId: r.batch_id,
    createdAt: r.created_at,
    changedBy: r.changed_by,
    changedByName: r.profiles?.display_name ?? r.changed_by_label ?? (r.changed_by ? null : 'Gelöschtes Konto'),
    departmentName: r.departments?.name ?? null,
    departmentCode: r.departments?.code ?? null,
  }))

  const total = count ?? 0
  return NextResponse.json({ entries, total, page: q.page, totalPages: total === 0 ? 0 : Math.ceil(total / PAGE_SIZE) })
}
