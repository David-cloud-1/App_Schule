/**
 * Erinnerungen per Web-Push (PROJ-18) — reine Regeln ohne Browser-Zugriff,
 * damit sie testbar sind. Der Browser-Teil steckt in `use-push-reminder.ts`.
 */

/** Wie lange eine abgelehnte Opt-in-Karte ruht, bevor sie (einmal) wiederkommt */
export const OPT_IN_RETRY_DAYS = 14

/** Uhrzeit der Erinnerung — nur für Texte; der Versand steckt im Cron (PROJ-18, Nachtrag 5) */
export const REMINDER_HOUR = 19

/** Erinnerungstage als Text (Dienstag und Donnerstag, PROJ-18 Nachtrag 10); der Versand läuft im Cron */
export const REMINDER_DAYS_LABEL = 'dienstags und donnerstags'

/** Server-Stand der Erinnerungen eines Kontos (GET /api/push/status) */
export interface PushServerStatus {
  /** Mindestens ein Gerät des Kontos ist angemeldet */
  enabled: boolean
  /** Zuletzt „Nein danke“ auf der Opt-in-Karte */
  declined_at: string | null
  /** Wie oft die Karte abgelehnt wurde */
  decline_count: number
}

/**
 * Was dieses Gerät kann:
 * - `supported`: Erinnerungen lassen sich einschalten
 * - `ios-install-needed`: iPhone/iPad in Safari — erst „Zum Home-Bildschirm“
 * - `unsupported`: Browser kann kein Web-Push (oder die App ist nicht eingerichtet)
 */
export type PushSupport = 'supported' | 'ios-install-needed' | 'unsupported'

export interface PushEnvironment {
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
  isIos: boolean
  isStandalone: boolean
  /** Öffentlicher VAPID-Schlüssel ist gesetzt */
  hasVapidKey: boolean
}

export function detectPushSupport(env: PushEnvironment): PushSupport {
  if (!env.hasVapidKey) return 'unsupported'
  // iOS erlaubt Push nur aus der installierten Home-Bildschirm-App (ab 16.4).
  // In Safari fehlt dort der PushManager — dann die Anleitung statt eines stummen Fehlers.
  if (env.isIos && !env.isStandalone) return 'ios-install-needed'
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return 'unsupported'
  return 'supported'
}

/** iPhone, iPad (auch iPadOS, das sich als Mac ausgibt) */
export function isIosUserAgent(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

/**
 * Soll die Opt-in-Karte erscheinen? Genau einmal; nach „Nein danke“
 * frühestens nach 14 Tagen und höchstens noch ein weiteres Mal.
 */
export function shouldShowOptInCard(status: PushServerStatus, now: Date): boolean {
  if (status.enabled) return false
  if (status.decline_count <= 0) return true
  if (status.decline_count >= 2 || !status.declined_at) return false
  const declined = Date.parse(status.declined_at)
  if (Number.isNaN(declined)) return false
  return now.getTime() - declined >= OPT_IN_RETRY_DAYS * 86_400_000
}

/** Dateipräfix der App-Symbole in `public/icons` je Fachbereich */
export function appIconPrefix(departmentCode: string | null | undefined): 'sped' | 'tour' | 'neutral' {
  switch ((departmentCode ?? '').toUpperCase()) {
    case 'SPED':
      return 'sped'
    case 'TOUR':
      return 'tour'
    default:
      return 'neutral'
  }
}

/** VAPID-Schlüssel (base64url) → Bytes für `pushManager.subscribe` */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
