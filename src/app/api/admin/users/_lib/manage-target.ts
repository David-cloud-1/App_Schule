import type { AdminAuthResult } from '../../_lib/auth'

/** Die Angaben des Ziel-Kontos, nach denen die Regel entscheidet */
export type ManageableTarget = {
  role: string
  department_id: string | null
  linked_main_user_id?: string | null
}

/**
 * Darf eine Lehrkraft dieses Konto in der Nutzerverwaltung bearbeiten
 * (sperren, entsperren, Bereich verschieben, Passwort neu, PROJ-127)?
 * Nur echte Azubis mit Bereich, die zum gewählten Bereich der Bereichsleiste
 * gehören (bei „Alle Bereiche“ jeder Bereich). Andere Lehrkräfte, der
 * Super-Admin und verknüpfte Zweitkonten (PROJ-29) sind tabu.
 * Der Super-Admin darf alles; das entscheidet die Route vorher.
 */
export function mayManageUserTarget(
  auth: Extract<AdminAuthResult, { error: null }>,
  target: ManageableTarget
): boolean {
  if (auth.isSuperAdmin) return true
  if (target.role !== 'student') return false
  if (target.linked_main_user_id) return false
  if (!target.department_id) return false
  return auth.scopeIsAll || target.department_id === auth.departmentId
}
