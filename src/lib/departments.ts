import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fachbereich (PROJ-22) — alles, was einen Ausbildungsberuf in der App
 * ausmacht: Name, Icon, Münz-/Hof-Name, Prompt-Rolle, Zielgruppe,
 * Klassenstufen, Pseudonym-Nomen. Einzige Quelle ist die Tabelle
 * `departments`; im Code steht kein Bereich fest.
 */
export interface Department {
  id: string
  code: string
  slug: string
  domain: string | null
  name: string
  appName: string
  tagline: string
  metaTitle: string
  metaDescription: string
  iconName: string
  currencyName: string
  hofName: string
  /** Kurzform, z. B. für "Mein Hof" und "Hof-Items" */
  hofShortName: string
  promptRole: string
  targetGroup: string
  promptNotes: string | null
  classLevels: number[]
  pseudonymNouns: string[]
}

/**
 * Was Bildschirme im Browser brauchen — ohne Prompt-Texte und Wortlisten,
 * damit das Grundlayout nicht unnötig viel an jede Seite mitschickt.
 */
export type DepartmentBranding = Pick<
  Department,
  'id' | 'code' | 'slug' | 'name' | 'appName' | 'tagline' | 'iconName' | 'currencyName' | 'hofName' | 'hofShortName' | 'classLevels'
>

export const DEPARTMENT_COLUMNS =
  'id, code, slug, domain, name, app_name, tagline, meta_title, meta_description, icon_name, currency_name, hof_name, hof_short_name, prompt_role, target_group, prompt_notes, class_levels, pseudonym_nouns'

interface DepartmentRow {
  id: string
  code: string
  slug: string
  domain: string | null
  name: string
  app_name: string
  tagline: string
  meta_title: string
  meta_description: string
  icon_name: string
  currency_name: string
  hof_name: string
  hof_short_name?: string | null
  prompt_role: string
  target_group: string
  prompt_notes: string | null
  class_levels: number[] | null
  pseudonym_nouns: string[] | null
}

export function mapDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    code: row.code,
    slug: row.slug,
    domain: row.domain,
    name: row.name,
    appName: row.app_name,
    tagline: row.tagline,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    iconName: row.icon_name,
    currencyName: row.currency_name,
    hofName: row.hof_name,
    hofShortName: row.hof_short_name ?? row.hof_name,
    promptRole: row.prompt_role,
    targetGroup: row.target_group,
    promptNotes: row.prompt_notes,
    classLevels: row.class_levels ?? [],
    pseudonymNouns: row.pseudonym_nouns ?? [],
  }
}

export function toBranding(d: Department): DepartmentBranding {
  return {
    id: d.id,
    code: d.code,
    slug: d.slug,
    name: d.name,
    appName: d.appName,
    tagline: d.tagline,
    iconName: d.iconName,
    currencyName: d.currencyName,
    hofName: d.hofName,
    hofShortName: d.hofShortName,
    classLevels: d.classLevels,
  }
}

/** `Beispiel.Vercel.app:443` → `beispiel.vercel.app`; leer → null. */
export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null
  const first = host.split(',')[0].trim().toLowerCase()
  const withoutPort = first.replace(/:\d+$/, '')
  return withoutPort || null
}

type AnyClient = SupabaseClient

export async function getDepartmentById(supabase: AnyClient, id: string): Promise<Department | null> {
  const { data, error } = await supabase
    .from('departments')
    .select(DEPARTMENT_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('[departments] by id:', error.message)
    return null
  }
  return data ? mapDepartment(data as DepartmentRow) : null
}

export async function getDepartmentByHost(supabase: AnyClient, host: string | null | undefined): Promise<Department | null> {
  const domain = normalizeHost(host)
  if (!domain) return null
  const { data, error } = await supabase
    .from('departments')
    .select(DEPARTMENT_COLUMNS)
    .eq('domain', domain)
    .eq('is_active', true)
    .maybeSingle()
  if (error) {
    console.error('[departments] by host:', error.message)
    return null
  }
  return data ? mapDepartment(data as DepartmentRow) : null
}

/**
 * Rückfall für unbekannte Adressen (Vorschau-URLs, localhost): der erste
 * aktive Bereich nach Sortierung — heute Spedition.
 */
export async function getFallbackDepartment(supabase: AnyClient): Promise<Department | null> {
  const { data, error } = await supabase
    .from('departments')
    .select(DEPARTMENT_COLUMNS)
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at')
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[departments] fallback:', error.message)
    return null
  }
  return data ? mapDepartment(data as DepartmentRow) : null
}

/** Bereich aus dem Profil; ohne Zuordnung der Rückfall-Bereich. */
export async function getDepartmentForUser(supabase: AnyClient, userId: string): Promise<Department | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('department_id')
    .eq('id', userId)
    .maybeSingle()
  const departmentId = (profile as { department_id: string | null } | null)?.department_id
  if (departmentId) {
    const department = await getDepartmentById(supabase, departmentId)
    if (department) return department
  }
  return getFallbackDepartment(supabase)
}

/** Bereich, dem diese Adresse gehört — oder null (Vorschau, localhost, unbekannt) */
export function departmentForHost(departments: Department[], host: string | null | undefined): Department | null {
  const domain = normalizeHost(host)
  return (domain && departments.find((d) => d.domain === domain)) || null
}

/**
 * Wählt den Bereich aus einer (zwischengespeicherten) Liste aktiver Bereiche,
 * sortiert nach sort_order — ohne Datenbankzugriff. Dieselbe Regel wie
 * resolveDepartment(): Profil vor Adresse vor Rückfall (erster der Liste).
 */
export function pickDepartment(
  departments: Department[],
  opts: { departmentId: string | null; host: string | null | undefined },
): Department | null {
  if (opts.departmentId) {
    const own = departments.find((d) => d.id === opts.departmentId)
    if (own) return own
  } else {
    const byHost = departmentForHost(departments, opts.host)
    if (byHost) return byHost
  }
  return departments[0] ?? null
}

/**
 * Bereich für einen Seitenaufruf: nach dem Login zählt das Profil, davor die
 * aufgerufene Adresse, sonst der Rückfall-Bereich. Die Adresse ändert nie den
 * Bereich eines eingeloggten Nutzers.
 */
export async function resolveDepartment(
  supabase: AnyClient,
  opts: { userId: string | null; host: string | null | undefined },
): Promise<Department | null> {
  if (opts.userId) return getDepartmentForUser(supabase, opts.userId)
  return (await getDepartmentByHost(supabase, opts.host)) ?? getFallbackDepartment(supabase)
}

/**
 * Neutraler Auftritt, falls kein Bereich geladen werden kann (Datenbank nicht
 * erreichbar). Kein Bereich wird damit vorgetäuscht.
 */
export const NEUTRAL_BRANDING: DepartmentBranding = {
  id: '',
  code: '',
  slug: '',
  name: 'Azubis',
  appName: 'Lern-App',
  tagline: 'Täglich lernen. Besser werden. Prüfung bestehen.',
  iconName: 'GraduationCap',
  currencyName: 'Münzen',
  hofName: 'Sammlung',
  hofShortName: 'Sammlung',
  classLevels: [],
}

/**
 * Filterwert, wenn kein Bereich bestimmt werden konnte: eine gültige UUID,
 * die zu keinem Datensatz passt — Listen bleiben leer statt fehlerhaft.
 */
export const NO_DEPARTMENT_ID = '00000000-0000-0000-0000-000000000000'
