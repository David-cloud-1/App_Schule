'use client'

import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'

/**
 * Bereichs-Etikett (PROJ-70): Name des Fachbereichs als Text, nicht nur als
 * Farbe. Steht nur in der Ansicht „Alle Bereiche“ an den Zeilen, weil dort
 * Bereiche gemischt sind; zeigt die Leiste genau einen Bereich, entfällt es.
 */
export function DepartmentTag({ name, code }: { name?: string | null; code?: string | null }) {
  const role = useOptionalAdminRole()
  // Ohne Bereichsdaten (Einzelseiten) oder bei einem gewählten Bereich: kein Etikett
  if (!role?.scope || role.scope.current !== null || !name) return null
  return (
    <Badge
      variant="outline"
      className="border-ws-blue/30 bg-ws-blue/15 font-medium text-ws-blue"
      title={code ? `${name} (${code})` : name}
    >
      {name}
    </Badge>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { dateStyle: 'medium' })
}

/**
 * So heißt der Urheber der ersten Version, die bei der Einführung des Verlaufs
 * (PROJ-47) für alle Bestandsinhalte angelegt wurde. Das ist keine echte Änderung.
 */
export const LEGACY_CHANGE_LABEL = 'Stand bei Einführung'

/**
 * „Zuletzt geändert von <Name> am <Datum>“ (PROJ-70, alle vier Inhaltstypen).
 * Inhalte, die seit der Einführung des Verlaufs nicht angefasst wurden
 * (PROJ-83), zeigen nichts: „von Stand bei Einführung“ ist Rauschen.
 */
export function LastChangedLine({ by, at }: { by?: string | null; at?: string | null }) {
  if (by === LEGACY_CHANGE_LABEL) return null
  if (!by && !at) return null
  return (
    <span className="text-xs text-ws-faint">
      Zuletzt geändert{by ? ` von ${by}` : ''}
      {at ? ` am ${formatDate(at)}` : ''}
    </span>
  )
}

/**
 * Grund einer leeren Liste (PROJ-70): nennt den Bereich statt nur „Keine
 * Ergebnisse“, z. B. „Keine Fragen in Tourismus“.
 */
export function useEmptyScopeText(noun: string): string {
  const role = useOptionalAdminRole()
  const scope = role?.scope
  if (!scope || scope.current === null) return `Keine ${noun} in allen Bereichen.`
  const name = scope.departments.find((d) => d.id === scope.current)?.name
  return name ? `Keine ${noun} in ${name}.` : `Keine ${noun} in diesem Bereich.`
}

/** Antwort eines Speicherversuchs, wenn jemand anderes zuvor geändert hat (409, PROJ-70) */
export type VersionConflictResponse = { error?: string; conflict?: boolean }

/**
 * Zeigt den Konflikt-Hinweis „Wurde gerade von <Name> geändert“ mit Link zum
 * Verlauf. Gibt `true` zurück, wenn es ein Konflikt war (der Aufrufer lädt dann
 * neu, statt eine zweite Fehlermeldung zu zeigen).
 */
export function showVersionConflict(
  res: { status: number },
  data: VersionConflictResponse,
  onOpenHistory?: () => void
): boolean {
  if (res.status !== 409 || !data?.conflict) return false
  toast.error(data.error ?? 'Wurde gerade von jemand anderem geändert.', {
    action: onOpenHistory ? { label: 'Verlauf ansehen', onClick: onOpenHistory } : undefined,
  })
  return true
}
