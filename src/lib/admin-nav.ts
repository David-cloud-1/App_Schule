import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarCog,
  CalendarDays,
  Building2,
  ClipboardList,
  FileText,
  Flag,
  FolderKanban,
  FolderTree,
  GraduationCap,
  Library,
  ListChecks,
  MessagesSquare,
  Plus,
  Scale,
  ScrollText,
  Settings,
  SlidersHorizontal,
  Store,
  Tag,
  Trash2,
  Users,
  UserCog,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { PLAYER_VIEW_HREF, ROLE_LABEL, type TeacherRole } from '@/lib/roles'
// PROJ-51: Die Werkzeugkiste ist eine Seite im Lehrkräfte-Bereich (vorher Hugging Face)
import { WERKZEUGKISTE_HREF } from '@/lib/werkzeugkiste'
// PROJ-55: Schulrecht nachschlagen — eigener Eintrag, kein Werkzeug
import { SCHULRECHT_HREF } from '@/lib/schulrecht'
// PROJ-120: Abwesenheitskalender für alle Lehrer-Rollen
import { ABSENCE_HREF } from '@/lib/absence'
// PROJ-122: Checklisten zu den Handlungsleitlinien
import { CHECKLISTEN_HREF } from '@/lib/checklisten/liste'

/**
 * Navigation des Admin-Bereichs (PROJ-40, neu geordnet in PROJ-130) — einzige
 * Quelle für Seitenleiste, Handy-Menü, Brotkrumen und Schnellsuche. Ein neuer
 * Bereich = ein neuer Eintrag.
 *
 * Rollenfilter dienen nur der Anzeige; die Rechteprüfung der Seiten und
 * API-Routen bleibt serverseitig.
 */
export interface AdminNavItem {
  href: string
  label: string
  /** Ein Satz Erklärung: Suchwort in der Schnellsuche, Text auf Einstiegsseiten */
  description: string
  icon: LucideIcon
  /** Kurzer Zusatz im Menü, z. B. „mit Note“ */
  hint?: string
  /** PROJ-130: frühere Namen — nur Suchwörter der Schnellsuche, nie sichtbar */
  aliases?: string[]
  /** Nur für Super-Admins sichtbar */
  superAdminOnly?: boolean
  /**
   * Auch für Lehrkräfte ohne Verwaltungsrechte sichtbar (PROJ-44). Ohne
   * Kennzeichen sehen nur Bereichs-Admins und Super-Admin den Eintrag.
   */
  teacherVisible?: boolean
  /**
   * Seiten, die hinter diesem Eintrag liegen (PROJ-130: Schulrecht und
   * Checklisten unter „Nachschlagen“). Sie stehen nicht im Menü, halten den
   * Eintrag aber aktiv und haben eigene Brotkrumen.
   */
  subPages?: AdminNavItem[]
  /** Externe Adresse: öffnet in neuem Tab, nie als „aktiv“ markiert */
  external?: boolean
}

export interface AdminNavGroup {
  id: 'unterricht' | 'lerninhalte' | 'austausch' | 'verwaltung'
  label: string
  /** Aufklappbare Gruppe mit eigenem Kopf; sonst stehen die Einträge direkt im Menü */
  collapsible?: { icon: LucideIcon }
  items: AdminNavItem[]
}

export const ADMIN_HOME_HREF = '/admin'
export const ADMIN_HOME_LABEL = 'Start'

/** Lehrerzimmer (PROJ-63): Forum für den Austausch im Kollegium */
export const LEHRERZIMMER_HREF = '/admin/lehrerzimmer'

/** PROJ-130: Einstiegsseite für Schulrecht und Checklisten */
export const NACHSCHLAGEN_HREF = '/admin/nachschlagen'

/**
 * Seiten im Lehrkräfte-Bereich, die nicht in der Seitenleiste stehen, aber
 * Titel und Brotkrumen brauchen (PROJ-50: „Mein Konto“ liegt im Konto-Menü,
 * PROJ-130: „Meine Fächer“ liegt unter „Mein Konto“).
 */
export const ADMIN_ACCOUNT_HREF = '/admin/konto'
export const ADMIN_ACCOUNT_LABEL = 'Mein Konto'
export const MY_SUBJECTS_HREF = '/admin/my-subjects'
export const MY_SUBJECTS_LABEL = 'Meine Fächer'

/** PROJ-130: Die beiden Seiten hinter „Nachschlagen“ */
export const NACHSCHLAGEN_PAGES: AdminNavItem[] = [
  {
    href: SCHULRECHT_HREF,
    label: 'Schulrecht',
    description: 'Paragraphen zu Fragen aus dem Schulalltag – im Wortlaut, ohne KI',
    icon: Scale,
    // PROJ-55: jede Lehrer-Rolle, auch ohne Fachbereich oder Fach
    teacherVisible: true,
  },
  {
    href: CHECKLISTEN_HREF,
    label: 'Checklisten',
    description: 'Schritt für Schritt durch Vorgänge der Schule: Dienstreise, Reisekosten … mit dem Original daneben',
    icon: ListChecks,
    // PROJ-122: jede Lehrer-Rolle; die Haken sind privat im eigenen Konto
    teacherVisible: true,
  },
]

/**
 * Das Menü in Anzeige-Reihenfolge (PROJ-130). „Start“ steht davor und ist kein
 * Eintrag der Liste.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'unterricht',
    label: 'Unterricht',
    items: [
      {
        href: '/admin/leistungsnachweise',
        label: 'Leistungsnachweise',
        hint: 'mit Note',
        description: 'Benotete Tests für deine Klasse: Code verteilen, auswerten, drucken',
        icon: GraduationCap,
        // PROJ-46: auch für Lehrkräfte ohne Fachbereich — eigene Nachweise
        teacherVisible: true,
      },
      {
        href: '/admin/exam-sets',
        label: 'Übungsprüfungen',
        hint: 'ohne Note',
        aliases: ['Prüfungssimulation', 'Prüfungsset', 'Prüfung üben'],
        description: 'Übungsprüfungen, die Azubis selbst ohne Note spielen',
        icon: ClipboardList,
        teacherVisible: true,
      },
    ],
  },
  {
    id: 'lerninhalte',
    label: 'Lerninhalte',
    collapsible: { icon: BookOpen },
    items: [
      {
        href: '/admin/inhalte',
        label: 'Übersicht',
        aliases: ['Inhalte'],
        description: 'Fächer, Themen und Fragen als Baum: Struktur und Fragenzahlen auf einen Blick',
        icon: FolderTree,
        // PROJ-85: dieselben Rollen wie „Fragen“
        teacherVisible: true,
      },
      {
        href: '/admin/questions',
        label: 'Fragen',
        description: 'Die Lernfragen der Azubis ansehen, bearbeiten und importieren',
        icon: FileText,
        // PROJ-48: welche Fragen eine Lehrkraft sieht, entscheidet ihre Fach-Zuständigkeit
        teacherVisible: true,
      },
      {
        href: '/admin/gemeldete-fragen',
        label: 'Gemeldete Fragen',
        description: 'Fragen, die Azubis als fehlerhaft gemeldet haben, prüfen und abschließen',
        icon: Flag,
        // PROJ-73: jede Lehrer-Rolle (Inhalte sind offen, PROJ-70)
        teacherVisible: true,
      },
      {
        href: '/admin/schwierigste-fragen',
        label: 'Schwierigste Fragen',
        description: 'Welche Fragen und Themen fallen den Azubis insgesamt am schwersten – ohne Namen',
        icon: BarChart3,
        // PROJ-74: jede Lehrer-Rolle (Inhalte sind offen, PROJ-70)
        teacherVisible: true,
      },
      {
        href: '/admin/subjects',
        label: 'Fächer',
        description: 'Fächer anlegen und ordnen',
        icon: FolderKanban,
        teacherVisible: true,
      },
      {
        href: '/admin/topics',
        label: 'Themen',
        description: 'Themen und Klassenstufen pflegen',
        icon: Tag,
        teacherVisible: true,
      },
      {
        href: '/admin/papierkorb',
        label: 'Papierkorb',
        description: 'Gelöschte Fragen, Themen, Fächer und Übungsprüfungen wiederherstellen',
        icon: Trash2,
        teacherVisible: true,
      },
      {
        href: '/admin/ai-generator',
        label: 'Fragen aus Material',
        description: 'Aus Lernmaterial neue Fragen erstellen lassen',
        icon: Bot,
        // PROJ-127: bezahlte KI bleibt beim Super-Admin
        superAdminOnly: true,
      },
    ],
  },
  {
    id: 'austausch',
    label: 'Werkzeuge und Austausch',
    items: [
      {
        href: WERKZEUGKISTE_HREF,
        label: 'Werkzeugkiste',
        description: 'Aus einem Skript Unterrichtsmaterial machen – kostenlos, mit deiner KI',
        icon: Wrench,
        teacherVisible: true,
      },
      {
        href: ABSENCE_HREF,
        label: 'Abwesenheiten',
        aliases: ['Kalender'],
        description: 'Wer fehlt wann? Abwesenheiten eintragen und Vertretungen im Blick behalten',
        icon: CalendarDays,
        // PROJ-120: jede Lehrer-Rolle, schulweit und unabhängig vom Bereichs-Umschalter
        teacherVisible: true,
      },
      {
        href: NACHSCHLAGEN_HREF,
        label: 'Nachschlagen',
        description: 'Schulrecht und Checklisten an einem Ort',
        icon: Library,
        teacherVisible: true,
        subPages: NACHSCHLAGEN_PAGES,
      },
      {
        href: LEHRERZIMMER_HREF,
        label: 'Lehrerzimmer',
        description: 'Tipps, Fragen und Ideen mit dem Kollegium austauschen',
        icon: MessagesSquare,
        // PROJ-63: jede Lehrer-Rolle, auch ohne Fach
        teacherVisible: true,
      },
    ],
  },
  {
    id: 'verwaltung',
    label: 'Verwaltung',
    collapsible: { icon: Settings },
    items: [
      {
        href: '/admin/users',
        label: 'Nutzer',
        description: 'Azubis sperren, verschieben und Passwörter neu vergeben',
        icon: Users,
        // PROJ-127: Verwaltung für alle Lehrkräfte
        teacherVisible: true,
      },
      {
        href: '/admin/department-settings',
        label: 'Einstellungen des Bereichs',
        aliases: ['Fachbereich'],
        description: 'Namen, Farben und Texte des Bereichs einstellen',
        icon: SlidersHorizontal,
        // PROJ-127: Verwaltung für alle Lehrkräfte
        teacherVisible: true,
      },
      {
        href: '/admin/shop-items',
        label: 'Shop-Gegenstände',
        aliases: ['Items', 'Hof-Items', 'Resort-Items', 'Shop'],
        description: 'Gegenstände im Shop der Lern-App pflegen',
        icon: Store,
        // PROJ-127: Verwaltung für alle Lehrkräfte
        teacherVisible: true,
      },
      {
        href: '/admin/audit-log',
        label: 'Änderungsprotokoll',
        description: 'Wer hat wann was geändert',
        icon: ScrollText,
        // PROJ-127: Verwaltung für alle Lehrkräfte
        teacherVisible: true,
      },
      {
        href: '/admin/teacher-assignments',
        label: 'Zuständigkeiten',
        description: 'Wer unterrichtet welches Fach',
        icon: UserCog,
        superAdminOnly: true,
      },
      {
        href: '/admin/kalender/arten',
        label: 'Abwesenheitsarten',
        description: 'Arten von Abwesenheit anlegen, ordnen und ausblenden',
        icon: CalendarCog,
        superAdminOnly: true,
      },
      {
        href: '/admin/departments',
        label: 'Bereiche anlegen',
        aliases: ['Fachbereiche'],
        description: 'Alle Bereiche verwalten',
        icon: Building2,
        superAdminOnly: true,
      },
    ],
  },
]

/**
 * Darf diese Rolle den Eintrag sehen? Nur Anzeige — die Rechte prüft der Server.
 */
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

function pathMatches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export interface AdminNavMatch {
  group: AdminNavGroup
  item: AdminNavItem
  /** Gesetzt, wenn die Seite hinter dem Eintrag liegt (z. B. Schulrecht) */
  subPage?: AdminNavItem
}

/**
 * Eintrag und Gruppe zur aktuellen Seite (PROJ-45) — Grundlage für Markierung,
 * Seitentitel in der Handy-Kopfzeile und Brotkrumen. Passen mehrere Adressen,
 * gewinnt die genaueste (`/admin/kalender/arten` vor `/admin/kalender`). Die
 * Startseite und unbekannte Pfade liefern `null`.
 */
export function adminNavMatch(pathname: string): AdminNavMatch | null {
  let best: AdminNavMatch | null = null
  let bestLength = 0
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.external) continue
      for (const page of [item, ...(item.subPages ?? [])]) {
        if (page.href.length > bestLength && pathMatches(pathname, page.href)) {
          best = { group, item, subPage: page === item ? undefined : page }
          bestLength = page.href.length
        }
      }
    }
  }
  return best
}

/** Unterseiten zählen mit: /admin/leistungsnachweise/123 → Leistungsnachweise */
export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === ADMIN_HOME_HREF) return pathname === ADMIN_HOME_HREF
  const match = adminNavMatch(pathname)
  return match ? match.item.href === href : pathMatches(pathname, href)
}

/** Alle Einträge, die eine Rolle sehen darf, in Reihenfolge der Navigation */
export function adminNavItemsFor(role: TeacherRole): AdminNavItem[] {
  return adminNavGroupsFor(role).flatMap((group) => group.items)
}

/** Wie `adminNavItemsFor`, dazu die Seiten hinter den Einträgen (für Suche und Sichtbarkeit) */
export function adminPagesFor(role: TeacherRole): AdminNavItem[] {
  return adminNavItemsFor(role).flatMap((item) => [item, ...(item.subPages ?? [])])
}

/** Rolle in Klartext fürs Konto-Menü: „Lehrkraft“, „Bereichs-Admin Spedition“, „Super-Admin“ */
export function teacherRoleLabel(role: TeacherRole, departmentName: string): string {
  if (role === 'department_admin' && departmentName) return `${ROLE_LABEL[role]} ${departmentName}`
  return ROLE_LABEL[role]
}

/**
 * Aktionen der Schnellsuche (PROJ-45). Eine Aktion mit `requiresHref` erscheint
 * nur, wenn die Rolle diese Seite sehen darf — so zeigt die Suche nie mehr als
 * die Navigation.
 */
export type AdminCommandAction =
  | {
      id: string
      label: string
      keywords: string[]
      kind: 'link'
      href: string
      external?: boolean
      requiresHref?: string
      /** Nur für reine Lehrkräfte (Bereichs-Admin und Super-Admin sind bereichsweit zuständig) */
      teacherOnly?: boolean
    }
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
    href: WERKZEUGKISTE_HREF,
    requiresHref: WERKZEUGKISTE_HREF,
  },
  {
    id: 'schulrecht',
    label: 'Schulrecht nachschlagen',
    keywords: ['gesetz', 'paragraph', 'bayeug', 'baysch', 'bso', 'datenschutz', 'handy', 'fehlzeit', 'aufsicht', 'recht'],
    kind: 'link',
    href: SCHULRECHT_HREF,
    requiresHref: SCHULRECHT_HREF,
  },
  {
    id: 'neuer-beitrag',
    label: 'Neuer Beitrag im Lehrerzimmer',
    keywords: ['forum', 'tipp', 'frage', 'idee', 'kollegium', 'schreiben'],
    kind: 'link',
    href: `${LEHRERZIMMER_HREF}/neu`,
    requiresHref: LEHRERZIMMER_HREF,
  },
  {
    id: 'mein-konto',
    label: 'Mein Konto',
    keywords: ['profil', 'passwort', 'e-mail', 'kürzel', 'pseudonym', 'aufgaben', 'beitrag'],
    kind: 'link',
    href: ADMIN_ACCOUNT_HREF,
  },
  {
    id: 'meine-faecher',
    label: MY_SUBJECTS_LABEL,
    keywords: ['fach', 'zuständigkeit', 'unterrichten'],
    kind: 'link',
    href: MY_SUBJECTS_HREF,
    teacherOnly: true,
  },
  {
    id: 'lern-app',
    label: 'Als Azubi ansehen',
    keywords: ['zur lern-app', 'schüler', 'quiz', 'spielen'],
    kind: 'link',
    href: PLAYER_VIEW_HREF,
  },
  { id: 'darstellung', label: 'Darstellung wechseln', keywords: ['hell', 'dunkel', 'beamer', 'farbe', 'theme'], kind: 'theme' },
]

export function adminCommandActionsFor(role: TeacherRole): AdminCommandAction[] {
  const visible = new Set(adminPagesFor(role).map((item) => item.href))
  return ADMIN_COMMAND_ACTIONS.filter((action) => {
    if (action.kind !== 'link') return true
    if (action.teacherOnly && role !== 'teacher') return false
    return !action.requiresHref || visible.has(action.requiresHref)
  })
}

/**
 * Schnellaktionen der Startseite: Verben statt einer zweiten Kopie der
 * Navigation. Wie in der Schnellsuche nur, wenn die Rolle die Zielseite sieht.
 */
export interface AdminHomeAction {
  id: string
  label: string
  description: string
  href: string
  icon: LucideIcon
  external?: boolean
  requiresHref: string
}

export const ADMIN_HOME_ACTIONS: AdminHomeAction[] = [
  {
    id: 'neuer-nachweis',
    label: 'Neuer Leistungsnachweis',
    description: 'Test anlegen und den Code an die Klasse geben',
    href: '/admin/leistungsnachweise?neu=1',
    icon: Plus,
    requiresHref: '/admin/leistungsnachweise',
  },
  {
    id: 'fragen',
    label: 'Fragen durchsuchen',
    description: 'Lernfragen finden, prüfen und verbessern',
    href: '/admin/questions',
    icon: FileText,
    requiresHref: '/admin/questions',
  },
  {
    id: 'material',
    label: 'Fragen aus Material',
    description: 'Aus einem Skript neue Fragen erstellen lassen',
    href: '/admin/ai-generator',
    icon: Bot,
    requiresHref: '/admin/ai-generator',
  },
  {
    id: 'nutzer',
    label: 'Azubis verwalten',
    description: 'Konten, Rollen und Aktivität',
    href: '/admin/users',
    icon: Users,
    requiresHref: '/admin/users',
  },
  {
    id: 'werkzeugkiste',
    label: 'Werkzeugkiste öffnen',
    description: 'Aus einem Skript Unterrichtsmaterial machen',
    href: WERKZEUGKISTE_HREF,
    icon: Wrench,
    requiresHref: WERKZEUGKISTE_HREF,
  },
]

export function adminHomeActionsFor(role: TeacherRole): AdminHomeAction[] {
  const visible = new Set(adminNavItemsFor(role).map((item) => item.href))
  return ADMIN_HOME_ACTIONS.filter((action) => visible.has(action.requiresHref))
}
