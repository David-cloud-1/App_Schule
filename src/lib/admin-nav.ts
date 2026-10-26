import {
  Bot,
  Building2,
  ClipboardList,
  FileText,
  FolderKanban,
  GraduationCap,
  ScrollText,
  Settings,
  Store,
  Tag,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { TeacherRole } from '@/lib/roles'

/**
 * Navigation des Admin-Bereichs (PROJ-40) — einzige Quelle für Seitenleiste,
 * Mobil-Menü und Startseiten-Kacheln. Ein neuer Bereich = ein neuer Eintrag.
 *
 * Rollenfilter dienen nur der Anzeige; die Rechteprüfung der Seiten und
 * API-Routen bleibt serverseitig.
 */
export interface AdminNavItem {
  href: string
  label: string
  /** Ein Satz für die Kachel auf der Startseite */
  description: string
  icon: LucideIcon
  /** Nur für Super-Admins sichtbar */
  superAdminOnly?: boolean
  /**
   * Auch für Lehrkräfte ohne Verwaltungsrechte sichtbar (PROJ-44). Ohne
   * Kennzeichen sehen nur Bereichs-Admins und Super-Admin den Eintrag.
   */
  teacherVisible?: boolean
  /** Titel kommt aus dem Fachbereich (z. B. „Hof-Items“) statt aus `label` */
  usesHofName?: boolean
  /** Erscheint als große Kachel auf der Startseite */
  tile?: boolean
  /** Externe Adresse: öffnet in neuem Tab, nie als „aktiv“ markiert */
  external?: boolean
}

export interface AdminNavGroup {
  id: 'unterricht' | 'inhalte' | 'einstellungen'
  label: string
  items: AdminNavItem[]
}

export const ADMIN_HOME_HREF = '/admin'

export const WERKZEUGKISTE_URL = 'https://divadl-werkzeugkiste.hf.space'

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'unterricht',
    label: 'Unterricht',
    items: [
      {
        href: '/admin/leistungsnachweise',
        label: 'Leistungsnachweise',
        description: 'Tests erstellen, auswerten und drucken',
        icon: GraduationCap,
        tile: true,
      },
      {
        href: '/admin/questions',
        label: 'Fragen',
        description: 'Fragen ansehen, bearbeiten und importieren',
        icon: FileText,
        tile: true,
      },
      {
        href: '/admin/users',
        label: 'Nutzer',
        description: 'Azubis und Rollen verwalten',
        icon: Users,
        tile: true,
      },
      {
        href: WERKZEUGKISTE_URL,
        label: 'Werkzeugkiste',
        description: 'KI-Werkzeuge für Arbeitsblätter, Klassenarbeiten und mehr',
        icon: Wrench,
        tile: true,
        external: true,
        teacherVisible: true,
      },
    ],
  },
  {
    id: 'inhalte',
    label: 'Inhalte',
    items: [
      {
        href: '/admin/subjects',
        label: 'Fächer',
        description: 'Fächer anlegen und ordnen',
        icon: FolderKanban,
      },
      {
        href: '/admin/topics',
        label: 'Themen',
        description: 'Themen und Klassenstufen pflegen',
        icon: Tag,
      },
      {
        href: '/admin/exam-sets',
        label: 'Prüfungssimulation',
        description: 'Fragenzusammenstellungen für die Prüfungssimulation',
        icon: ClipboardList,
      },
      {
        href: '/admin/ai-generator',
        label: 'Fragen aus Material',
        description: 'Aus Lernmaterial neue Fragen erstellen lassen',
        icon: Bot,
        tile: true,
      },
    ],
  },
  {
    id: 'einstellungen',
    label: 'Einstellungen',
    items: [
      {
        href: '/admin/department-settings',
        label: 'Fachbereich',
        description: 'Einstellungen des Fachbereichs',
        icon: Settings,
      },
      {
        href: '/admin/shop-items',
        label: 'Items',
        description: 'Shop-Items des Hofs pflegen',
        icon: Store,
        usesHofName: true,
      },
      {
        href: '/admin/audit-log',
        label: 'Änderungsprotokoll',
        description: 'Wer hat wann was geändert',
        icon: ScrollText,
      },
      {
        href: '/admin/departments',
        label: 'Fachbereiche',
        description: 'Alle Fachbereiche verwalten',
        icon: Building2,
        superAdminOnly: true,
      },
    ],
  },
]

/** Darf diese Rolle den Eintrag sehen? Nur Anzeige — die Rechte prüft der Server. */
export function adminNavItemVisibleFor(item: AdminNavItem, role: TeacherRole): boolean {
  if (role === 'admin') return true
  if (item.superAdminOnly) return false
  if (role === 'department_admin') return true
  return !!item.teacherVisible
}

/** Gruppen für eine Rolle; leere Gruppen entfallen */
export function adminNavGroupsFor(role: TeacherRole): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => adminNavItemVisibleFor(item, role)),
  })).filter((group) => group.items.length > 0)
}

/** Anzeigename eines Eintrags (Items-Eintrag trägt den Namen des Fachbereichs) */
export function adminNavLabel(item: AdminNavItem, hofShortName: string): string {
  return item.usesHofName ? `${hofShortName}-Items` : item.label
}

/** Unterseiten zählen mit: /admin/leistungsnachweise/123 → Leistungsnachweise */
export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === ADMIN_HOME_HREF) return pathname === ADMIN_HOME_HREF
  return pathname === href || pathname.startsWith(href + '/')
}

/** Alle Einträge, die eine Rolle sehen darf, in Reihenfolge der Navigation */
export function adminNavItemsFor(role: TeacherRole): AdminNavItem[] {
  return adminNavGroupsFor(role).flatMap((group) => group.items)
}

/**
 * Eintrag und Gruppe zur aktuellen Seite (PROJ-45) — Grundlage für den
 * Seitentitel in der Handy-Kopfzeile und die Brotkrumen. Die Übersicht und
 * unbekannte Pfade liefern `null`.
 */
export function adminNavMatch(pathname: string): { group: AdminNavGroup; item: AdminNavItem } | null {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (!item.external && isAdminNavActive(pathname, item.href)) return { group, item }
    }
  }
  return null
}

/** Rolle in Klartext fürs Konto-Menü: „Lehrkraft“, „Bereichs-Admin Spedition“, „Super-Admin“ */
export function teacherRoleLabel(role: TeacherRole, departmentName: string): string {
  if (role === 'department_admin') return departmentName ? `Bereichs-Admin ${departmentName}` : 'Bereichs-Admin'
  return role === 'admin' ? 'Super-Admin' : 'Lehrkraft'
}

/**
 * Aktionen der Schnellsuche (PROJ-45). Eine Aktion mit `requiresHref` erscheint
 * nur, wenn die Rolle diese Seite sehen darf — so zeigt die Suche nie mehr als
 * die Navigation.
 */
export type AdminCommandAction =
  | { id: string; label: string; keywords: string[]; kind: 'link'; href: string; external?: boolean; requiresHref?: string }
  | { id: string; label: string; keywords: string[]; kind: 'theme' }

export const ADMIN_COMMAND_ACTIONS: AdminCommandAction[] = [
  {
    id: 'neuer-nachweis',
    label: 'Neuer Leistungsnachweis',
    keywords: ['test', 'klassenarbeit', 'anlegen', 'erstellen'],
    kind: 'link',
    href: '/admin/leistungsnachweise?neu=1',
    requiresHref: '/admin/leistungsnachweise',
  },
  {
    id: 'werkzeugkiste',
    label: 'Werkzeugkiste öffnen',
    keywords: ['ki', 'arbeitsblatt', 'werkzeug'],
    kind: 'link',
    href: WERKZEUGKISTE_URL,
    external: true,
  },
  { id: 'lern-app', label: 'Zur Lern-App', keywords: ['schüler', 'quiz', 'spielen'], kind: 'link', href: '/' },
  { id: 'darstellung', label: 'Darstellung wechseln', keywords: ['hell', 'dunkel', 'beamer', 'farbe', 'theme'], kind: 'theme' },
]

export function adminCommandActionsFor(role: TeacherRole): AdminCommandAction[] {
  const visible = new Set(adminNavItemsFor(role).map((item) => item.href))
  return ADMIN_COMMAND_ACTIONS.filter(
    (action) => action.kind !== 'link' || !action.requiresHref || visible.has(action.requiresHref),
  )
}
