'use client'

import Link from 'next/link'
import { useAdminRole, useHasSubjects } from '@/components/admin/admin-role-provider'
import { useDepartment } from '@/components/department-provider'
import { contentScopeText } from '@/lib/roles'

/**
 * Eine Zeile unter dem Titel der Inhalts-Seiten (PROJ-49): was die Rolle hier
 * sieht — damit eine kurze Liste bei einer Lehrkraft nicht wie ein Fehler
 * wirkt und ein Bereichs-Admin seinen Umfang kennt. Reine Anzeige.
 */
export function AdminScopeNote() {
  const { role } = useAdminRole()
  const { name: departmentName } = useDepartment()
  const hasSubjects = useHasSubjects()
  // Ohne Fach erklärt der Leerzustand des Rahmens den nächsten Schritt
  if (role === 'teacher' && !hasSubjects) return null

  return (
    <p className="text-sm text-ws-muted">
      {contentScopeText(role, departmentName)}
      {role === 'teacher' && (
        <>
          {' '}
          <Link
            href="/admin/my-subjects"
            className="font-semibold text-ws-blue hover:underline focus-visible:ring-2 focus-visible:ring-ws-green"
          >
            Meine Fächer
          </Link>
        </>
      )}
    </p>
  )
}
