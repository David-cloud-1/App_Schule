/**
 * Konto löschen (PROJ-60): reine Hilfen ohne Datenbankzugriff, geteilt von
 * Schnittstelle und Oberfläche.
 */

/** Anzeige überall dort, wo eine Person nach der Löschung nicht mehr zugeordnet ist */
export const DELETED_ACCOUNT_LABEL = 'Gelöschtes Konto'

export const USER_DELETE_ACTION = 'user.delete'

/** Speicher mit den Dateien der Werkzeugkiste; Pfade beginnen mit der Konto-Id */
export const WERKZEUG_BUCKET = 'werkzeugkiste'

export const DELETE_FAILED_MESSAGE = 'Löschen fehlgeschlagen – erneut versuchen'

/** Stimmt die eingetippte E-Mail mit der des Kontos überein? (Leerraum außen und Groß-/Kleinschreibung egal) */
export function deleteConfirmationMatches(typed: unknown, email: string | null | undefined): boolean {
  if (typeof typed !== 'string' || !email) return false
  const wanted = email.trim().toLowerCase()
  return wanted.length > 0 && typed.trim().toLowerCase() === wanted
}

export type DeletePreview = {
  email: string | null
  displayName: string | null
  /** Benotete Leistungsnachweise, die anonym erhalten bleiben */
  assessments: number
  /** Inhalte (Fragen, Zusammenstellungen, Nachweise, Forum), die ohne Autor bleiben */
  ownContent: number
}

/** Warum ein Konto hier nicht gelöscht werden darf (null = darf) */
export function deleteBlockReason(target: { role: string; linked_main_user_id: string | null }): string | null {
  if (target.role === 'admin') {
    return 'Ein Super-Admin-Konto lässt sich nicht löschen. Ändere zuerst die Rolle.'
  }
  if (target.linked_main_user_id) {
    return 'Ein Zweitaccount lässt sich hier nicht löschen.'
  }
  return null
}
