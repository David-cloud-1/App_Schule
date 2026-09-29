'use client'

import { useEffect, useState } from 'react'

/**
 * Kürzel der aktiven Fächer im Bereich des Admins (PROJ-22) — für Auswahllisten
 * im KI-Generator. Ersetzt die früher fest eingetragene Liste BGP/KSK/STG/LOP/PUG.
 */
export function useAdminSubjectCodes(): string[] {
  const [codes, setCodes] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/subjects')
      .then((res) => (res.ok ? res.json() : { subjects: [] }))
      .then((data: { subjects?: { code: string; is_active: boolean }[] }) => {
        if (cancelled) return
        setCodes((data.subjects ?? []).filter((s) => s.is_active).map((s) => s.code))
      })
      .catch(() => { if (!cancelled) setCodes([]) })
    return () => { cancelled = true }
  }, [])

  return codes
}
