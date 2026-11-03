import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { writeAuditLog } from '../../../_lib/auth'
import { readJsonBody, requireSuperAdminTarget } from '../../_lib/target'
import {
  DELETE_FAILED_MESSAGE,
  deleteBlockReason,
  deleteConfirmationMatches,
  USER_DELETE_ACTION,
  WERKZEUG_BUCKET,
  type DeletePreview,
} from '@/lib/konto-loeschen'

const BodySchema = z.object({ confirmEmail: z.string().max(320) })

async function readEmail(service: SupabaseClient, id: string): Promise<string | null> {
  const { data } = await service.auth.admin.getUserById(id)
  return data?.user?.email ?? null
}

/**
 * Alle Dateien der Person im Speicher entfernen (Pfad: <konto-id>/<material-id>/<datei>).
 * Die Datenbank räumt Dateien nicht von selbst auf. Wiederholbar: Was schon weg ist, fehlt in der Liste.
 */
async function removeUserFiles(service: SupabaseClient, userId: string): Promise<void> {
  const bucket = service.storage.from(WERKZEUG_BUCKET)
  const files: string[] = []

  async function walk(prefix: string, depth: number): Promise<void> {
    const { data, error } = await bucket.list(prefix, { limit: 1000 })
    if (error) throw new Error(error.message)
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`
      // Ordner haben keine Id; Dateien schon
      if (entry.id === null && depth < 4) await walk(path, depth + 1)
      else if (entry.id !== null) files.push(path)
    }
  }

  await walk(userId, 0)
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await bucket.remove(files.slice(i, i + 100))
    if (error) throw new Error(error.message)
  }
}

/**
 * GET /api/admin/users/[id]/delete — Vorschau für den Lösch-Dialog (PROJ-60,
 * nur Super-Admin): was anonym erhalten bleibt und ob das Konto gelöscht
 * werden darf. Ändert nichts.
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const access = await requireSuperAdminTarget(id, { blockSelf: true })
  if (access.error) return access.error
  const { service, target } = access

  const reason = deleteBlockReason(target)
  if (reason) return NextResponse.json({ error: reason }, { status: 400 })

  const { data, error } = await service.rpc('konto_loeschen_vorschau', { p_user: id })
  if (error) {
    console.error('[GET /api/admin/users/:id/delete] vorschau', error.message)
    return NextResponse.json({ error: 'Die Vorschau konnte nicht geladen werden.' }, { status: 500 })
  }

  const counts = (data ?? {}) as { nachweise?: number; inhalte?: number }
  const preview: DeletePreview = {
    email: await readEmail(service, id),
    displayName: target.display_name,
    assessments: Number(counts.nachweise ?? 0),
    ownContent: Number(counts.inhalte ?? 0),
  }
  return NextResponse.json(preview)
}

/**
 * POST /api/admin/users/[id]/delete — Konto endgültig löschen (PROJ-60, DSGVO,
 * nur Super-Admin, keine Rückgängig-Funktion).
 *
 * Reihenfolge, damit nie ein halbes Konto bleibt: (1) in der Datenbank
 * anonymisieren und aufräumen (ein Vorgang), (2) Dateien im Speicher löschen,
 * (3) zuletzt das Auth-Konto samt Profil. Bricht ein Schritt ab, existiert das
 * Konto noch und ein neuer Versuch läuft zu Ende (jeder Schritt ist wiederholbar).
 * Ein zweiter Aufruf nach Erfolg trifft kein Konto mehr: 404 „Konto nicht gefunden“.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const access = await requireSuperAdminTarget(id, { blockSelf: true })
  if (access.error) return access.error
  const { auth, service, target } = access

  const reason = deleteBlockReason(target)
  if (reason) return NextResponse.json({ error: reason }, { status: 400 })

  const parsed = BodySchema.safeParse(await readJsonBody(request))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }

  // Der Server prüft die Bestätigung selbst; die Oberfläche ist nur eine Hilfe
  const email = await readEmail(service, id)
  if (!deleteConfirmationMatches(parsed.data.confirmEmail, email)) {
    return NextResponse.json({ error: 'Die eingetippte E-Mail-Adresse stimmt nicht.' }, { status: 400 })
  }

  const { data: prepared, error: prepareError } = await service.rpc('konto_loeschen_vorbereiten', { p_user: id })
  if (prepareError) {
    console.error('[POST /api/admin/users/:id/delete] vorbereiten', prepareError.message)
    return NextResponse.json({ error: DELETE_FAILED_MESSAGE }, { status: 500 })
  }
  const anonymized = Number((prepared as { nachweise?: number } | null)?.nachweise ?? 0)

  try {
    await removeUserFiles(service, id)
  } catch (err) {
    console.error('[POST /api/admin/users/:id/delete] dateien', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: DELETE_FAILED_MESSAGE }, { status: 500 })
  }

  const { error: deleteError } = await service.auth.admin.deleteUser(id)
  if (deleteError) {
    // Schon weg (zweiter Admin war schneller): kein Fehler, sondern „nicht gefunden“
    if (/not.?found/i.test(deleteError.message) || (deleteError as { status?: number }).status === 404) {
      return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 })
    }
    console.error('[POST /api/admin/users/:id/delete] auth', deleteError.message)
    return NextResponse.json({ error: DELETE_FAILED_MESSAGE }, { status: 500 })
  }

  // Eintrag ohne Personenbezug: weder Name noch E-Mail noch die Konto-Id, nur eine neue Zufalls-Kennung
  await writeAuditLog(auth.supabase, {
    admin_id: auth.user.id,
    action_type: USER_DELETE_ACTION,
    object_type: 'user',
    object_id: crypto.randomUUID(),
    details: { anonymized_assessments: anonymized },
    department_id: target.department_id,
  })

  return NextResponse.json({ ok: true, anonymizedAssessments: anonymized })
}
