// PROJ-134: Ablauf eines Leistungsnachweises – Schritt, Satz, Hauptaktion,
// Beitrittszeiten und Verlängern. Reine Funktionen, von Detailseite, Liste und
// API gemeinsam genutzt. Alle Zeiten gelten in der Schulzeitzone.

export const SCHUL_ZEITZONE = 'Europe/Berlin'

export type AblaufSchritt = 'entwurf' | 'offen' | 'geschlossen' | 'freigegeben'
export type HauptAktion = 'open' | 'close' | 'release_results' | null

export const SCHRITTE: { key: AblaufSchritt; label: string }[] = [
  { key: 'entwurf', label: 'Entwurf' },
  { key: 'offen', label: 'Offen' },
  { key: 'geschlossen', label: 'Geschlossen' },
  { key: 'freigegeben', label: 'Freigegeben' },
]

const SATZ: Record<AblaufSchritt, string> = {
  entwurf: 'Entwurf: Fragen prüfen, dann öffnen.',
  offen: 'Offen: Azubis können mit dem Code beitreten.',
  geschlossen: 'Geschlossen: Ergebnisse prüfen, dann freigeben.',
  freigegeben: 'Freigegeben: Azubis sehen ihre Note.',
}

export interface AblaufInput {
  status: 'draft' | 'open' | 'closed'
  resultsReleasedAt: string | null
  closesAt: string | null
  /** Anzahl Teilnehmender, die noch schreiben */
  inProgress: number
  now?: Date
}

export interface AblaufInfo {
  step: AblaufSchritt
  /** Index in SCHRITTE */
  stepIndex: number
  sentence: string
  primaryAction: HauptAktion
  /** Nur bei „Offen“, wenn der Beitritt vorbei ist, aber noch jemand schreibt */
  joinEndedNote: string | null
}

export function ablaufInfo({ status, resultsReleasedAt, closesAt, inProgress, now = new Date() }: AblaufInput): AblaufInfo {
  const step: AblaufSchritt =
    status === 'draft' ? 'entwurf' : status === 'open' ? 'offen' : resultsReleasedAt ? 'freigegeben' : 'geschlossen'
  const primaryAction: HauptAktion =
    step === 'entwurf' ? 'open' : step === 'offen' ? 'close' : step === 'geschlossen' ? 'release_results' : null
  const ended = step === 'offen' && !!closesAt && now.getTime() > new Date(closesAt).getTime()
  return {
    step,
    stepIndex: SCHRITTE.findIndex((s) => s.key === step),
    sentence: SATZ[step],
    primaryAction,
    joinEndedNote: ended && inProgress > 0 ? `Beitritt beendet, noch ${inProgress} schreiben` : null,
  }
}

// ── Zeitangaben ──────────────────────────────────────────────────────────────

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function berlinParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SCHUL_ZEITZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** „Do, 28.11., 23:59“ (Wochentag, Datum, 24-Stunden-Zeit in der Schulzeitzone) */
export function formatBeitrittZeit(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '–'
  const p = berlinParts(d)
  const weekday = WOCHENTAGE[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]
  return `${weekday}, ${pad(p.day)}.${pad(p.month)}., ${pad(p.hour)}:${pad(p.minute)}`
}

/** „1 Std. 20 Min.“, „45 Min.“, „2 Tage 3 Std.“; unter einer Minute „unter 1 Min.“ */
export function formatRestzeit(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 1) return 'unter 1 Min.'
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  if (days > 0) return `${days} ${days === 1 ? 'Tag' : 'Tage'}${hours > 0 ? ` ${hours} Std.` : ''}`
  if (hours > 0) return mins > 0 ? `${hours} Std. ${mins} Min.` : `${hours} Std.`
  return `${mins} Min.`
}

export interface BeitrittInfo {
  /** Zeile „Beitritt ab … · Beitritt bis …“ */
  range: string
  /** „Beitritt noch nicht geöffnet“ / „noch 1 Std. 20 Min.“ / „Beitritt beendet“ */
  state: string
  phase: 'not_open' | 'running' | 'ended'
}

export function beitrittInfo(params: {
  status: 'draft' | 'open' | 'closed'
  opensAt: string | null
  closesAt: string
  now?: Date
}): BeitrittInfo {
  const { status, opensAt, closesAt, now = new Date() } = params
  const bis = `Beitritt bis ${formatBeitrittZeit(closesAt)}`
  const range = opensAt ? `Beitritt ab ${formatBeitrittZeit(opensAt)} · ${bis}` : bis
  if (status === 'draft') {
    // QA BUG-3: ein Entwurf mit abgelaufenem „Beitritt bis“ kann nicht geöffnet werden
    if (now.getTime() > new Date(closesAt).getTime()) {
      return { range, state: 'Beitritt bis ist schon vorbei – bitte verlängern, bevor du öffnest', phase: 'ended' }
    }
    return { range, state: 'Beitritt noch nicht geöffnet', phase: 'not_open' }
  }
  if (status === 'closed' || now.getTime() > new Date(closesAt).getTime()) {
    return { range, state: 'Beitritt beendet', phase: 'ended' }
  }
  if (opensAt && now.getTime() < new Date(opensAt).getTime()) {
    return { range, state: 'Beitritt noch nicht geöffnet', phase: 'not_open' }
  }
  return { range, state: `noch ${formatRestzeit(new Date(closesAt).getTime() - now.getTime())}`, phase: 'running' }
}

// ── Verlängern ───────────────────────────────────────────────────────────────

/** Uhrzeit an der Wand der Schulzeitzone (Jahr, Monat 1–12, Tag, Stunde, Minute) als Zeitpunkt */
export function berlinWandzeit(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  // Versatz der Schulzeitzone an diesem Zeitpunkt bestimmen und abziehen
  const at = berlinParts(new Date(guess))
  const asUtc = Date.UTC(at.year, at.month - 1, at.day, at.hour, at.minute)
  return new Date(guess - (asUtc - guess))
}

/** Eingabe aus einem `datetime-local`-Feld („2026-11-28T23:59“) als Zeit der Schulzeitzone, nicht des Geräts */
export function parseBerlinEingabe(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null
  return berlinWandzeit(y, mo, d, h, mi)
}

/** Heute um 23:59 in der Schulzeitzone, auch am Tag der Zeitumstellung */
export function heute2359(now: Date = new Date()): Date {
  const p = berlinParts(now)
  return berlinWandzeit(p.year, p.month, p.day, 23, 59)
}

export type VerlaengernWahl = '+30' | '+60' | 'heute'

export function verlaengerteZeit(closesAt: string, wahl: VerlaengernWahl, now: Date = new Date()): Date {
  const current = new Date(closesAt)
  if (wahl === '+30') return new Date(current.getTime() + 30 * 60000)
  if (wahl === '+60') return new Date(current.getTime() + 60 * 60000)
  return heute2359(now)
}

/** Fehlertext oder null, wenn die neue Zeit zulässig ist */
export function pruefeVerlaengern(params: {
  status: 'draft' | 'open' | 'closed'
  autoClosedAt?: string | null
  currentClosesAt: string
  newClosesAt: string
  now?: Date
}): string | null {
  const { status, autoClosedAt, currentClosesAt, newClosesAt, now = new Date() } = params
  if (status === 'closed') {
    return autoClosedAt
      ? 'Der Nachweis wurde schon automatisch geschlossen. Der Beitritt lässt sich nicht mehr verlängern. Lege bei Bedarf mit „Duplizieren“ eine Kopie an.'
      : 'Ein geschlossener Nachweis lässt sich nicht verlängern.'
  }
  const next = new Date(newClosesAt).getTime()
  if (Number.isNaN(next)) return 'Bitte gib eine gültige Zeit an.'
  if (next <= new Date(currentClosesAt).getTime()) return 'Die neue Zeit muss nach der bisherigen liegen.'
  if (next <= now.getTime()) return 'Die neue Zeit muss in der Zukunft liegen.'
  return null
}

// ── Ersteller ────────────────────────────────────────────────────────────────

export function erstellerName(params: {
  createdBy: string | null
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  profileFound: boolean
}): string {
  if (!params.createdBy) return 'Ehemaliges Konto'
  const full = [params.firstName?.trim(), params.lastName?.trim()].filter(Boolean).join(' ')
  if (full) return full
  if (params.displayName?.trim()) return params.displayName.trim()
  return params.profileFound ? 'Unbekannt' : 'Ehemaliges Konto'
}
