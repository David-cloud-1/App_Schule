import { cache } from 'react'
import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { DEPARTMENT_COLUMNS, mapDepartment, pickDepartment, toBranding, type Department } from '@/lib/departments'
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

interface RequestContext {
  userId: string | null
  department: Department | null
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

  let departments: Department[] = []
  try {
    departments = await loadActiveDepartments()
  } catch (err) {
    console.error('[departments]', err)
  }

  const h = await headers()
  return {
    userId: user?.id ?? null,
    department: pickDepartment(departments, {
      departmentId,
      // Die Adresse zählt nur vor dem Login
      host: user ? null : h.get('x-forwarded-host') ?? h.get('host'),
    }),
  }
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

/** Alles, was das Grundlayout an die Bildschirme im Browser weitergibt */
export async function getDepartmentContextValue(): Promise<DepartmentContextValue | null> {
  const department = await getCurrentDepartment()
  if (!department) return null
  return { department: toBranding(department), examParts: await getCurrentExamParts() }
}
