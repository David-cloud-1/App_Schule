import {
  BookOpen,
  Briefcase,
  Building,
  Bus,
  Calendar,
  CalendarX,
  Check,
  CircleSlash,
  ClipboardCheck,
  Footprints,
  GraduationCap,
  Hourglass,
  MapPin,
  Plane,
  Presentation,
  School,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  departmentLabel,
  formatRange,
  substituteLabel,
  type Absence,
  type AbsenceColor,
  type SubstituteStatus,
} from '@/lib/absence'

/** Feste Icon-Auswahl für Abwesenheitsarten (PROJ-120: Name steht in der Datenbank) */
export const ABSENCE_ICONS: Record<string, LucideIcon> = {
  'graduation-cap': GraduationCap,
  footprints: Footprints,
  briefcase: Briefcase,
  'clipboard-check': ClipboardCheck,
  bus: Bus,
  'calendar-x': CalendarX,
  calendar: Calendar,
  users: Users,
  'map-pin': MapPin,
  plane: Plane,
  'book-open': BookOpen,
  school: School,
  presentation: Presentation,
  building: Building,
}

/** Icon einer Art; unbekannte Namen fallen auf den Kalender zurück */
export function AbsenceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ABSENCE_ICONS[name] ?? CalendarX
  return <Icon className={className} aria-hidden />
}

/**
 * Getönte Farbklassen je Art. Tailwind braucht die vollen Klassennamen im
 * Quelltext, deshalb eine feste Tabelle statt `bg-ws-${color}`. Tönung höchstens
 * /15, damit der Kontrast im Workspace-Test hält (docs/DESIGN.md).
 */
export const ABSENCE_TINT: Record<AbsenceColor, string> = {
  green: 'border-ws-green/30 bg-ws-green/15 text-ws-green',
  blue: 'border-ws-blue/30 bg-ws-blue/15 text-ws-blue',
  orange: 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange',
  red: 'border-ws-red/30 bg-ws-red/15 text-ws-red',
  gold: 'border-ws-gold/30 bg-ws-gold/15 text-ws-gold',
  faint: 'border-ws-line bg-ws-raised text-ws-muted',
}

const STATUS_STYLE: Record<SubstituteStatus, string> = {
  open: 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange',
  entered: 'border-ws-green/30 bg-ws-green/15 text-ws-green',
  not_needed: 'border-ws-line bg-ws-raised text-ws-muted',
}

const STATUS_ICON: Record<SubstituteStatus, LucideIcon> = {
  open: Hourglass,
  entered: Check,
  not_needed: CircleSlash,
}

/** Vertretungsstatus: Icon plus Text, nie nur Farbe */
export function SubstituteBadge({ status, className }: { status: SubstituteStatus; className?: string }) {
  const Icon = STATUS_ICON[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLE[status],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {substituteLabel(status)}
    </span>
  )
}

/** Gelöscht, obwohl die Vertretung schon eingetragen war: gelb, Icon plus Text */
export function CancelledBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-ws-gold/30 bg-ws-gold/15 px-2.5 py-0.5 text-xs font-medium text-ws-gold',
        className,
      )}
    >
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
      Gelöscht – Vertretung zurücknehmen
    </span>
  )
}

export function TypeBadge({ absence, className }: { absence: Pick<Absence, 'typeName' | 'typeColor' | 'typeIcon'>; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        ABSENCE_TINT[absence.typeColor],
        className,
      )}
    >
      <AbsenceIcon name={absence.typeIcon} className="size-3.5 shrink-0" />
      {absence.typeName}
    </span>
  )
}

/** Ausführliche Karte für die Listenansicht (Name, Art, Zeitraum, Abteilungen, Vertretung) */
export function AbsenceCard({
  absence,
  onOpen,
  highlighted,
}: {
  absence: Absence
  onOpen: (a: Absence) => void
  highlighted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(absence)}
      className={cn(
        'flex min-h-11 w-full flex-col gap-2 rounded-2xl border bg-ws-surface p-4 text-left transition-colors duration-200',
        'hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
        absence.cancelledAt
          ? 'border-ws-gold/60 bg-ws-gold/10'
          : absence.substituteStatus === 'open'
            ? 'border-ws-orange/50'
            : 'border-ws-line',
        highlighted && 'ring-2 ring-ws-green/60',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate font-semibold text-ws-text" title={absence.personName}>
          {absence.personName}
        </span>
        <TypeBadge absence={absence} />
      </div>
      <p className="text-sm text-ws-muted">
        {formatRange(absence)} · {departmentLabel(absence)}
      </p>
      {(absence.freeText || absence.note) && (
        <p className="line-clamp-2 text-sm text-ws-muted" title={[absence.freeText, absence.note].filter(Boolean).join(' – ')}>
          {[absence.freeText, absence.note].filter(Boolean).join(' – ')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {absence.cancelledAt ? (
          <CancelledBadge />
        ) : (
          <SubstituteBadge status={absence.substituteStatus} />
        )}
        {absence.changedAfterSubstitute && (
          <span className="text-xs font-medium text-ws-orange">Geändert nach Vertretung</span>
        )}
      </div>
    </button>
  )
}
