import { z } from 'zod'

/**
 * Fragen melden (PROJ-72) und Meldungs-Inbox (PROJ-73).
 * Gemeinsame Konstanten, Beschriftungen und Eingabe-Prüfung für Azubi- und
 * Lehrkraft-Seite. Die Regeln selbst (Limits, Belohnung) liegen in den
 * Datenbank-Funktionen report_question / close_question_reports.
 */

export const REPORT_REASONS = [
  'andere_antwort_richtig',
  'richtige_antwort_falsch',
  'tippfehler_unklar',
  'veraltet',
  'sonstiges',
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  andere_antwort_richtig: 'Eine andere Antwort stimmt auch',
  richtige_antwort_falsch: 'Die richtige Antwort ist falsch',
  tippfehler_unklar: 'Tippfehler / unklar formuliert',
  veraltet: 'Veraltet',
  sonstiges: 'Etwas anderes',
}

/** Kurzform für Chips in der Inbox */
export const REPORT_REASON_SHORT: Record<ReportReason, string> = {
  andere_antwort_richtig: 'Zweite Antwort richtig',
  richtige_antwort_falsch: 'Lösung falsch',
  tippfehler_unklar: 'Tippfehler / unklar',
  veraltet: 'Veraltet',
  sonstiges: 'Sonstiges',
}

export const REPORT_STATUSES = ['offen', 'in_pruefung', 'korrigiert', 'nicht_uebernommen', 'entfaellt'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  offen: 'Offen',
  in_pruefung: 'In Prüfung',
  korrigiert: 'Korrigiert',
  nicht_uebernommen: 'Nicht übernommen',
  entfaellt: 'Frage entfällt',
}

/** Belohnung je berechtigter Meldung (steht auch in der Datenbank-Funktion) */
export const REPORT_REWARD_COINS = 15
export const REPORT_NOTE_MAX = 500
export const REPORT_RESPONSE_MAX = 200

/** Vorlagen für die Kurzbegründung bei „Nicht übernommen“ */
export const REPORT_RESPONSE_TEMPLATES = [
  'Die Frage ist korrekt, siehe Erklärung.',
  'Die Frage ist nach Lehrplan so richtig.',
  'Danke, wir haben es geprüft und nichts geändert.',
] as const

/** So viele Einzelmeldungen liefert die Detail-Schnittstelle je Frage höchstens */
export const REPORT_DETAIL_LIMIT = 100
/** So viele Meldungs-IDs nimmt der Abschluss höchstens an */
export const REPORT_IDS_MAX = 200

const uuid = z.string().uuid('Ungültige Kennung.')

export const reportCreateSchema = z
  .object({
    question_id: uuid,
    reason: z.enum(REPORT_REASONS, { message: 'Bitte wähle einen Grund.' }),
    note: z.string().trim().max(REPORT_NOTE_MAX, `Höchstens ${REPORT_NOTE_MAX} Zeichen.`).optional(),
    option_id: uuid.optional(),
  })
  .refine((v) => v.reason !== 'sonstiges' || !!v.note, {
    message: 'Bitte beschreibe kurz, was nicht stimmt.',
    path: ['note'],
  })

export const reportReadSchema = z.object({
  ids: z.array(uuid).min(1).max(50),
})

export const reportCloseSchema = z.object({
  result: z.enum(['korrigiert', 'nicht_uebernommen', 'entfaellt']),
  response: z.string().trim().max(REPORT_RESPONSE_MAX, `Höchstens ${REPORT_RESPONSE_MAX} Zeichen.`).optional(),
  silent: z.boolean().optional(),
  report_ids: z.array(uuid).min(1).max(REPORT_IDS_MAX).optional(),
})

export const reportBulkCloseSchema = z.object({
  question_ids: z.array(uuid).min(1).max(100),
  response: z.string().trim().max(REPORT_RESPONSE_MAX, `Höchstens ${REPORT_RESPONSE_MAX} Zeichen.`).optional(),
})

const GENERIC = 'Das hat nicht geklappt. Bitte versuche es erneut.'

const ERROR_TEXT: Record<string, { status: number; message: string }> = {
  NOT_AUTHENTICATED: { status: 401, message: 'Bitte melde dich an.' },
  FORBIDDEN: { status: 403, message: 'Dafür fehlt dir die Berechtigung.' },
  INVALID_REASON: { status: 400, message: 'Bitte wähle einen Grund.' },
  NOTE_TOO_LONG: { status: 400, message: `Höchstens ${REPORT_NOTE_MAX} Zeichen.` },
  NOTE_REQUIRED: { status: 400, message: 'Bitte beschreibe kurz, was nicht stimmt.' },
  INVALID_RESULT: { status: 400, message: 'Ungültiges Ergebnis.' },
  RESPONSE_TOO_LONG: { status: 400, message: `Höchstens ${REPORT_RESPONSE_MAX} Zeichen.` },
  QUESTION_NOT_FOUND: { status: 404, message: 'Diese Frage gibt es nicht mehr.' },
  SESSION_RUNNING: { status: 409, message: 'Während einer Prüfung kannst du nichts melden.' },
  DAILY_LIMIT: { status: 429, message: 'Du hast heute schon viele Fragen gemeldet. Morgen geht es weiter.' },
  ALREADY_REPORTED: { status: 409, message: 'Du hast diese Frage schon gemeldet.' },
}

/** Fehler einer Datenbank-Funktion in Status und deutschen Text übersetzen. */
export function reportErrorResponse(error: { code?: string; message?: string }): {
  status: number
  message: string
  /** Kennung des bekannten Fehlers (z. B. ALREADY_REPORTED), damit die Oberfläche Fälle unterscheiden kann */
  code?: string
} {
  const key = error.message?.trim()
  const known = key ? ERROR_TEXT[key] : undefined
  if (known) return { ...known, code: key }
  if (error.code === '42501') return { ...ERROR_TEXT.FORBIDDEN, code: 'FORBIDDEN' }
  return { status: 500, message: GENERIC }
}
