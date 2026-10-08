// Shared rules for PROJ-30 (Fokus-Verlust-Protokoll bei Leistungsnachweisen).
// Server routes, the runner and the admin views all read the same constants
// so the "counts / is short" decision lives in exactly one place.

/** Abwesenheiten ab dieser Dauer zählen als Wechsel; kürzere werden nur als „kurz" protokolliert. */
export const FOCUS_COUNT_FROM_SECONDS = 3

/** Höchstzahl gespeicherter Einzel-Einträge je Teilnahme (Zähler laufen darüber hinaus weiter). */
export const FOCUS_MAX_EVENTS = 200

/** Meldelimit je Teilnahme und Minute — ehrliche Azubis erreichen es nie. */
export const FOCUS_MAX_REPORTS_PER_MINUTE = 60

export const FOCUS_AUTO_SUBMIT_MIN = 1
export const FOCUS_AUTO_SUBMIT_MAX = 20

export type FocusSettings = {
  focusTracking: boolean
  /** NULL = keine automatische Abgabe */
  focusAutoSubmitAfter: number | null
}

/** Auto-Abgabe ist nur mit aktiver Protokollierung sinnvoll und auf 1–20 begrenzt. */
export function validateFocusSettings(settings: FocusSettings): string | null {
  const { focusTracking, focusAutoSubmitAfter } = settings
  if (focusAutoSubmitAfter == null) return null
  if (!focusTracking) return 'Die automatische Abgabe setzt voraus, dass das Verlassen der Prüfung protokolliert wird.'
  if (
    !Number.isInteger(focusAutoSubmitAfter) ||
    focusAutoSubmitAfter < FOCUS_AUTO_SUBMIT_MIN ||
    focusAutoSubmitAfter > FOCUS_AUTO_SUBMIT_MAX
  ) {
    return `Die Grenze für die automatische Abgabe muss zwischen ${FOCUS_AUTO_SUBMIT_MIN} und ${FOCUS_AUTO_SUBMIT_MAX} liegen.`
  }
  return null
}

/** 102 → „1:42 min" */
export function formatFocusDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${String(s).padStart(2, '0')} min`
}

/** (3, 102) → „3× · 1:42 min"; ohne zählenden Wechsel „—" */
export function formatFocusSummary(countedSwitches: number, countedSeconds: number): string {
  if (countedSwitches <= 0) return '—'
  return `${countedSwitches}× · ${formatFocusDuration(countedSeconds)}`
}

/** Eine Abwesenheit zählt, sobald sie die Toleranzgrenze erreicht. */
export function countsAsSwitch(durationSeconds: number): boolean {
  return durationSeconds >= FOCUS_COUNT_FROM_SECONDS
}

export type FocusSummaryRow = {
  counted_switches: number
  counted_seconds: number
  short_count: number
  auto_submitted: boolean
}

export type FocusOpenEvent = { left_at: string }

export type ParticipantFocus = {
  countedSwitches: number
  countedSeconds: number
  shortCount: number
  autoSubmitted: boolean
  /** Der Azubi ist gerade nicht in der Prüfung (offener Eintrag). */
  away: boolean
  /** Mindestens ein zählender Wechsel (auch ein offener, der die Toleranz überschritten hat). */
  conspicuous: boolean
}

/**
 * Fasst Zusammenfassung und noch offene Einträge für die Teilnehmerliste
 * zusammen. Ein offener Eintrag zählt, sobald er die Toleranz überschritten
 * hat — der Server schließt ihn erst bei der nächsten Meldung oder Abgabe.
 */
export function buildParticipantFocus(
  summary: FocusSummaryRow | undefined,
  openEvents: FocusOpenEvent[],
  now: Date = new Date(),
): ParticipantFocus {
  let countedSwitches = summary?.counted_switches ?? 0
  let countedSeconds = summary?.counted_seconds ?? 0
  let shortCount = summary?.short_count ?? 0
  for (const ev of openEvents) {
    const seconds = Math.max(0, Math.floor((now.getTime() - new Date(ev.left_at).getTime()) / 1000))
    if (countsAsSwitch(seconds)) {
      countedSwitches += 1
      countedSeconds += seconds
    } else {
      shortCount += 1
    }
  }
  return {
    countedSwitches,
    countedSeconds,
    shortCount,
    autoSubmitted: summary?.auto_submitted ?? false,
    away: openEvents.length > 0,
    conspicuous: countedSwitches > 0,
  }
}
