import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase-server'
import { isReminderWindow } from '@/lib/push-reminder'
import { runReminderJob } from '@/lib/push-reminder-job'
import { configureWebPush, sendPush } from '@/lib/push-send'

export const maxDuration = 300

function erlaubt(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const kopf = request.headers.get('authorization') ?? ''
  if (!secret) return false
  const soll = Buffer.from(`Bearer ${secret}`)
  const ist = Buffer.from(kopf)
  return soll.length === ist.length && timingSafeEqual(soll, ist)
}

/**
 * GET /api/cron/push-erinnerung (PROJ-18) — Zeitplan von Vercel, dienstags und
 * donnerstags. Zwei Einträge (17 und 18 Uhr UTC), damit Sommer- und Winterzeit
 * beide 19 Uhr Berlin treffen; der Lauf außerhalb von 19 Uhr Berlin tut nichts.
 *
 * `?dry=1` rechnet nur und zählt (ohne Termin-Prüfung, ohne Versand, ohne
 * Speichern) — zum Prüfen mit gültigem CRON_SECRET. Antwort enthält nur Zahlen.
 * Ohne gültiges CRON_SECRET: 401.
 */
export async function GET(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: 'nicht erlaubt' }, { status: 401 })

  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const now = new Date()

  if (!dry && !isReminderWindow(now)) {
    return NextResponse.json({ ok: true, ausgefuehrt: false, grund: 'kein Erinnerungstermin (Di/Do, 19 Uhr Berlin)' })
  }
  if (!dry && !configureWebPush()) {
    console.error('[cron/push-erinnerung] VAPID-Schlüssel fehlen')
    return NextResponse.json({ error: 'VAPID-Schlüssel fehlen' }, { status: 500 })
  }

  try {
    const result = await runReminderJob({ service: createServiceClient(), now, send: sendPush, dry })
    return NextResponse.json({ ok: true, ausgefuehrt: true, ...result })
  } catch (err) {
    console.error('[cron/push-erinnerung]', (err as Error).message)
    return NextResponse.json({ error: 'Lauf fehlgeschlagen' }, { status: 500 })
  }
}
