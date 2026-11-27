/**
 * PROJ-133: Der Pool eines Bereichs (alle zulässigen Fragen samt Lösungsquoten) ist teuer zu laden und
 * ändert sich kaum, während jemand tippt. Er wird je Person und Bereich kurz gemerkt, damit Tippen und
 * „Weitere 25 anzeigen“ nicht jedes Mal die ganze Datenbankarbeit auslösen. Nach dem Ablauf (und bei einer
 * neuen Serverinstanz) wird frisch geladen. Nur für die Fragen-Suche gedacht, nicht für das Anlegen.
 */
import { loadCandidates } from '@/lib/assessment-candidates'

export const POOL_TTL_MS = 30_000
export const POOL_MAX_ENTRIES = 50

type Pool = Awaited<ReturnType<typeof loadCandidates>>['all']
const cache = new Map<string, { at: number; all: Pool }>()

export function clearPoolCache() {
  cache.clear()
}

export async function cachedPool(
  supabase: Parameters<typeof loadCandidates>[0],
  userId: string,
  departmentId: string,
  now: () => number = Date.now,
): Promise<Pool> {
  const key = `${userId}:${departmentId}`
  const hit = cache.get(key)
  if (hit && now() - hit.at < POOL_TTL_MS) return hit.all
  const { all } = await loadCandidates(supabase, userId, departmentId)
  if (cache.size >= POOL_MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
  cache.set(key, { at: now(), all })
  return all
}
