/**
 * Gemeinsamer Supabase-Zugang für alle Wartungs-Scripts.
 * Läuft direkt mit Node 24 — kein Build nötig.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

/**
 * Lädt eine Tabelle vollständig. PostgREST schneidet ohne Bereichsangabe bei
 * 1000 Zeilen ab — ein stiller Cap würde hier jede Quote verfälschen.
 */
export async function loadAll<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string
): Promise<T[]> {
  const PAGE = 1000
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...(data as T[]))
    if (data.length < PAGE) break
  }
  return rows
}

export function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return fallback
  const next = process.argv[i + 1]
  return next && !next.startsWith('--') ? next : fallback
}

export const has = (name: string) => process.argv.includes(`--${name}`)
