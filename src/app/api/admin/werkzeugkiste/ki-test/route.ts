import { NextResponse } from 'next/server'
import { requireAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { kostenUsd } from '@/lib/werkzeugkiste-kosten'
import { frageKi, ladeKiEinstellungen } from '@/lib/werkzeugkiste-direkt'

export const maxDuration = 60

/**
 * GET /api/admin/werkzeugkiste/ki-test (PROJ-64) — Selbsttest für den Super-Admin:
 * eine winzige Anfrage mit denselben Einstellungen wie die echte Erstellung
 * (Modell, Nachdenken aus). Kostet unter 0,001 €, zeigt aber sofort, ob die
 * KI-Schnittstelle erreichbar ist und die Einstellungen akzeptiert. Wird bewusst
 * nicht als Lauf erfasst.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) return NextResponse.json({ error: 'Das kann nur der Super-Admin.' }, { status: 403 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ok: false, problem: 'ANTHROPIC_API_KEY fehlt in dieser Umgebung.' }, { status: 503 })

  const e = await ladeKiEinstellungen(createServiceClient())
  const start = Date.now()
  try {
    const r = await frageKi(e.modell, [{ role: 'user', content: 'Antworte nur mit dem Wort: OK' }], 50)
    return NextResponse.json({
      ok: true,
      modell: e.modell,
      antwort: r.text.slice(0, 50),
      bausteine: r.verbrauch,
      kostenUsd: kostenUsd(r.verbrauch, e.preis),
      dauerMs: Date.now() - start,
    })
  } catch (err) {
    const status = (err as { status?: number }).status
    return NextResponse.json(
      { ok: false, modell: e.modell, status: status ?? null, problem: err instanceof Error ? err.message.slice(0, 600) : 'unbekannt', dauerMs: Date.now() - start },
      { status: 502 },
    )
  }
}
