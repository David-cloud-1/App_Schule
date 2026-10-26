/**
 * Darstellung des Lehrkräfte-Bereichs (PROJ-45): dunkel (Standard), hell oder
 * wie das System. Gemerkt als Cookie, damit der Server die Seite gleich in der
 * richtigen Farbe ausliefert (kein Aufblitzen). Die Farben selbst stehen als
 * Tokens in `globals.css`; der Rahmen setzt nur `data-ws-theme`.
 */

export type WorkspaceTheme = 'dark' | 'light' | 'system'

export const WORKSPACE_THEMES: readonly WorkspaceTheme[] = ['dark', 'light', 'system']

export const DEFAULT_WORKSPACE_THEME: WorkspaceTheme = 'dark'

export const WORKSPACE_THEME_COOKIE = 'ws_theme'

/** Ein Jahr — die Wahl soll nicht nach einer Woche verfallen */
export const WORKSPACE_THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const WORKSPACE_THEME_LABEL: Record<WorkspaceTheme, string> = {
  dark: 'Dunkel',
  light: 'Hell',
  system: 'Wie System',
}

/** Unbekannte oder fehlende Werte (gelöschte Cookies, privates Fenster) → Standard */
export function parseWorkspaceTheme(value: unknown): WorkspaceTheme {
  return typeof value === 'string' && (WORKSPACE_THEMES as readonly string[]).includes(value)
    ? (value as WorkspaceTheme)
    : DEFAULT_WORKSPACE_THEME
}

/** Speichert die Wahl im Browser; ist das Speichern gesperrt, gilt sie nur bis zum Neuladen */
export function saveWorkspaceTheme(theme: WorkspaceTheme): void {
  try {
    document.cookie = `${WORKSPACE_THEME_COOKIE}=${theme}; path=/; max-age=${WORKSPACE_THEME_COOKIE_MAX_AGE}; samesite=lax`
  } catch {
    // Cookies gesperrt — die Wahl wirkt trotzdem sofort, nur nicht über das Neuladen hinaus
  }
}

/** Cookie der shadcn-Sidebar (eingeklappt/ausgeklappt); fehlt es, ist sie ausgeklappt */
export const SIDEBAR_STATE_COOKIE = 'sidebar_state'

export function parseSidebarOpen(value: string | undefined): boolean {
  return value !== 'false'
}
