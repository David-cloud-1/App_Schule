'use client'

import { useEffect, useState } from 'react'
import { forumRequest } from '@/lib/forum-client'

export interface ForumDepartment {
  id: string
  name: string
  code: string
}
export interface ForumSubject {
  id: string
  name: string
  code: string
  department_id: string
}
interface Catalog {
  departments: ForumDepartment[]
  subjects: ForumSubject[]
  /** Fachbereiche, in denen die Person selbst unterrichtet (Vorbelegung im Formular) */
  ownDepartmentIds: string[]
  loaded: boolean
}

const EMPTY: Catalog = { departments: [], subjects: [], ownDepartmentIds: [], loaded: false }

/**
 * Fachbereiche und Fächer für Filter und Formular (PROJ-63). Kommt von
 * /api/admin/lehrerzimmer/catalog; schlägt das fehl, bleibt die Auswahl
 * leer und das Forum funktioniert trotzdem (Fachbereich/Fach sind optional).
 */
export function useForumCatalog(): Catalog {
  const [catalog, setCatalog] = useState<Catalog>(EMPTY)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await forumRequest<{
        departments?: ForumDepartment[]
        subjects?: ForumSubject[]
        own_department_ids?: string[]
      }>('/api/admin/lehrerzimmer/catalog')
      if (cancelled) return
      if (!res.ok) {
        setCatalog({ ...EMPTY, loaded: true })
        return
      }
      setCatalog({
        departments: res.data.departments ?? [],
        subjects: res.data.subjects ?? [],
        ownDepartmentIds: res.data.own_department_ids ?? [],
        loaded: true,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return catalog
}
