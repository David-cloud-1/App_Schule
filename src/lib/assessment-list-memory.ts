// PROJ-39: Merkt sich den Filterzustand der Nachweis-Liste, damit der Zurück-Pfeil der
// Detailseite wieder dort landet, wo man herkam. Nur pro Browser-Tab (sessionStorage);
// ohne Speicher (privates Fenster) fällt es auf die Liste mit Standardfiltern zurück.

const KEY = 'nachweise-liste-filter'
export const LIST_PATH = '/admin/leistungsnachweise'
const ALLOWED = ['sj', 'klasse', 'fach', 'status']

/** Filter-Query der Liste ablegen; fremde Parameter (z. B. createFromSet) werden nicht mitgenommen */
export function saveListQuery(search: string): void {
  try {
    const source = new URLSearchParams(search)
    const kept = new URLSearchParams()
    for (const key of ALLOWED) {
      const value = source.get(key)
      if (value) kept.set(key, value)
    }
    sessionStorage.setItem(KEY, kept.toString())
  } catch {
    // Speicher nicht verfügbar — kein Problem, nur ohne Merkfunktion
  }
}

/** Adresse der Liste mit den zuletzt gemerkten Filtern */
export function listHref(): string {
  try {
    const stored = sessionStorage.getItem(KEY)
    if (stored) {
      // Beim Lesen erneut filtern: nur bekannte Parameter übernehmen
      const params = new URLSearchParams(stored)
      const kept = new URLSearchParams()
      for (const key of ALLOWED) {
        const value = params.get(key)
        if (value) kept.set(key, value)
      }
      const qs = kept.toString()
      if (qs) return `${LIST_PATH}?${qs}`
    }
  } catch {
    // siehe oben
  }
  return LIST_PATH
}
