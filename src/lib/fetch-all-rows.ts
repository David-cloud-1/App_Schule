import type { PostgrestError } from '@supabase/supabase-js'

export const PAGE_SIZE = 1000

type PageResult<T> = { data: T[] | null; error: PostgrestError | null }

export type FetchAllResult<T> = { rows: T[]; error: PostgrestError | null }

/**
 * Fetch every row of a query, paginating past PostgREST's default 1000-row cap.
 *
 * `buildPage` must produce a query with a stable sort order (e.g. `.order('id')`),
 * otherwise rows can be duplicated or skipped between pages.
 *
 * On a failing page the rows collected so far are returned alongside the error —
 * callers decide whether to fail loudly or render with partial data.
 */
export async function fetchAllRows<T>(
  label: string,
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<FetchAllResult<T>> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildPage(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error(`[fetchAllRows] ${label} page at ${from}:`, error)
      return { rows, error }
    }
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return { rows, error: null }
}
