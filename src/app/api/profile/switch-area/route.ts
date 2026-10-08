import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { ensureLinkedUser, getLinkContext } from '@/lib/linked-account'
import { writeAuditLog } from '@/app/api/admin/_lib/auth'

const Schema = z.object({ target: z.enum(['main', 'linked']) })

/**
 * Bereichs-Umschalter für den Super-Admin (PROJ-29): wechselt die Sitzung
 * zwischen Hauptkonto (Spedition) und verknüpftem Tourismus-Zweitkonto.
 *
 * Das Ziel steht nie als Konto-ID im Aufruf, nur als "main" / "linked"; welches
 * Konto das ist, bestimmt allein die Verknüpfung in der Datenbank. Der
 * Sitzungswechsel läuft ohne Passwort über einen serverseitig erzeugten
 * Einmal-Token, der direkt eingelöst wird und den Server nie verlässt.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const { target } = parsed.data

  const service = createServiceClient()
  const link = await getLinkContext(service, user.id)
  if (!link) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Schon im gewünschten Konto — nichts zu tun
  if (link.current === target) return NextResponse.json({ ok: true, switched: false })

  try {
    // Hier ist das Ziel immer das andere Konto des Paars (gleiches Ziel: oben beendet)
    const targetUserId = target === 'main' ? link.mainUserId : await ensureLinkedUser(service, link.mainUserId)

    const { data: targetAuth, error: targetErr } = await service.auth.admin.getUserById(targetUserId)
    const targetEmail = targetAuth?.user?.email
    if (targetErr || !targetEmail) throw new Error(`Zielkonto nicht lesbar: ${targetErr?.message ?? 'ohne E-Mail'}`)

    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail,
    })
    const tokenHash = linkData?.properties?.hashed_token
    if (linkErr || !tokenHash) throw new Error(`Anmeldung nicht erzeugt: ${linkErr?.message ?? 'ohne Token'}`)

    // Löst den Token ein und ersetzt die Sitzungs-Cookies durch die des Zielkontos
    const { error: verifyErr } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })
    if (verifyErr) throw new Error(`Sitzungswechsel fehlgeschlagen: ${verifyErr.message}`)

    await writeAuditLog(service, {
      admin_id: link.mainUserId,
      action_type: 'switch_area',
      object_type: 'account',
      object_id: targetUserId,
      object_label: target === 'main' ? 'Hauptkonto' : 'Tourismus-Zweitkonto',
      details: { from: link.current, to: target },
    })

    return NextResponse.json({ ok: true, switched: true })
  } catch (err) {
    console.error('[POST /api/profile/switch-area]', err)
    return NextResponse.json({ error: 'Umschalten fehlgeschlagen' }, { status: 500 })
  }
}
