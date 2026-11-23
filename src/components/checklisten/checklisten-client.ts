import type { Durchlauf, FruehererDurchlauf } from '@/lib/checklisten/katalog'

/** Aufrufe der Checklisten-Schnittstellen (PROJ-122). Fehler tragen einen verständlichen Satz. */

export class ChecklistenFehler extends Error {}

const KEINE_VERBINDUNG = 'Keine Verbindung. Das wurde nicht gespeichert.'
const ALLGEMEIN = 'Das hat nicht geklappt. Bitte versuche es erneut.'

async function sende<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  } catch {
    throw new ChecklistenFehler(KEINE_VERBINDUNG)
  }
  if (!res.ok) {
    let meldung = ALLGEMEIN
    try {
      const body = (await res.json()) as { error?: unknown }
      if (typeof body.error === 'string' && body.error) meldung = body.error
    } catch {
      /* keine lesbare Antwort: allgemeiner Satz */
    }
    throw new ChecklistenFehler(meldung)
  }
  return (await res.json()) as T
}

export const ladeOffene = () => sende<{ offen: Durchlauf[] }>('/api/admin/checklisten', { cache: 'no-store' })

export const ladeListe = (id: string) =>
  sende<{ offen: Durchlauf | null; fruehere: FruehererDurchlauf[] }>(`/api/admin/checklisten/${id}`, {
    cache: 'no-store',
  })

export const setzeHaken = (id: string, schritt: string, erledigt: boolean, variante: string | null) =>
  sende<{ durchlaufId: string }>(`/api/admin/checklisten/${id}/haken`, {
    method: 'PUT',
    body: JSON.stringify({ schritt, erledigt, variante }),
  })

export const setzeVariante = (id: string, variante: string | null) =>
  sende<{ durchlaufId: string }>(`/api/admin/checklisten/${id}/variante`, {
    method: 'PUT',
    body: JSON.stringify({ variante }),
  })

export const startNeu = (id: string) =>
  sende<{ durchlaufId: string }>(`/api/admin/checklisten/${id}/neu`, { method: 'POST', body: '{}' })
