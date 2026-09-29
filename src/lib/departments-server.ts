import { cache } from 'react'
import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEPARTMENT_COLUMNS, departmentForHost, mapDepartment, pickDepartment, toBranding, type Department } from '@/lib/departments'
import { fetchExamParts, type ExamPart } from '@/lib/exam-parts'
import type { DepartmentContextValue } from '@/components/department-provider'

/**
 * Bereiche und Prüfungsaufbau ändern sich fast nie — sie werden serverseitig
 * zwischengespeichert, damit nicht jeder Seitenaufruf (auch die Login-Seite)
 * die Datenbank fragt (PROJ-22 QA BUG-1). Änderungen per SQL werden nach
 * spätestens CACHE_SECONDS sichtbar; eine Admin-Oberfläche (PROJ-24) ruft
 * revalidateTag(DEPARTMENTS_CACHE_TAG / EXAM_PARTS_CACHE_TAG) auf.
 */
const CACHE_SECONDS = 300
export const DEPARTMENTS_CACHE_TAG = 'departments'
export const EXAM_PARTS_CACHE_TAG = 'exam-parts'
export const SUBJECTS_CACHE_TAG = 'department-subjects'

/** Alle aktiven Bereiche, sortiert — ohne Nutzer-Cookies (öffentlich lesbar) */
const loadActiveDepartments = unstable_cache(
  async (): Promise<Department[]> => {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { data, error } = await supabase
      .from('departments')
      .select(DEPARTMENT_COLUMNS)
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .limit(50)
    if (error) throw new Error(`Bereiche konnten nicht geladen werden: ${error.message}`)
    return (data ?? []).map((row) => mapDepartment(row as Parameters<typeof mapDepartment>[0]))
  },
  ['active-departments-v1'],
  { tags: [DEPARTMENTS_CACHE_TAG], revalidate: CACHE_SECONDS },
)

/**
 * Prüfungsaufbau eines Bereichs. Service-Client, weil der Zwischenspeicher
 * ohne Nutzer-Cookies läuft; ausgeliefert wird er nur an eingeloggte Nutzer.
 */
const loadExamParts = unstable_cache(
  async (departmentId: string): Promise<ExamPart[]> => fetchExamParts(createServiceClient(), departmentId),
  ['exam-parts-v1'],
  { tags: [EXAM_PARTS_CACHE_TAG], revalidate: CACHE_SECONDS },
)

/**
 * IDs aller Fächer eines Bereichs (auch inaktive) — Grundlage jedes
 * Lernweg-Filters (PROJ-23). Service-Client, weil ohne Nutzer-Cookies.
 */
const loadDepartmentSubjectIds = unstable_cache(
  async (departmentId: string): Promise<string[]> => {
    const { data, error } = await createServiceClient()
      .from('subjects')
      .select('id')
      .eq('department_id', departmentId)
      .limit(200)
    if (error) throw new Error(`Fächer konnten nicht geladen werden: ${error.message}`)
    return (data ?? []).map((s: { id: string }) => s.id)
  },
  ['department-subject-ids-v1'],
  { tags: [SUBJECTS_CACHE_TAG], revalidate: CACHE_SECONDS },
)

async function loadDepartmentsSafe(): Promise<Department[]> {
  try {
    return await loadActiveDepartments()
  } catch (err) {
    console.error('[departments]', err)
    return []
  }
}

/** Adresse der aktuellen Anfrage */
export async function requestHost(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-host') ?? h.get('host')
}

/**
 * Ordnet ein Profil ohne Bereich dem Bereich der Adresse zu (unbekannte
 * Adresse → erster Bereich) und erzeugt das Pseudonym mit dessen Nomen neu.
 * Gespeichert wird nur, wenn der Bereich noch leer ist — wiederholbar, ohne
 * Wettlauf, und eine spätere Anmeldung über eine andere Adresse ändert nichts.
 * Läuft ausschließlich serverseitig; der Browser liefert keinen Bereich mit.
 *
 * @returns der Bereich, den das Profil danach hat (oder null bei Fehler)
 */
export async function assignDepartmentIfMissing(userId: string, host: string | null | undefined): Promise<string | null> {
  const departments = await loadDepartmentsSafe()
  const target = departmentForHost(departments, host) ?? departments[0]
  if (!target) return null

  const service = createServiceClient()
  const { data: updated, error } = await service
    .from('profiles')
    .update({ department_id: target.id })
    .eq('id', userId)
    .is('department_id', null)
    .select('id')
  if (error) {
    console.error('[assignDepartmentIfMissing]', error.message)
    return null
  }

  if (!updated || updated.length === 0) {
    // Schon zugeordnet (z. B. paralleler Aufruf) — den gespeicherten Bereich nehmen
    const { data: profile } = await service.from('profiles').select('department_id').eq('id', userId).maybeSingle()
    return (profile as { department_id: string | null } | null)?.department_id ?? null
  }

  // Pseudonym passend zum Bereich neu erzeugen
  const { data: pseudonym, error: pseudoErr } = await service.rpc('generate_unique_pseudonym', { p_department_id: target.id })
  if (!pseudoErr && typeof pseudonym === 'string') {
    await service.from('profiles').update({ pseudonym }).eq('id', userId)
  } else if (pseudoErr) {
    console.error('[assignDepartmentIfMissing] pseudonym', pseudoErr.message)
  }
  return target.id
}

/**
 * Bereich eines eingeloggten Nutzers für Schnittstellen (API-Routen): Profil,
 * sonst Rückfall-Bereich. Nutzt die zwischengespeicherte Bereichsliste.
 */
export async function getDepartmentOfUser(supabase: SupabaseClient, userId: string): Promise<Department | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('department_id')
    .eq('id', userId)
    .maybeSingle()
  const departmentId = (profile as { department_id: string | null } | null)?.department_id ?? null
  return pickDepartment(await loadDepartmentsSafe(), { departmentId, host: null })
}

/** Fächer-IDs eines Bereichs (zwischengespeichert); leer bei Fehler */
export async function getDepartmentSubjectIds(departmentId: string): Promise<string[]> {
  try {
    return await loadDepartmentSubjectIds(departmentId)
  } catch (err) {
    console.error('[getDepartmentSubjectIds]', err)
    return []
  }
}

interface RequestContext {
  userId: string | null
  department: Department | null
  /** Gesetzt, wenn ein eingeloggter Nutzer auf der Adresse eines ANDEREN Bereichs ist */
  correctAddress: { appName: string; domain: string } | null
}

/**
 * Nutzer und Bereich des aktuellen Seitenaufrufs — einmal pro Anfrage.
 * Nach dem Login zählt das Profil, davor die aufgerufene Adresse, sonst der
 * Rückfall-Bereich. Einzige Datenbankabfrage: der Bereich im eigenen Profil.
 */
const getRequestContext = cache(async (): Promise<RequestContext> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let departmentId: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('department_id')
      .eq('id', user.id)
      .maybeSingle()
    departmentId = (profile as { department_id: string | null } | null)?.department_id ?? null
  }

  const host = await requestHost()

  // Neues Profil ohne Bereich → jetzt anhand der Adresse zuordnen (PROJ-23)
  if (user && !departmentId) {
    departmentId = await assignDepartmentIfMissing(user.id, host)
  }

  const departments = await loadDepartmentsSafe()
  const department = pickDepartment(departments, {
    departmentId,
    // Die Adresse zählt nur vor dem Login
    host: user ? null : host,
  })

  // Hinweis „Deine App heißt …", wenn die Adresse zu einem anderen Bereich gehört
  const hostDepartment = departmentForHost(departments, host)
  const correctAddress =
    user && department?.domain && hostDepartment && hostDepartment.id !== department.id
      ? { appName: department.appName, domain: department.domain }
      : null

  return { userId: user?.id ?? null, department, correctAddress }
})

/** Bereich des aktuellen Seitenaufrufs (Metadaten, Serverseiten) */
export async function getCurrentDepartment(): Promise<Department | null> {
  return (await getRequestContext()).department
}

/** Prüfungsaufbau des aktuellen Bereichs; leer vor dem Login oder bei Fehlern */
export const getCurrentExamParts = cache(async (): Promise<ExamPart[]> => {
  const { userId, department } = await getRequestContext()
  if (!userId || !department) return []
  try {
    return await loadExamParts(department.id)
  } catch (err) {
    console.error('[getCurrentExamParts]', err)
    return []
  }
})

/** Fächer-IDs des Bereichs im aktuellen Seitenaufruf */
export async function getCurrentDepartmentSubjectIds(): Promise<string[]> {
  const department = await getCurrentDepartment()
  return department ? getDepartmentSubjectIds(department.id) : []
}

/** Alles, was das Grundlayout an die Bildschirme im Browser weitergibt */
export async function getDepartmentContextValue(): Promise<DepartmentContextValue | null> {
  const { department, correctAddress } = await getRequestContext()
  if (!department) return null
  return {
    department: toBranding(department),
    examParts: await getCurrentExamParts(),
    correctAddress,
  }
}
