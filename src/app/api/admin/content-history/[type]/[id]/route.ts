import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { isContentType } from '@/lib/content-history'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
})

const PAGE_SIZE = 20

/**
 * Verlauf eines einzelnen Inhalts (Frage, Thema, Fach oder Prüfungsset),
 * neueste Version zuerst. RLS auf `content_versions` sorgt bereits dafür,
 * dass nur sieht, wer den Inhalt auch verwalten darf — hier wird nur noch
 * sauber paginiert und die Namen der ändernden Personen ergänzt.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ type: string; id: string }> }
) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { type, id } = await ctx.params
  if (!isContentType(type)) {
    return NextResponse.json({ error: 'Unbekannter Inhaltstyp' }, { status: 400 })
  }

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }
  const { page } = parsed.data
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('content_versions')
    .select(
      'id, version_number, change_type, data, changed_by, changed_by_label, batch_id, created_at, profiles:changed_by ( display_name )',
      { count: 'exact' }
    )
    .eq('content_type', type)
    .eq('content_id', id)
    .order('version_number', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[GET /api/admin/content-history/[type]/[id]]', error)
    return NextResponse.json({ error: 'Verlauf konnte nicht geladen werden.' }, { status: 500 })
  }

  const versions = (data ?? []).map((v) => {
    const row = v as typeof v & { profiles?: { display_name?: string | null } | null }
    return {
      id: row.id,
      versionNumber: row.version_number,
      changeType: row.change_type,
      data: row.data,
      changedByName: row.profiles?.display_name ?? row.changed_by_label ?? 'Gelöschtes Konto',
      batchId: row.batch_id,
      createdAt: row.created_at,
    }
  })

  const total = count ?? versions.length
  return NextResponse.json({ versions, total, page, totalPages: total === 0 ? 0 : Math.ceil(total / PAGE_SIZE) })
}
