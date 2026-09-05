/**
 * Gemeinsame Basis für die Qualitäts-Scripts.
 * Läuft direkt mit Node 24 (`node scripts/quality/audit.ts`) — kein Build nötig.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuestionInput } from '../../src/lib/question-quality.ts'

// Supabase-Zugang und Argument-Helfer liegen zentral in scripts/lib/db.ts,
// damit auch das Engagement-Audit sie nutzen kann, ohne von der
// Fragen-Qualität abzuhängen.
export { db, arg, has } from '../lib/db.ts'

export interface LoadedQuestion extends QuestionInput {
  id: string
  difficulty: string | null
  class_level: number | null
  option_ids: string[]
}

/**
 * Lädt alle aktiven Fragen samt Optionen — seitenweise, weil PostgREST
 * standardmäßig bei 1000 Zeilen abschneidet und ein stiller Cap hier
 * jede Kennzahl verfälschen würde.
 */
export async function loadActiveQuestions(supabase: SupabaseClient): Promise<LoadedQuestion[]> {
  const PAGE = 500
  const questions: LoadedQuestion[] = []

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, explanation, difficulty, class_level')
      .eq('is_active', true)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`questions: ${error.message}`)
    if (!data || data.length === 0) break

    const ids = data.map((q) => q.id as string)
    const options = await loadOptions(supabase, ids)

    for (const q of data) {
      const opts = options.get(q.id as string) ?? []
      questions.push({
        id: q.id as string,
        question_text: q.question_text as string,
        explanation: (q.explanation as string | null) ?? null,
        difficulty: (q.difficulty as string | null) ?? null,
        class_level: (q.class_level as number | null) ?? null,
        options: opts.map((o) => o.option_text),
        option_ids: opts.map((o) => o.id),
        correct_index: opts.findIndex((o) => o.is_correct),
      })
    }
    if (data.length < PAGE) break
  }
  return questions
}

interface OptionRow {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  display_order: number
}

async function loadOptions(
  supabase: SupabaseClient,
  questionIds: string[]
): Promise<Map<string, OptionRow[]>> {
  const map = new Map<string, OptionRow[]>()
  const CHUNK = 100
  for (let i = 0; i < questionIds.length; i += CHUNK) {
    const slice = questionIds.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('answer_options')
      .select('id, question_id, option_text, is_correct, display_order')
      .in('question_id', slice)
      .order('display_order')
    if (error) throw new Error(`answer_options: ${error.message}`)
    for (const row of (data ?? []) as OptionRow[]) {
      const list = map.get(row.question_id) ?? []
      list.push(row)
      map.set(row.question_id, list)
    }
  }
  return map
}

/** Bereits bearbeitete Fragen eines Durchlaufs. */
export async function loadDone(supabase: SupabaseClient, runKey: string): Promise<Set<string>> {
  const done = new Set<string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('quality_fix_progress')
      .select('question_id')
      .eq('run_key', runKey)
      .range(from, from + PAGE - 1)
    if (error) {
      if (error.message.includes('does not exist')) return done
      throw new Error(`quality_fix_progress: ${error.message}`)
    }
    if (!data || data.length === 0) break
    data.forEach((r) => done.add(r.question_id as string))
    if (data.length < PAGE) break
  }
  return done
}

