import { z } from 'zod'
import { findeWerkzeug } from '@/lib/werkzeugkiste'

/**
 * PROJ-87: gemerktes Angebot des Assistenten „Schritt für Schritt“. Je
 * Lehrkraft und Werkzeug wird nur gespeichert, ob das Angebot mit „Ja, bitte“
 * oder „Nein, danke“ beantwortet wurde — nie ein Inhalt der Lehrkraft.
 */

export const HILFE_ANGEBOT_TABELLE = 'werkzeug_hilfe_angebot'

export type HilfeAngebotAntwort = 'ja' | 'nein'

const werkzeugSchema = z
  .string()
  .min(1)
  .max(40)
  .refine((id) => findeWerkzeug(id) !== undefined, 'Unbekanntes Werkzeug.')

export const hilfeAngebotAbfrageSchema = z.object({ werkzeug: werkzeugSchema })

export const hilfeAngebotSpeichernSchema = z.object({
  werkzeug: werkzeugSchema,
  antwort: z.enum(['ja', 'nein']),
})

/** Antwort der Schnittstelle: `antwort` ist leer, solange das Angebot offen ist */
export interface HilfeAngebot {
  werkzeug: string
  beantwortet: boolean
  antwort: HilfeAngebotAntwort | null
}
