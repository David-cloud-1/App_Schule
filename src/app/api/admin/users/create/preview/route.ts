import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, writeAuditLog } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { validateBulkRows } from '@/lib/account-create-rules'
import { summarizePreview } from '@/lib/account-create'
import { PreviewBodySchema, loadDepartments, loadExistingEmails } from '../_lib/create-account'

/**
 * POST /api/admin/users/create/preview — Liste prüfen (PROJ-62, nur
 * Super-Admin). Legt nichts an: Jede Zeile bekommt OK, Warnung oder Fehler
 * mit Begründung. Die Datei selbst kommt nie hier an, nur die Zeilen.
 *
 * Die Vorschau verrät, welche E-Mails schon ein Konto haben. Darum steht sie
 * im Änderungsprotokoll (nur Zahlen, keine Adressen).
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = PreviewBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Liste.' }, { status: 400 })
  }

  const service = createServiceClient()
  try {
    const [departments, existingEmails] = await Promise.all([loadDepartments(service), loadExistingEmails(service)])
    const { defaultDepartmentId } = parsed.data
    if (defaultDepartmentId && !departments.some((d) => d.id === defaultDepartmentId)) {
      return NextResponse.json({ error: 'Bereich unbekannt.' }, { status: 400 })
    }
    const rows = validateBulkRows(parsed.data.rows, { defaultDepartmentId, departments, existingEmails })
    const summary = summarizePreview(rows)
    await writeAuditLog(supabase, {
      admin_id: user.id,
      action_type: 'user.bulk_preview',
      object_type: 'user',
      object_label: `Liste mit ${rows.length} Zeilen geprüft`,
      details: { zeilen: rows.length, ok: summary.ok, warnungen: summary.warning, fehler: summary.error },
      department_id: defaultDepartmentId ?? null,
    })
    return NextResponse.json({ rows })
  } catch (err) {
    console.error('[POST /api/admin/users/create/preview]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Die Liste konnte nicht geprüft werden.' }, { status: 500 })
  }
}
