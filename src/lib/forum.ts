import { z } from 'zod'

/**
 * Lehrerzimmer (PROJ-63) — gemeinsame Werte und Eingabe-Regeln für
 * Schnittstellen und Oberfläche. Die Grenzen entsprechen den Prüfungen in
 * den Datenbank-Funktionen forum_* (dort sind sie die letzte Instanz).
 */

export const FORUM_CATEGORIES = ['tipp', 'frage', 'idee'] as const
export type ForumCategory = (typeof FORUM_CATEGORIES)[number]

export const FORUM_CATEGORY_LABEL: Record<ForumCategory, string> = {
  tipp: 'Tipp',
  frage: 'Frage',
  idee: 'Idee',
}

export const FORUM_REPORT_REASONS = ['unpassend', 'falsch', 'urheberrecht', 'sonstiges'] as const
export type ForumReportReason = (typeof FORUM_REPORT_REASONS)[number]

export const FORUM_REPORT_REASON_LABEL: Record<ForumReportReason, string> = {
  unpassend: 'Unpassend',
  falsch: 'Falsch oder irreführend',
  urheberrecht: 'Urheberrecht',
  sonstiges: 'Sonstiges',
}

export const FORUM_SORTS = ['activity', 'newest', 'helpful'] as const
export type ForumSort = (typeof FORUM_SORTS)[number]

export const FORUM_SORT_LABEL: Record<ForumSort, string> = {
  activity: 'Neueste Aktivität',
  newest: 'Neueste Beiträge',
  helpful: 'Hilfreichste',
}

export const FORUM_PAGE_SIZE = 20

export const FORUM_LIMITS = {
  titleMin: 5,
  titleMax: 120,
  bodyMin: 10,
  bodyMax: 5000,
  replyMin: 1,
  replyMax: 3000,
  noteMax: 300,
} as const

const uuid = z.string().uuid('Ungültige Kennung.')

export const postInputSchema = z.object({
  category: z.enum(FORUM_CATEGORIES, { error: 'Bitte eine Kategorie wählen.' }),
  title: z
    .string()
    .trim()
    .min(FORUM_LIMITS.titleMin, `Der Titel braucht mindestens ${FORUM_LIMITS.titleMin} Zeichen.`)
    .max(FORUM_LIMITS.titleMax, `Der Titel darf höchstens ${FORUM_LIMITS.titleMax} Zeichen lang sein.`),
  body: z
    .string()
    .trim()
    .min(FORUM_LIMITS.bodyMin, `Der Text braucht mindestens ${FORUM_LIMITS.bodyMin} Zeichen.`)
    .max(FORUM_LIMITS.bodyMax, `Der Text darf höchstens ${FORUM_LIMITS.bodyMax} Zeichen lang sein.`),
  department_id: uuid.nullable().optional(),
  subject_id: uuid.nullable().optional(),
})
export type PostInput = z.infer<typeof postInputSchema>

export const replyInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(FORUM_LIMITS.replyMin, 'Bitte schreibe etwas.')
    .max(FORUM_LIMITS.replyMax, `Die Antwort darf höchstens ${FORUM_LIMITS.replyMax} Zeichen lang sein.`),
})

const flag = z
  .enum(['1', 'true', '0', 'false'])
  .optional()
  .transform((v) => v === '1' || v === 'true')

/** Filter der Übersicht (stehen in der URL, daher alles Text). */
export const listQuerySchema = z.object({
  category: z.enum(FORUM_CATEGORIES).optional(),
  department_id: uuid.optional(),
  subject_id: uuid.optional(),
  only_open: flag,
  mine: flag,
  q: z.string().trim().max(100).optional(),
  sort: z.enum(FORUM_SORTS).default('activity'),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
})

export const targetSchema = z.object({
  target_type: z.enum(['post', 'reply']),
  target_id: uuid,
})

export const reportInputSchema = targetSchema.extend({
  reason: z.enum(FORUM_REPORT_REASONS, { error: 'Bitte einen Grund wählen.' }),
  note: z
    .string()
    .trim()
    .max(FORUM_LIMITS.noteMax, `Der Hinweis darf höchstens ${FORUM_LIMITS.noteMax} Zeichen lang sein.`)
    .nullable()
    .optional(),
})

export const hideInputSchema = targetSchema.extend({ hidden: z.boolean() })

export const resolveInputSchema = targetSchema.extend({ action: z.enum(['hide', 'dismiss']) })

export const solutionInputSchema = z.object({ reply_id: uuid.nullable() })

/**
 * HTTP-Status zu den Fehlercodes der Datenbank-Funktionen (SQLSTATE FRM0x).
 * `null` = kein Forum-Fehler → die Route antwortet allgemein mit 500.
 */
export function forumErrorStatus(code: string | undefined | null): number | null {
  switch (code) {
    case 'FRM01':
      return 429
    case 'FRM02':
      return 404
    case 'FRM03':
      return 403
    case 'FRM04':
      return 400
    case 'FRM05':
      return 409
    default:
      return null
  }
}

/** Zähler der Seitenleiste; „9+“ ab 10, nichts bei 0. */
export function formatForumBadge(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null
  return count >= 10 ? '9+' : String(count)
}

export type ForumNavCounts = { new_posts: number; new_replies: number; open_reports: number }
