import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AUDIT_FAILED_MESSAGE, type AuditEntry } from '../../../_lib/auth'
import { ensurePseudonym } from '@/lib/pseudonym-server'
import { MUST_CHANGE_PASSWORD_FLAG } from '@/lib/roles'
import { BULK_CHUNK_SIZE, BULK_MAX_ROWS, type CreatedAccount, type SingleRole } from '@/lib/account-create'
import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, REASONS, appUrlFor, type DepartmentOption } from '@/lib/account-create-rules'

/**
 * Server-Bausteine für „Konten anlegen“ (PROJ-62). Nur mit Service-Client und
 * nach `requireSuperAdmin` benutzen. Passwörter stehen nie in Logs, im
 * Protokoll oder in der Datenbank im Klartext; sie gehen nur einmal in der
 * Antwort an den Super-Admin.
 */

/** Höchstens so viele Sammel-Anlagen pro Super-Admin und Stunde (Spec PROJ-62) */
export const BULK_LIMIT_PER_HOUR = 3

/** So viele Konten werden innerhalb eines Päckchens gleichzeitig angelegt */
export const CREATE_CONCURRENCY = 5

/** Päckchen einer Sammel-Anlage: 300 Zeilen à 25 */
export const MAX_BATCH_COUNT = Math.ceil(BULK_MAX_ROWS / BULK_CHUNK_SIZE)

export const RawRowSchema = z.object({
  line: z.number().int().min(1).max(100_000),
  name: z.string().max(500),
  email: z.string().max(500),
  department: z.string().max(200),
  role: z.string().max(100),
})

const OptionalDepartmentId = z.string().uuid().nullable()

export const PreviewBodySchema = z.object({
  rows: z
    .array(RawRowSchema)
    .min(1, 'Die Liste ist leer.')
    .max(BULK_MAX_ROWS, `Bitte in mehrere Dateien mit höchstens ${BULK_MAX_ROWS} Zeilen teilen.`),
  defaultDepartmentId: OptionalDepartmentId,
})

const Count = z.number().int().min(0).max(BULK_MAX_ROWS)

export const BulkBodySchema = z
  .object({
    rows: z.array(RawRowSchema).min(1).max(BULK_CHUNK_SIZE, `Höchstens ${BULK_CHUNK_SIZE} Zeilen pro Aufruf.`),
    defaultDepartmentId: OptionalDepartmentId,
    batchId: z.string().uuid(),
    batchIndex: z.number().int().min(0).max(MAX_BATCH_COUNT - 1),
    batchCount: z.number().int().min(1).max(MAX_BATCH_COUNT),
    summary: z.object({ skipped: Count, invalid: Count, failed: Count }).optional(),
  })
  .refine((b) => b.batchIndex < b.batchCount, { message: 'Ungültige Päckchen-Nummer.' })

export const SingleBodySchema = z.object({
  name: z.string().trim().min(1, 'Bitte einen Namen eintragen.').max(NAME_MAX_LENGTH, 'Der Name ist zu lang.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(EMAIL_MAX_LENGTH, 'Die E-Mail ist zu lang.')
    .email('Bitte eine gültige E-Mail-Adresse eintragen.'),
  role: z.enum(['student', 'teacher', 'admin']),
  departmentId: z.string().uuid('Bitte einen Bereich wählen.'),
  password: z.string().min(8, 'Das Passwort braucht mindestens 8 Zeichen.').max(72, 'Das Passwort ist zu lang.'),
})

/** Aktive Bereiche mit Kürzel und Domain */
export async function loadDepartments(service: SupabaseClient): Promise<DepartmentOption[]> {
  const { data, error } = await service
    .from('departments')
    .select('id, code, name, domain')
    .eq('is_active', true)
    .order('name')
    .limit(100)
  if (error) throw new Error(`departments: ${error.message}`)
  return ((data ?? []) as DepartmentOption[]).map((d) => ({ ...d, domain: d.domain ?? null }))
}

/** Alle E-Mails, die schon ein Konto haben (auch gesperrte), klein geschrieben */
export async function loadExistingEmails(service: SupabaseClient): Promise<Set<string>> {
  const emails = new Set<string>()
  const perPage = 1000
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const users = data?.users ?? []
    for (const u of users) if (u.email) emails.add(u.email.toLowerCase())
    if (users.length < perPage) break
  }
  return emails
}

export type CreateAccountResult =
  | { ok: true; userId: string; account: CreatedAccount }
  | { ok: false; status: number; reason: string }

function isEmailTaken(error: { code?: string; message?: string; status?: number }): boolean {
  return (
    error.code === 'email_exists' ||
    error.code === 'user_already_exists' ||
    /already (been )?registered|already exists/i.test(error.message ?? '')
  )
}

/**
 * Ein Konto anlegen: bestätigte E-Mail, Pflichtwechsel-Merker, Rolle, Bereich,
 * Name; bei Lehrkraft und Super-Admin ein Pseudonym (PROJ-44). Danach der
 * Protokolleintrag `user.create` (ohne Passwort). Scheitert ein Schritt nach
 * dem Anlegen, wird das Konto wieder gelöscht: Es bleibt kein halbes Konto
 * und keines ohne Protokoll.
 */
export async function createAccount(params: {
  service: SupabaseClient
  /**
   * Schreibt den Protokolleintrag und meldet, ob er steht. Die Route reicht
   * `writeAuditLogStrict` mit dem Client des Super-Admins herein.
   */
  writeLog: (entry: AuditEntry) => Promise<boolean>
  adminId: string
  name: string
  email: string
  role: SingleRole
  department: DepartmentOption
  password: string
  batchId?: string
}): Promise<CreateAccountResult> {
  const { service, writeLog, adminId, name, email, role, department, password, batchId } = params

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
    app_metadata: { [MUST_CHANGE_PASSWORD_FLAG]: true },
  })
  if (error || !data?.user) {
    const err = (error ?? {}) as { code?: string; message?: string; status?: number }
    if (isEmailTaken(err)) return { ok: false, status: 409, reason: REASONS.exists }
    if (err.code === 'weak_password') {
      return { ok: false, status: 400, reason: 'Dieses Passwort ist zu schwach. Bitte ein anderes wählen.' }
    }
    console.error('[createAccount] createUser failed', { code: err.code, status: err.status })
    return { ok: false, status: 500, reason: 'Konto konnte nicht angelegt werden.' }
  }

  const userId = data.user.id
  const rollback = async (why: string) => {
    const { error: deleteError } = await service.auth.admin.deleteUser(userId)
    if (deleteError) console.error('[createAccount] rollback failed', { why, message: deleteError.message })
  }

  // Das Profil legt der Datenbank-Trigger beim Anlegen an (Rolle Azubi); hier
  // kommen Rolle, Bereich und Name dazu. Der Bereich steht damit fest, die
  // Zuordnung nach Adresse beim ersten Login greift nur bei fehlendem Bereich.
  const { data: updated, error: profileError } = await service
    .from('profiles')
    .update({ role, department_id: department.id, display_name: name })
    .eq('id', userId)
    .select('id')
  if (profileError || !Array.isArray(updated) || updated.length === 0) {
    console.error('[createAccount] profile update failed', { message: profileError?.message })
    await rollback('profile')
    return { ok: false, status: 500, reason: 'Konto konnte nicht angelegt werden.' }
  }

  const logged = await writeLog({
    admin_id: adminId,
    action_type: 'user.create',
    object_type: 'user',
    object_id: userId,
    object_label: name,
    details: { rolle: role, bereich: department.code, ...(batchId ? { batch_id: batchId } : {}) },
    department_id: department.id,
  })
  if (!logged) {
    await rollback('audit')
    return { ok: false, status: 503, reason: AUDIT_FAILED_MESSAGE }
  }

  if (role !== 'student') await ensurePseudonym(service, userId)

  return {
    ok: true,
    userId,
    account: {
      name,
      email,
      password,
      role,
      departmentName: department.name,
      appUrl: appUrlFor(department.domain),
    },
  }
}

/** Wie `Promise.all`, aber höchstens `limit` Aufgaben gleichzeitig; Reihenfolge bleibt */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * Wie viele Sammel-Anlagen hat der Super-Admin in der letzten Stunde begonnen
 * (andere als `batchId`), und wie viele Konten hat diese Anlage schon? Gezählt
 * an den Protokolleinträgen `user.create` mit `batch_id`.
 */
export async function bulkUsage(
  service: SupabaseClient,
  adminId: string,
  batchId: string,
): Promise<{ otherBatches: number; createdInBatch: number }> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data, error } = await service
    .from('admin_audit_log')
    .select('details')
    .eq('admin_id', adminId)
    .eq('action_type', 'user.create')
    .gte('created_at', since)
    .limit(5000)
  if (error) throw new Error(`audit usage: ${error.message}`)
  const batches = new Set<string>()
  let createdInBatch = 0
  for (const row of (data ?? []) as { details: { batch_id?: unknown } | null }[]) {
    const id = row.details?.batch_id
    if (typeof id !== 'string') continue
    if (id === batchId) createdInBatch += 1
    else batches.add(id)
  }
  return { otherBatches: batches.size, createdInBatch }
}
