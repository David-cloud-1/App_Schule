import { toBerlinDateStr } from '@/lib/home-today'

/**
 * Regeln der Erinnerungen per Web-Push (PROJ-18, Nachträge 5–10) — reine
 * Funktionen ohne Datenbank und Netz, damit sie sich genau testen lassen.
 * Der Versand-Job (`push-reminder-job.ts`) setzt sie zusammen.
 */

/** Erinnerungstage: Dienstag und Donnerstag (ISO: Montag = 1) */
export const REMINDER_WEEKDAYS = [2, 4] as const
/** Uhrzeit in Europe/Berlin (der Cron läuft stundengenau, siehe vercel.json) */
export const REMINDER_HOUR_BERLIN = 19
/** So viele Erinnerungen in Folge ohne Reaktion, dann nur noch seltener */
export const IGNORED_LIMIT = 4
/** Abstand der Erinnerungen, sobald sie abgeklungen sind */
export const PAUSED_INTERVAL_DAYS = 14
/** Höchstens so viele Geräte je Konto (das älteste fliegt raus) */
export const MAX_DEVICES_PER_USER = 5
/** Meldung verfällt nach 4 Stunden, damit sie nicht am nächsten Morgen auftaucht */
export const PUSH_TTL_SECONDS = 4 * 3600

// ── Zeit ─────────────────────────────────────────────────────────────────────

export interface BerlinTime {
  /** YYYY-MM-DD in Europe/Berlin */
  dateStr: string
  /** ISO-Wochentag, Montag = 1 … Sonntag = 7 */
  weekday: number
  hour: number
}

const WEEKDAY_BY_SHORT: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

export function berlinTime(now: Date): BerlinTime {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = WEEKDAY_BY_SHORT[parts.find((p) => p.type === 'weekday')?.value ?? ''] ?? 0
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '-1')
  return { dateStr: toBerlinDateStr(now), weekday, hour }
}

/**
 * Ist jetzt Erinnerungszeit? Der Cron läuft zweimal (17 und 18 Uhr UTC), damit
 * Sommer- und Winterzeit beide 19 Uhr Berlin treffen; nur einer davon besteht
 * diese Prüfung.
 */
export function isReminderWindow(now: Date): boolean {
  const t = berlinTime(now)
  return (REMINDER_WEEKDAYS as readonly number[]).includes(t.weekday) && t.hour === REMINDER_HOUR_BERLIN
}

/** Ganze Kalendertage zwischen zwei YYYY-MM-DD (b − a) */
export function dayDiff(a: string, b: string): number {
  const ms = Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)
  return Math.round(ms / 86_400_000)
}

export function addDays(dateStr: string, days: number): string {
  return new Date(Date.parse(`${dateStr}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

// ── Entscheidung ─────────────────────────────────────────────────────────────

export interface ReminderState {
  last_sent_date: string | null
  sent_count: number
  ignored_in_a_row: number
}

export interface ReminderCandidate {
  currentStreak: number
  /** Datum der letzten Quiz-Runde (profiles.last_session_date), YYYY-MM-DD */
  lastSessionDate: string | null
  /** Hat dieses Konto je gespielt? (Registrierte ohne Runde bekommen nichts) */
  everPlayed: boolean
  state: ReminderState | null
  /** Berliner Tage mit Lernaktivität (Runde, Blitzrunde, Prüfung), mindestens die letzten 16 Tage */
  activityDays: ReadonlySet<string>
}

export type SkipReason = 'nie-gespielt' | 'heute-gelernt' | 'heute-schon-gesendet' | 'abgeklungen'

export type ReminderDecision =
  | { send: false; reason: SkipReason; ignoredInARow: number }
  | { send: true; ignoredInARow: number; streak: number | null }

/**
 * Hat der Schüler auf die letzte Erinnerung reagiert? Maßgeblich ist Lernen am
 * Erinnerungstag oder am Tag danach (Spec: „am selben oder Folgetag“).
 */
export function reactedToLast(lastSentDate: string, activityDays: ReadonlySet<string>): boolean {
  return activityDays.has(lastSentDate) || activityDays.has(addDays(lastSentDate, 1))
}

/**
 * Soll diesem Konto jetzt eine Erinnerung geschickt werden?
 * Setzt voraus, dass `isReminderWindow(now)` gilt (prüft der Aufrufer).
 */
export function decideReminder(c: ReminderCandidate, now: Date): ReminderDecision {
  const today = berlinTime(now).dateStr
  const prev = c.state
  const prevIgnored = prev?.ignored_in_a_row ?? 0

  // Die vorige Erinnerung bewerten (nur wenn ihr Reaktionsfenster vorbei ist)
  let ignored = prevIgnored
  if (prev?.last_sent_date) {
    if (prev.last_sent_date === today) return { send: false, reason: 'heute-schon-gesendet', ignoredInARow: prevIgnored }
    ignored = reactedToLast(prev.last_sent_date, c.activityDays) ? 0 : prevIgnored + 1
  }

  if (!c.everPlayed) return { send: false, reason: 'nie-gespielt', ignoredInARow: ignored }
  if (c.activityDays.has(today)) return { send: false, reason: 'heute-gelernt', ignoredInARow: ignored }

  // Abgeklungen: nur noch alle 14 Tage
  if (ignored >= IGNORED_LIMIT && prev?.last_sent_date && dayDiff(prev.last_sent_date, today) < PAUSED_INTERVAL_DAYS) {
    return { send: false, reason: 'abgeklungen', ignoredInARow: ignored }
  }

  // Streak-Text nur, wenn der Streak heute noch zu retten ist (letzte Runde gestern)
  const rescuable = c.currentStreak >= 1 && c.lastSessionDate === addDays(today, -1)
  return { send: true, ignoredInARow: ignored, streak: rescuable ? c.currentStreak : null }
}

// ── Texte ────────────────────────────────────────────────────────────────────

export interface ReminderBranding {
  appName: string
  currencyName: string
  hofName: string
  /** Dateipräfix des App-Symbols (sped / tour / neutral) */
  iconPrefix: string
}

export interface ReminderPayload {
  title: string
  body: string
  url: string
  icon: string
}

/**
 * Kurze, abwechselnde Texte (Nachtrag 7). Keine Namen, keine Lerninhalte
 * (Datenschutz). Platzhalter: {münzen}, {hof}.
 */
export const REMINDER_TEXTS: readonly string[] = [
  'Eine Blitzrunde dauert nur eine Minute.',
  '5 Minuten für deine Prüfung?',
  'Sammle ein paar {münzen}: eine kurze Runde reicht.',
  'Dein {hof} wartet auf dich.',
  'Ein paar Fragen, dann ist der Tag geschafft.',
  'Noch nicht gelernt? Eine Runde reicht.',
  'Kurz auffrischen, damit es in der Prüfung sitzt?',
]

export function streakText(streak: number): string {
  return `Dein ${streak}-Tage-Streak wartet: eine Runde reicht.`
}

/** Welcher Text kommt dran? Reihum nach Anzahl bisher gesendeter Erinnerungen. */
export function buildPayload(sentCount: number, streak: number | null, brand: ReminderBranding): ReminderPayload {
  const raw = streak !== null ? streakText(streak) : REMINDER_TEXTS[Math.max(0, sentCount) % REMINDER_TEXTS.length]
  const body = raw.replaceAll('{münzen}', brand.currencyName).replaceAll('{hof}', brand.hofName)
  return {
    title: brand.appName,
    body,
    url: '/quiz',
    icon: `/icons/${brand.iconPrefix}-192.png`,
  }
}

// ── Push-Adresse prüfen ──────────────────────────────────────────────────────

/**
 * Der Server schickt später Anfragen an die vom Browser gemeldete Adresse. Damit
 * niemand den Server auf fremde Ziele lenken kann (SSRF), sind nur die Push-
 * Dienste der gängigen Browser erlaubt.
 */
const ALLOWED_PUSH_HOSTS: readonly string[] = [
  'fcm.googleapis.com', // Chrome, Edge, Android
  'updates.push.services.mozilla.com', // Firefox
  'web.push.apple.com', // Safari / iOS
  'notify.windows.com', // Edge (Windows), auch Subdomains
  'push.apple.com', // ältere Apple-Adressen, auch Subdomains
]

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username || url.password) return false
  const host = url.hostname.toLowerCase()
  return ALLOWED_PUSH_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}
