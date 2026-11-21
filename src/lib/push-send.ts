import webpush from 'web-push'
import { PUSH_TTL_SECONDS, type ReminderPayload } from '@/lib/push-reminder'

export interface PushDevice {
  endpoint: string
  p256dh: string
  auth: string
}

/** ok = zugestellt an den Push-Dienst · gone = Gerät abgemeldet (404/410) · error = vorübergehender Fehler */
export type PushSendResult = 'ok' | 'gone' | 'error'

let configured = false

/**
 * Setzt die VAPID-Schlüssel (nur serverseitig). Der private Schlüssel liegt nie im
 * Browser-Code. Gibt false zurück, wenn die Schlüssel fehlen.
 */
export function configureWebPush(): boolean {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  // Kontakt für die Push-Dienste: bei Problemen melden sie sich dort
  const subject = process.env.VAPID_SUBJECT || 'https://spedilern.vercel.app'
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export async function sendPush(device: PushDevice, payload: ReminderPayload): Promise<PushSendResult> {
  try {
    await webpush.sendNotification(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      JSON.stringify(payload),
      { TTL: PUSH_TTL_SECONDS, urgency: 'normal', timeout: 10_000 },
    )
    return 'ok'
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    // 404/410: Abmeldung oder entzogene Erlaubnis → die Anmeldung wird gelöscht
    if (status === 404 || status === 410) return 'gone'
    console.error('[push-send]', status ?? '', (err as Error).message)
    return 'error'
  }
}
