import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Einfacher Supabase-Ersatz für Tests: jedes `.from(tabelle)` liefert eine
 * Kette, die alle Aufrufe mitschreibt und beim `await` das Ergebnis des
 * Resolvers für genau diese Abfrage liefert. So hängen Tests nicht an der
 * Reihenfolge oder Anzahl der Abfragen einer Route.
 */
export type ChainCall = { method: string; args: unknown[] }
export type ChainResult = { data?: unknown; error?: unknown; count?: number | null }
export type ChainResolver = (table: string, calls: ChainCall[]) => ChainResult

const CHAIN_METHODS = [
  'select', 'eq', 'neq', 'in', 'is', 'not', 'or', 'ilike', 'gte', 'lte', 'gt', 'lt',
  'order', 'range', 'limit', 'maybeSingle', 'single', 'filter', 'match',
  'insert', 'update', 'upsert', 'delete',
]

export function chainMock(resolve: ChainResolver, extra: Record<string, unknown> = {}) {
  const writes: { table: string; method: string; payload: unknown }[] = []
  const from = vi.fn((table: string) => {
    const calls: ChainCall[] = []
    const builder: Record<string, unknown> = {}
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args })
        if (['insert', 'update', 'upsert', 'delete'].includes(method)) {
          writes.push({ table, method, payload: args[0] })
        }
        return builder
      }
    }
    builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null, ...resolve(table, calls) }).then(onFulfilled, onRejected)
    return builder
  })
  return { client: { from, ...extra } as unknown as SupabaseClient, from, writes }
}

/** Erster Wert, der mit `.eq(spalte, wert)` gefiltert wurde */
export function eqValue(calls: ChainCall[], column: string): unknown {
  return calls.find((c) => c.method === 'eq' && c.args[0] === column)?.args[1]
}

export function selectArg(calls: ChainCall[]): string {
  return String(calls.find((c) => c.method === 'select')?.args[0] ?? '')
}

export function hasCall(calls: ChainCall[], method: string): boolean {
  return calls.some((c) => c.method === method)
}
