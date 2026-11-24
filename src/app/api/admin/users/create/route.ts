import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, writeAuditLogStrict } from '../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { SingleBodySchema, createAccount, loadDepartments } from './_lib/create-account'

/**
 * POST /api/admin/users/create — ein Konto anlegen (PROJ-62, nur Super-Admin).
 * Antwort: `{ account }` mit dem Start-Passwort, das danach nirgends mehr
 * abrufbar ist. Lehrkräfte kommen über die Freigabeliste bis hierher und
 * werden hier mit 403 abgewiesen.
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
  const parsed = SingleBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Angaben.' }, { status: 400 })
  }
  const input = parsed.data

  const service = createServiceClient()
  let departments
  try {
    departments = await loadDepartments(service)
  } catch (err) {
    console.error('[POST /api/admin/users/create]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Konto konnte nicht angelegt werden.' }, { status: 500 })
  }
  const department = departments.find((d) => d.id === input.departmentId)
  if (!department) return NextResponse.json({ error: 'Bereich unbekannt.' }, { status: 400 })

  const result = await createAccount({
    service,
    // Ohne Protokolleintrag wird das Konto wieder gelöscht (PROJ-127)
    writeLog: (entry) => writeAuditLogStrict(supabase, entry),
    adminId: user.id,
    name: input.name,
    email: input.email,
    role: input.role,
    department,
    password: input.password,
  })
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.status })

  return NextResponse.json({ account: result.account })
}
