import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  Compass,
  Globe,
  GraduationCap,
  Hotel,
  Landmark,
  Luggage,
  Map,
  Package,
  Plane,
  Scale,
  Ship,
  Truck,
  Users,
} from 'lucide-react'

/**
 * Icons, die Fachbereiche, Fächer und Prüfungsteile in der Datenbank per Name
 * wählen können (departments.icon_name, subjects.icon_name,
 * exam_parts.icon_name). Bewusst eine feste Auswahl statt aller Lucide-Icons,
 * damit das Bundle klein bleibt — neue Icons hier ergänzen.
 */
export const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  Compass,
  Globe,
  GraduationCap,
  Hotel,
  Landmark,
  Luggage,
  Map,
  Package,
  Plane,
  Scale,
  Ship,
  Truck,
  Users,
}

export function resolveIcon(name: string | null | undefined, fallback: LucideIcon = BookOpen): LucideIcon {
  return (name && DEPARTMENT_ICONS[name]) || fallback
}

export function DepartmentIcon({ name, ...props }: LucideProps & { name: string | null | undefined }) {
  const Icon = resolveIcon(name)
  return <Icon {...props} />
}
