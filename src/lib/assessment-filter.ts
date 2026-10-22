// PROJ-39: Filterlogik der Leistungsnachweis-Liste (rein, ohne React/Netz)

export const FILTER_ALL = 'alle'
export const FILTER_NONE = 'none'

export type CategorizedAssessment = {
  title: string
  accessCode: string
  status: 'draft' | 'open' | 'closed'
  schoolYear: string
  className: string | null
  subjectId: string | null
  subjectName: string | null
  createdAt: string
}

export type AssessmentFilters = {
  /** Schuljahr, FILTER_ALL für alle */
  schoolYear: string
  /** Klasse, FILTER_ALL für alle, FILTER_NONE für „Ohne Zuordnung“ */
  className: string
  /** Fach-ID, FILTER_ALL für alle, FILTER_NONE für „Ohne Zuordnung“ */
  subjectId: string
  /** Status, FILTER_ALL für alle */
  status: string
  /** Suche in Titel und Code */
  query: string
}

export function defaultFilters(currentSchoolYear: string): AssessmentFilters {
  return { schoolYear: currentSchoolYear, className: FILTER_ALL, subjectId: FILTER_ALL, status: FILTER_ALL, query: '' }
}

const STATUSES = ['draft', 'open', 'closed']

/** Filter aus der Adresszeile lesen; fehlende oder kaputte Werte fallen auf den Standard zurück */
export function filtersFromParams(params: URLSearchParams, currentSchoolYear: string): AssessmentFilters {
  const base = defaultFilters(currentSchoolYear)
  const status = params.get('status')
  return {
    schoolYear: params.get('sj') || base.schoolYear,
    className: params.get('klasse') || base.className,
    subjectId: params.get('fach') || base.subjectId,
    status: status && STATUSES.includes(status) ? status : base.status,
    query: base.query,
  }
}

/** Nur vom Standard abweichende Werte in die Adresszeile schreiben (Suche bleibt lokal) */
export function filtersToParams(filters: AssessmentFilters, currentSchoolYear: string, into: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(into)
  for (const key of ['sj', 'klasse', 'fach', 'status']) params.delete(key)
  if (filters.schoolYear !== currentSchoolYear) params.set('sj', filters.schoolYear)
  if (filters.className !== FILTER_ALL) params.set('klasse', filters.className)
  if (filters.subjectId !== FILTER_ALL) params.set('fach', filters.subjectId)
  if (filters.status !== FILTER_ALL) params.set('status', filters.status)
  return params
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9äöüß]/g, '')
}

export function filterAssessments<T extends CategorizedAssessment>(items: T[], filters: AssessmentFilters): T[] {
  const query = normalizeSearch(filters.query)
  return items
    .filter((a) => {
      if (filters.schoolYear !== FILTER_ALL && a.schoolYear !== filters.schoolYear) return false
      if (filters.className === FILTER_NONE ? a.className !== null : filters.className !== FILTER_ALL && a.className !== filters.className) return false
      if (filters.subjectId === FILTER_NONE ? a.subjectId !== null : filters.subjectId !== FILTER_ALL && a.subjectId !== filters.subjectId) return false
      if (filters.status !== FILTER_ALL && a.status !== filters.status) return false
      if (query && !normalizeSearch(a.title).includes(query) && !normalizeSearch(a.accessCode).includes(query)) return false
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Vorkommende Schuljahre plus das aktuelle, neueste zuerst */
export function schoolYearOptions(used: string[], currentSchoolYear: string): string[] {
  return Array.from(new Set([...used, currentSchoolYear])).sort().reverse()
}

/** Schuljahre zum Auswählen beim Anlegen/Ändern: vorkommende plus Vorjahr, aktuelles und nächstes */
export function schoolYearChoices(used: string[], currentSchoolYear: string): string[] {
  const start = Number(currentSchoolYear.slice(0, 4))
  const around = [start - 1, start, start + 1].map((y) => `${y}/${String((y + 1) % 100).padStart(2, '0')}`)
  return Array.from(new Set([...used, ...around])).sort().reverse()
}

export function classOptions(items: { className: string | null }[]): string[] {
  const names = new Set<string>()
  for (const a of items) if (a.className) names.add(a.className)
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
}

export function subjectOptions(items: { subjectId: string | null; subjectName: string | null }[]): { id: string; name: string }[] {
  const byId = new Map<string, string>()
  for (const a of items) if (a.subjectId && a.subjectName) byId.set(a.subjectId, a.subjectName)
  return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'de'))
}
