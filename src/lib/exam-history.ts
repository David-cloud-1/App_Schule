import type { SupabaseClient } from '@supabase/supabase-js'

/** Abgeschlossene oder abgebrochene Prüfungs-Sitzung eines Azubis */
export type ExamHistorySession = {
  id: string
  parts_selected: number[]
  started_at: string
  ended_at: string | null
  status: 'completed' | 'aborted'
  results_json: {
    parts: Record<string, { score: number; passed: boolean; questions: unknown[] }>
    // Nur gesetzt für Leistungsnachweise (PROJ-21)
    assessment?: { title: string; released: boolean; grade?: number }
  } | null
}

/**
 * Eigene Sitzungen, getrennt nach Art (PROJ-43): Übungs-Simulationen oder
 * benotete Leistungsnachweise. Neueste zuerst.
 */
export async function fetchExamHistory(
  supabase: SupabaseClient,
  userId: string,
  kind: 'simulation' | 'assessment',
): Promise<ExamHistorySession[]> {
  let query = supabase
    .from('exam_sessions')
    .select('id, parts_selected, started_at, ended_at, status, results_json')
    .eq('user_id', userId)
    .neq('status', 'in_progress')
  query = kind === 'assessment' ? query.not('assessment_id', 'is', null) : query.is('assessment_id', null)
  const { data, error } = await query.order('started_at', { ascending: false }).limit(50)
  if (error) console.error('[fetchExamHistory]', error)
  return (data ?? []) as ExamHistorySession[]
}
