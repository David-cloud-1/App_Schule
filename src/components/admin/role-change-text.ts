import { isTeacherRole, ROLE_LABEL, type UserRole } from '@/lib/roles'

/**
 * Text für den Bestätigungsdialog beim Rollenwechsel (PROJ-44). Nennt immer
 * Name UND E-Mail, damit bei gleichen Namen keine Verwechslung passiert.
 */
export function roleChangeDescription(
  user: { display_name: string | null; email: string | null; role: UserRole },
  newRole: UserRole,
): string {
  const who =
    user.display_name && user.email
      ? `${user.display_name} (${user.email})`
      : (user.display_name ?? user.email ?? 'Dieses Konto')
  const head = `${who} wird „${ROLE_LABEL[newRole]}“`

  switch (newRole) {
    case 'admin':
      return `${head}. Diese Person erhält vollen Zugriff auf alle Fachbereiche.`
    case 'department_admin':
      return `${head} für den eigenen Fachbereich und kann dessen Inhalte verwalten.`
    case 'teacher':
      return isTeacherRole(user.role)
        ? `${head}: Zugang zum Lehrkräfte-Bereich bleibt, die Verwaltungsrechte für einen Fachbereich entfallen.`
        : `${head} und bekommt Zugang zum Lehrkräfte-Bereich – ohne Verwaltungsrechte für einen Fachbereich.`
    case 'student':
      return `${head} und verliert sofort den Zugang zum Lehrkräfte-Bereich. Erstellte Inhalte bleiben erhalten und sind danach nur noch für dich sichtbar.`
  }
}
