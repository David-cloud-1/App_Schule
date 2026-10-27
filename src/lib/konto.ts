import { z } from 'zod'

/**
 * „Mein Konto“ (PROJ-50): Regeln und kleine Helfer, die Seite und
 * Server-Schnittstellen gemeinsam nutzen — damit Formular und Server
 * dieselbe Prüfung anwenden.
 */

/** Kürzel: 2–5 Buchstaben (inkl. Umlaute), wird groß gespeichert */
export const KUERZEL_MIN = 2
export const KUERZEL_MAX = 5
const KUERZEL_PATTERN = /^[A-ZÄÖÜẞ]+$/

export const KUERZEL_HINT = `${KUERZEL_MIN}–${KUERZEL_MAX} Buchstaben, ohne Ziffern und Sonderzeichen`

/**
 * Eingabe → gespeicherter Wert. Leer (nach Entfernen der Ränder) heißt
 * „Kürzel entfernen“ und ergibt `null`; ungültige Eingaben ergeben `invalid`.
 */
export function parseKuerzel(input: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: true, value: null }
  const upper = trimmed.toLocaleUpperCase('de-DE')
  if (upper.length < KUERZEL_MIN || upper.length > KUERZEL_MAX || !KUERZEL_PATTERN.test(upper)) {
    return { ok: false, error: `Bitte ${KUERZEL_HINT}.` }
  }
  return { ok: true, value: upper }
}

/** Mindestlänge wie bei der Registrierung */
export const PASSWORD_MIN = 8

export const passwordChangeSchema = z
  .object({
    /** Fehlt bei Konten ohne eigenes Passwort (Google/Apple) — dann heißt es „festlegen“ */
    currentPassword: z.string().optional(),
    newPassword: z.string().min(PASSWORD_MIN, `Das Passwort braucht mindestens ${PASSWORD_MIN} Zeichen.`).max(72, 'Das Passwort ist zu lang.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Die beiden Passwörter sind nicht gleich.',
    path: ['confirmPassword'],
  })

export const emailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Bitte eine gültige E-Mail-Adresse eingeben.').max(254),
})

/** Kurze Zeitangabe fürs „Zuletzt bearbeitet“: „gerade eben“, „vor 5 Min.“, „vor 2 Std.“, „vor 3 Tagen“, sonst Datum */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  if (Number.isNaN(then.getTime())) return ''
  if (diffMs < 60_000) return 'gerade eben'
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  return then.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' })
}

/** Zeitpunkt, ab dem „Mein Beitrag“ zählt (Start des Änderungsverlaufs, PROJ-47) */
export const BEITRAG_SEIT_LABEL = '27.10.2026'

export type KontoContentType = 'question' | 'topic' | 'subject' | 'exam_question_set'

export const CONTENT_TYPE_LABEL: Record<KontoContentType, string> = {
  question: 'Frage',
  topic: 'Thema',
  subject: 'Fach',
  exam_question_set: 'Prüfungsset',
}

/** Wohin ein Eintrag aus „Zuletzt bearbeitet“ führt (Papierkorb für Gelöschtes) */
export function contentHref(type: KontoContentType, deleted: boolean): string {
  if (deleted) return '/admin/papierkorb'
  switch (type) {
    case 'question':
      return '/admin/questions'
    case 'topic':
      return '/admin/topics'
    case 'subject':
      return '/admin/subjects'
    case 'exam_question_set':
      return '/admin/exam-sets'
  }
}

/** Titel aus der gespeicherten Momentaufnahme: Frage → Fragetext, sonst Name/Titel */
export function contentTitleFromSnapshot(type: KontoContentType, data: unknown): string {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = d[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return null
  }
  const fallback = `${CONTENT_TYPE_LABEL[type]} ohne Titel`
  return type === 'question'
    ? (pick('question_text', 'text', 'title') ?? fallback)
    : (pick('name', 'title') ?? fallback)
}
