import type { AnalysisLight, AnalysisReason } from '@/lib/assessment-analysis'

/** Eine Zeile im Prüfbericht für den Entwurf einer Kopie (PROJ-79) */
export interface CopyReviewRow {
  id: string
  position: number
  /** null = Platzhalter „Frage nicht mehr verfügbar“ */
  text: string | null
  topic: string | null
  available: boolean
  blocked: boolean
  /** Ampel aus dem Original-Durchlauf; 'none' = keine Aussage */
  light: AnalysisLight
  reasons: AnalysisReason[]
  correctRate: number | null
  discrimination: number | null
  /** Frage wurde seit dem Original-Durchlauf geändert (PROJ-47) */
  changed: boolean
}
