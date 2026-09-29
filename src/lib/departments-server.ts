import { cache } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { resolveDepartment, toBranding, type Department } from '@/lib/departments'
import { fetchExamParts, type ExamPart } from '@/lib/exam-parts'
import type { DepartmentContextValue } from '@/components/department-provider'

/**
 * Bereich des aktuellen Seitenaufrufs — einmal pro Anfrage geladen, auch
 * wenn Layout, Metadaten und Seite ihn jeweils abfragen.
 */
export const getCurrentDepartment = cache(async (): Promise<Department | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const h = await headers()
  return resolveDepartment(supabase, {
    userId: user?.id ?? null,
    host: h.get('x-forwarded-host') ?? h.get('host'),
  })
})

/** Prüfungsaufbau des aktuellen Bereichs; leer vor dem Login oder bei Fehlern */
export const getCurrentExamParts = cache(async (): Promise<ExamPart[]> => {
  const department = await getCurrentDepartment()
  if (!department) return []
  try {
    return await fetchExamParts(await createClient(), department.id)
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
