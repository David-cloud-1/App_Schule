import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, writeAuditLog } from '../../../_lib/auth'

type BatchVersionRow = {
  content_type: string
  content_id: string
  version_number: number
  changed_by: string | null
}

/**
 * Vorschau eines Vorgangs vor der Sammel-Rücknahme (PROJ-47): zeigt, wie
 * viele Inhalte betroffen sind und bei welchen jemand anderes inzwischen
 * weiter bearbeitet hat (Konflikt — wird beim Zurücknehmen standardmäßig
 * nicht überschrieben).
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, isSuperAdmin } = auth
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Nur der Super-Admin kann Vorgänge zurücknehmen.' }, { status: 403 })
  }

  const { id } = await ctx.params

  const { data: versions, error } = await supabase
    .from('content_versions')
    .select('content_type, content_id, version_number, changed_by')
    .eq('batch_id', id)

  if (error) {
    console.error('[GET /api/admin/content-history/batches/[id]]', error)
    return NextResponse.json({ error: 'Vorgang konnte nicht geladen werden.' }, { status: 500 })
  }
  if (!versions || versions.length === 0) {
    return NextResponse.json({ error: 'Vorgang nicht gefunden.' }, { status: 404 })
  }

  const rows = versions as BatchVersionRow[]
  const conflicts: { contentType: string; contentId: string }[] = []

  for (const row of rows) {
    const { data: currentTable } = await supabase
      .from(
        row.content_type === 'question'
          ? 'questions'
          : row.content_type === 'topic'
            ? 'topics'
            : row.content_type === 'subject'
              ? 'subjects'
              : 'exam_question_sets'
      )
      .select('version_number')
      .eq('id', row.content_id)
      .maybeSingle()
    const currentVersion = (currentTable as { version_number?: number } | null)?.version_number
    if (currentVersion !== undefined && currentVersion !== row.version_number) {
      conflicts.push({ contentType: row.content_type, contentId: row.content_id })
    }
  }

  return NextResponse.json({
    batchId: id,
    affectedCount: rows.length,
    conflicts,
  })
}

/**
 * Nimmt einen ganzen Vorgang zurück: jeder betroffene Inhalt wird auf die
 * Version direkt vor dieser Massenaktion zurückgesetzt. Inhalte mit Konflikt
 * (seither von jemand anderem weiter bearbeitet) werden standardmäßig
 * übersprungen, es sei denn `force` ist gesetzt.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user, isSuperAdmin } = auth
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Nur der Super-Admin kann Vorgänge zurücknehmen.' }, { status: 403 })
  }

  const { id } = await ctx.params
  let force = false
  try {
    const body = await request.json()
    force = !!(body as { force?: boolean })?.force
  } catch {
    // kein Body nötig
  }

  const { data: versions, error } = await supabase
    .from('content_versions')
    .select('content_type, content_id, version_number')
    .eq('batch_id', id)

  if (error || !versions || versions.length === 0) {
    return NextResponse.json({ error: 'Vorgang nicht gefunden.' }, { status: 404 })
  }

  let restored = 0
  let skipped = 0

  for (const row of versions as BatchVersionRow[]) {
    const table =
      row.content_type === 'question'
        ? 'questions'
        : row.content_type === 'topic'
          ? 'topics'
          : row.content_type === 'subject'
            ? 'subjects'
            : 'exam_question_sets'

    const { data: currentRow } = await supabase
      .from(table)
      .select('version_number')
      .eq('id', row.content_id)
      .maybeSingle()
    const currentVersion = (currentRow as { version_number?: number } | null)?.version_number

    if (!force && currentVersion !== undefined && currentVersion !== row.version_number) {
      skipped++
      continue
    }

    // Version direkt vor dieser Massenaktion — nicht die Version der
    // Massenaktion selbst, sonst würde "zurücknehmen" nichts ändern.
    const { data: previous } = await supabase
      .from('content_versions')
      .select('version_number')
      .eq('content_type', row.content_type)
      .eq('content_id', row.content_id)
      .lt('version_number', row.version_number)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const targetVersion = (previous as { version_number?: number } | null)?.version_number
    if (targetVersion === undefined) {
      skipped++
      continue
    }

    const { error: restoreError } = await supabase.rpc('restore_content_version', {
      p_content_type: row.content_type,
      p_content_id: row.content_id,
      p_version_number: targetVersion,
    })
    if (restoreError) {
      console.error('[POST .../batches/[id]] restore failed', restoreError)
      skipped++
      continue
    }
    restored++
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'batch.rollback',
    object_type: 'content_change_batch',
    object_id: id,
    details: { restored, skipped, force },
  })

  return NextResponse.json({ restored, skipped })
}
