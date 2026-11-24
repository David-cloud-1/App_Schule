import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, writeAuditLog, writeAuditLogStrict } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { suggestPassword } from '@/lib/password-suggestion'
import { BULK_MAX_ROWS, type BulkCreateResponse, type FailedRow } from '@/lib/account-create'
import { validateBulkRows } from '@/lib/account-create-rules'
import {
  BULK_LIMIT_PER_HOUR,
  BulkBodySchema,
  CREATE_CONCURRENCY,
  bulkUsage,
  createAccount,
  loadDepartments,
  loadExistingEmails,
  mapWithConcurrency,
  NO_STORE_HEADERS,
} from '../_lib/create-account'

/**
 * POST /api/admin/users/create/bulk — ein Päckchen (höchstens 25 Zeilen) einer
 * Sammel-Anlage anlegen (PROJ-62, nur Super-Admin). Jede Zeile wird noch
 * einmal geprüft, weil zwischen Vorschau und Klick ein Konto entstanden sein
 * kann. Nur Azubi und Lehrkraft; jedes Konto bekommt ein eigenes
 * Start-Passwort vom Server.
 *
 * Limit: höchstens 3 Sammel-Anlagen (verschiedene `batchId`) pro Stunde und
 * höchstens 300 Konten je Sammel-Anlage. Das letzte Päckchen schreibt den
 * Protokolleintrag `user.bulk_create` mit den Zahlen.
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
  const parsed = BulkBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Liste.' }, { status: 400 })
  }
  const { rows, defaultDepartmentId, batchId, batchIndex, batchCount, summary } = parsed.data

  const service = createServiceClient()
  let usage: Awaited<ReturnType<typeof bulkUsage>>
  let departments: Awaited<ReturnType<typeof loadDepartments>>
  let existingEmails: Set<string>
  try {
    ;[usage, departments, existingEmails] = await Promise.all([
      bulkUsage(service, user.id, batchId),
      loadDepartments(service),
      loadExistingEmails(service),
    ])
  } catch (err) {
    console.error('[POST /api/admin/users/create/bulk] load', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Das Anlegen konnte nicht starten. Bitte erneut versuchen.' }, { status: 503 })
  }

  // Jede Sammel-Anlage beginnt mit Päckchen 0. Kommt Päckchen 0 zu einer Kennung, die schon Konten
  // angelegt hat, wäre das ein Umgehen des Stunden-Limits mit einer wiederverwendeten Kennung.
  if (batchIndex === 0 && usage.createdInBatch > 0) {
    return NextResponse.json({ error: 'Diese Sammel-Anlage wurde schon gestartet.' }, { status: 400 })
  }
  // Eine laufende Sammel-Anlage darf zu Ende laufen; eine neue zählt zum Limit
  if (usage.createdInBatch === 0 && usage.otherBatches >= BULK_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: `Höchstens ${BULK_LIMIT_PER_HOUR} Sammel-Anlagen pro Stunde. Bitte später erneut versuchen.` },
      { status: 429 },
    )
  }
  if (usage.createdInBatch + rows.length > BULK_MAX_ROWS) {
    return NextResponse.json(
      { error: `Höchstens ${BULK_MAX_ROWS} Konten pro Sammel-Anlage. Bitte eine neue Datei hochladen.` },
      { status: 400 },
    )
  }
  if (defaultDepartmentId && !departments.some((d) => d.id === defaultDepartmentId)) {
    return NextResponse.json({ error: 'Bereich unbekannt.' }, { status: 400 })
  }

  const checked = validateBulkRows(rows, { defaultDepartmentId, departments, existingEmails })
  const byId = new Map(departments.map((d) => [d.id, d]))

  const outcomes = await mapWithConcurrency(checked, CREATE_CONCURRENCY, async (row) => {
    const department = row.departmentId ? byId.get(row.departmentId) : undefined
    if (row.status !== 'ok' || !row.role || !department) {
      return { failed: { line: row.line, name: row.name, email: row.email, reason: row.reason ?? 'Zeile ungültig.' } }
    }
    const result = await createAccount({
      service,
      // Ohne Protokolleintrag wird das Konto wieder gelöscht (PROJ-127)
      writeLog: (entry) => writeAuditLogStrict(supabase, entry),
      adminId: user.id,
      name: row.name,
      email: row.email,
      role: row.role,
      department,
      password: suggestPassword(),
      batchId,
    })
    if (!result.ok) return { failed: { line: row.line, name: row.name, email: row.email, reason: result.reason } }
    return { created: { ...result.account, line: row.line } }
  })

  const response: BulkCreateResponse = { created: [], failed: [] }
  for (const o of outcomes) {
    if ('created' in o && o.created) response.created.push(o.created)
    else if ('failed' in o && o.failed) response.failed.push(o.failed as FailedRow)
  }

  if (batchIndex === batchCount - 1) {
    const created = usage.createdInBatch + response.created.length
    await writeAuditLog(supabase, {
      admin_id: user.id,
      action_type: 'user.bulk_create',
      object_type: 'user',
      object_label: `${created} ${created === 1 ? 'Konto' : 'Konten'} aus Liste`,
      details: {
        batch_id: batchId,
        angelegt: created,
        // Laut Vorschau im Browser (die Zeilen kamen nie an); „gescheitert“ zählt alle Päckchen
        uebersprungen: summary?.skipped ?? null,
        fehlerhaft: summary?.invalid ?? null,
        gescheitert: (summary?.failed ?? 0) + response.failed.length,
      },
      department_id: defaultDepartmentId ?? null,
    })
  }

  return NextResponse.json(response, { headers: NO_STORE_HEADERS })
}
