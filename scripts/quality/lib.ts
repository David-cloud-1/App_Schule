/**
 * Gemeinsame Basis für die Qualitäts-Scripts.
 * Läuft direkt mit Node 24 (`node scripts/quality/audit.ts`) — kein Build nötig.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { QuestionInput } from '../../src/lib/question-quality.ts'

const ROOT = path.resolve(import.meta.dirname, '../..')

/** Liest .env.local, ohne eine Abhängigkeit wie dotenv einzuführen. */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  for (const file of ['.env.local', '.env']) {
    const p = path.join(ROOT, file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m) continue
      const value = m[2].trim().replace(/^["']|["']$/g, '')
      if (!env[m[1]]) env[m[1]] = value
    }
  }
  return env
}

export function db(): SupabaseClient {
  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen in .env.local stehen.'
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

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

export function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return fallback
  const next = process.argv[i + 1]
  return next && !next.startsWith('--') ? next : 'true'
}

export const has = (name: string) => process.argv.includes(`--${name}`)
