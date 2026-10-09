/**
 * Hof-Icon-Bibliothek (PROJ-26) — feste, handgezeichnete Inline-SVG-
 * Illustrationen je Fachbereich, als Ersatz für das freie Emoji-Textfeld aus
 * PROJ-20. Bewusst kein Bild-Upload, keine Bild-KI (Kosten-Entscheidung aus
 * PROJ-20 bleibt bestehen) — Illustrationen leben ausschließlich im Code,
 * genau wie die bestehenden `BADGE_DEFINITIONS`.
 *
 * Jede Illustration trägt eine feste Kategorie. Diese Zuordnung bestimmt
 * sowohl die Auswahl im Admin-Formular als auch die Zone in der Hof-Szene.
 *
 * Spedition (`SPED`) und Tourismus (`TOUR`, PROJ-31, eigene Datei
 * hof-icons-tour.tsx) haben je ein eigenes Set. Weitere Fachbereiche lassen
 * sich ergänzen, ohne diese Struktur zu ändern.
 */

import type { SVGProps } from 'react'
import { TOUR_ICONS } from './hof-icons-tour'

export type HofCategory =
  | 'fahrzeuge'
  | 'gebaeude_deko'
  | 'ladung_ausstattung'
  | 'abzeichen_trophaeen'

export const HOF_CATEGORIES: { value: HofCategory; label: string }[] = [
  { value: 'fahrzeuge', label: 'Fahrzeuge' },
  { value: 'gebaeude_deko', label: 'Gebäude & Hof-Deko' },
  { value: 'ladung_ausstattung', label: 'Ladung & Ausstattung' },
  { value: 'abzeichen_trophaeen', label: 'Abzeichen & Trophäen' },
]

/**
 * Anzeigenamen der Kategorien je Fachbereich (PROJ-31). Die technischen Werte
 * bleiben überall gleich (DB-Check, Validierung); nur die Beschriftung ändert
 * sich. Ohne Eintrag gelten die Standardnamen oben (Spedition).
 */
const CATEGORY_LABELS_BY_DEPARTMENT: Record<string, Record<HofCategory, string>> = {
  TOUR: {
    fahrzeuge: 'Verkehrsmittel',
    gebaeude_deko: 'Hotels & Reise-Deko',
    ladung_ausstattung: 'Reiseausstattung',
    abzeichen_trophaeen: 'Abzeichen & Trophäen',
  },
}

/** Die vier Kategorien mit den Anzeigenamen des Fachbereichs. */
export function getHofCategories(departmentCode?: string): { value: HofCategory; label: string }[] {
  const labels = departmentCode ? CATEGORY_LABELS_BY_DEPARTMENT[departmentCode] : undefined
  if (!labels) return HOF_CATEGORIES
  return HOF_CATEGORIES.map((c) => ({ value: c.value, label: labels[c.value] }))
}

export function hofCategoryLabel(category: string, departmentCode?: string): string {
  return getHofCategories(departmentCode).find((c) => c.value === category)?.label ?? category
}

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element

export interface HofIconDef {
  key: string
  label: string
  category: HofCategory
  Svg: IconComponent
}

function base(props: SVGProps<SVGSVGElement>, children: React.ReactNode) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  )
}

// ── Fahrzeuge ──────────────────────────────────────────────────────────────

const IconSattelschlepperRot: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={4} y={24} width={16} height={11} rx={2} fill="#4B5563" />
      <rect x={18} y={16} width={12} height={19} rx={2} fill="#FF4B4B" />
      <rect x={21} y={19} width={6} height={5} rx={1} fill="#1CB0F6" />
      <rect x={30} y={24} width={3} height={11} fill="#374151" />
      <circle cx={11} cy={37} r={4} fill="#111827" />
      <circle cx={11} cy={37} r={1.6} fill="#9CA3AF" />
      <circle cx={26} cy={37} r={4} fill="#111827" />
      <circle cx={26} cy={37} r={1.6} fill="#9CA3AF" />
    </>,
  )

const IconTransporterBlau: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={6} y={18} width={30} height={15} rx={3} fill="#1CB0F6" />
      <rect x={9} y={21} width={7} height={6} rx={1} fill="#F9FAFB" />
      <rect x={30} y={24} width={5} height={9} rx={1} fill="#111827" opacity={0.3} />
      <circle cx={14} cy={35} r={4} fill="#111827" />
      <circle cx={14} cy={35} r={1.6} fill="#9CA3AF" />
      <circle cx={29} cy={35} r={4} fill="#111827" />
      <circle cx={29} cy={35} r={1.6} fill="#9CA3AF" />
    </>,
  )

const IconGabelstapler: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={10} y={22} width={16} height={11} rx={2} fill="#FF9600" />
      <rect x={13} y={24} width={6} height={5} rx={1} fill="#111827" opacity={0.3} />
      <rect x={32} y={12} width={3} height={22} fill="#374151" />
      <rect x={34} y={28} width={9} height={2.5} fill="#9CA3AF" />
      <rect x={34} y={32} width={9} height={2.5} fill="#9CA3AF" />
      <circle cx={16} cy={35} r={3.5} fill="#111827" />
      <circle cx={26} cy={35} r={3.5} fill="#111827" />
    </>,
  )

const IconAnhaenger: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={5} y={21} width={32} height={9} rx={1.5} fill="#9CA3AF" />
      <rect x={9} y={13} width={9} height={8} rx={1} fill="#FFD700" />
      <rect x={20} y={13} width={9} height={8} rx={1} fill="#58CC02" />
      <rect x={4} y={29} width={2} height={5} fill="#374151" />
      <circle cx={14} cy={35} r={3.5} fill="#111827" />
      <circle cx={28} cy={35} r={3.5} fill="#111827" />
    </>,
  )

const IconKleinlasterGruen: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={5} y={20} width={14} height={13} rx={2} fill="#58CC02" />
      <rect x={19} y={24} width={16} height={9} rx={1.5} fill="#374151" />
      <rect x={8} y={23} width={6} height={5} rx={1} fill="#F9FAFB" />
      <circle cx={13} cy={35} r={3.5} fill="#111827" />
      <circle cx={28} cy={35} r={3.5} fill="#111827" />
    </>,
  )

// ── Gebäude & Hof-Deko ───────────────────────────────────────────────────────

const IconLagerhalle: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="24,8 42,20 6,20" fill="#4B5563" />
      <rect x={8} y={20} width={32} height={18} fill="#374151" />
      <rect x={19} y={26} width={10} height={12} fill="#111827" />
      <rect x={11} y={24} width={5} height={5} fill="#1CB0F6" opacity={0.7} />
      <rect x={32} y={24} width={5} height={5} fill="#1CB0F6" opacity={0.7} />
    </>,
  )

const IconBuerogebaeude: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={13} y={7} width={22} height={31} fill="#1F2937" stroke="#4B5563" strokeWidth={1.5} />
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={17 + col * 6}
            y={11 + row * 6}
            width={3.5}
            height={3.5}
            fill="#FFD700"
            opacity={0.8}
          />
        )),
      )}
    </>,
  )

const IconHoftor: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={7} y={10} width={3} height={28} fill="#374151" />
      <rect x={38} y={10} width={3} height={28} fill="#374151" />
      <rect x={10} y={20} width={28} height={3} fill="#9CA3AF" />
      <rect x={10} y={28} width={28} height={3} fill="#9CA3AF" />
      <rect x={6} y={7} width={4} height={4} fill="#FFD700" />
      <rect x={38} y={7} width={4} height={4} fill="#FFD700" />
    </>,
  )

const IconFahnenmast: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={22} y={6} width={2} height={34} fill="#9CA3AF" />
      <polygon points="24,8 40,13 24,18" fill="#FF9600" />
      <ellipse cx={24} cy={41} rx={7} ry={2} fill="#374151" />
    </>,
  )

const IconStrassenlaterne: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={22} y={16} width={2.5} height={24} fill="#4B5563" />
      <ellipse cx={23} cy={41} rx={6} ry={2} fill="#374151" />
      <path d="M23 16 L23 8" stroke="#4B5563" strokeWidth={2.5} />
      <circle cx={23} cy={8} r={6} fill="#FFD700" opacity={0.9} />
      <circle cx={23} cy={8} r={9} fill="#FFD700" opacity={0.25} />
    </>,
  )

const IconAmpel: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={21} y={24} width={3} height={16} fill="#4B5563" />
      <ellipse cx={22.5} cy={40} rx={6} ry={2} fill="#374151" />
      <rect x={15} y={6} width={15} height={21} rx={4} fill="#1F2937" stroke="#374151" strokeWidth={1.5} />
      <circle cx={22.5} cy={11.5} r={3} fill="#FF4B4B" />
      <circle cx={22.5} cy={16.5} r={3} fill="#FFD700" />
      <circle cx={22.5} cy={21.5} r={3} fill="#58CC02" />
    </>,
  )

const IconWachhund: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M12 38 Q10 26 18 23 Q16 18 20 15 Q22 19 24 19 Q27 19 28 14 Q33 17 30 23 Q38 25 36 38 Z" fill="#C19660" />
      <polygon points="18,15 14,9 21,13" fill="#8A6540" />
      <polygon points="29,13 33,7 31,14" fill="#8A6540" />
      <circle cx={21.5} cy={20} r={1.3} fill="#111827" />
      <rect x={14} y={33} width={20} height={3} rx={1.5} fill="#FF4B4B" />
      <path d="M36 32 Q41 34 39 38" stroke="#C19660" strokeWidth={3} fill="none" strokeLinecap="round" />
    </>,
  )

// ── Ladung & Ausstattung ─────────────────────────────────────────────────────

const IconEuropalette: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={6} y={14} width={36} height={4} fill="#D2A679" />
      <rect x={6} y={20} width={36} height={4} fill="#C19660" />
      <rect x={6} y={26} width={36} height={4} fill="#D2A679" />
      <rect x={9} y={14} width={4} height={16} fill="#8A6540" />
      <rect x={22} y={14} width={4} height={16} fill="#8A6540" />
      <rect x={35} y={14} width={4} height={16} fill="#8A6540" />
    </>,
  )

const IconContainer: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={6} y={13} width={36} height={20} rx={1.5} fill="#1CB0F6" />
      {[17, 21, 25, 29].map((y) => (
        <rect key={y} x={6} y={y} width={36} height={1.5} fill="#111827" opacity={0.15} />
      ))}
      <rect x={36} y={16} width={5} height={14} fill="#FF9600" />
      <circle cx={38.5} cy={23} r={1} fill="#111827" />
    </>,
  )

const IconKiste: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={9} y={16} width={30} height={20} fill="#C19660" stroke="#8A6540" strokeWidth={1.5} />
      <path d="M9 16 L39 36 M39 16 L9 36" stroke="#8A6540" strokeWidth={1.5} />
    </>,
  )

const IconSchutzhelm: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M10 28 a14 14 0 0 1 28 0 z" fill="#FFD700" />
      <rect x={8} y={27} width={32} height={4} rx={2} fill="#e6c200" />
      <rect x={22} y={10} width={4} height={8} rx={1.5} fill="#e6c200" />
    </>,
  )

const IconSackkarre: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M12 10 L12 32 L28 32" stroke="#9CA3AF" strokeWidth={3} fill="none" />
      <rect x={16} y={32} width={16} height={3} fill="#9CA3AF" />
      <circle cx={14} cy={38} r={4} fill="#111827" />
      <circle cx={14} cy={38} r={1.6} fill="#9CA3AF" />
      <rect x={28} y={18} width={9} height={14} fill="#C19660" />
    </>,
  )

// ── Abzeichen & Trophäen ─────────────────────────────────────────────────────

const IconPokal: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M16 10 h16 v10 a8 8 0 0 1 -16 0 z" fill="#FFD700" />
      <path d="M16 12 h-6 a6 6 0 0 0 6 8 z" fill="#FFD700" opacity={0.8} />
      <path d="M32 12 h6 a6 6 0 0 1 -6 8 z" fill="#FFD700" opacity={0.8} />
      <rect x={22} y={28} width={4} height={6} fill="#e6c200" />
      <rect x={16} y={34} width={16} height={4} rx={1.5} fill="#e6c200" />
    </>,
  )

const IconMedaille: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M18 6 L24 20 L30 6" stroke="#FF4B4B" strokeWidth={5} fill="none" />
      <circle cx={24} cy={28} r={11} fill="#FFD700" />
      <polygon
        points="24,21 26,26.5 32,26.5 27,30 29,36 24,32.5 19,36 21,30 16,26.5 22,26.5"
        fill="#e6c200"
      />
    </>,
  )

const IconSchildAbzeichen: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M24 6 L38 11 V23 C38 32 32 38 24 42 C16 38 10 32 10 23 V11 Z" fill="#1CB0F6" />
      <polygon points="24,16 26.2,21.5 32,21.5 27.3,25 29,30.5 24,27 19,30.5 20.7,25 16,21.5 21.8,21.5" fill="#F9FAFB" />
    </>,
  )

const IconSternAbzeichen: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon
        points="24,5 29,18 43,18 32,27 36,41 24,33 12,41 16,27 5,18 19,18"
        fill="#FFD700"
      />
    </>,
  )

const IconKrone: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="8,30 12,14 20,24 24,12 28,24 36,14 40,30" fill="#FFD700" />
      <rect x={8} y={30} width={32} height={6} rx={1.5} fill="#e6c200" />
      <circle cx={12} cy={14} r={2.2} fill="#FF4B4B" />
      <circle cx={24} cy={12} r={2.2} fill="#58CC02" />
      <circle cx={36} cy={14} r={2.2} fill="#1CB0F6" />
    </>,
  )

// ── PROJ-32: Erweiterung auf mind. 8 je Kategorie ───────────────────────────

const IconKuehltransporter: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={3} y={14} width={26} height={19} rx={2} fill="#F9FAFB" />
      <rect x={29} y={20} width={14} height={13} rx={2} fill="#1CB0F6" />
      <rect x={32} y={23} width={7} height={5} rx={1} fill="#F9FAFB" />
      <path d="M16 18 V29 M10.5 21 L21.5 26 M10.5 26 L21.5 21" stroke="#1CB0F6" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={11} cy={35} r={4} fill="#111827" />
      <circle cx={11} cy={35} r={1.6} fill="#9CA3AF" />
      <circle cx={35} cy={35} r={4} fill="#111827" />
      <circle cx={35} cy={35} r={1.6} fill="#9CA3AF" />
    </>,
  )

const IconLieferwagenGelb: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M4 33 V16 Q4 13 7 13 H28 L40 24 V33 Z" fill="#FFD700" />
      <path d="M30 16 L37 24 H30 Z" fill="#1CB0F6" />
      <rect x={8} y={17} width={14} height={8} rx={1} fill="#111827" opacity={0.18} />
      <rect x={4} y={29} width={36} height={2.5} fill="#B8860B" opacity={0.6} />
      <circle cx={13} cy={35} r={4} fill="#111827" />
      <circle cx={13} cy={35} r={1.6} fill="#9CA3AF" />
      <circle cx={32} cy={35} r={4} fill="#111827" />
      <circle cx={32} cy={35} r={1.6} fill="#9CA3AF" />
    </>,
  )

const IconTieflader: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={4} y={22} width={12} height={12} rx={2} fill="#FF9600" />
      <rect x={6} y={24} width={6} height={5} rx={1} fill="#1CB0F6" />
      <rect x={16} y={30} width={28} height={4} rx={1} fill="#4B5563" />
      <rect x={20} y={20} width={20} height={10} rx={1.5} fill="#58CC02" />
      <rect x={24} y={14} width={10} height={6} rx={1} fill="#3E9A00" />
      <circle cx={10} cy={36} r={3.5} fill="#111827" />
      <circle cx={28} cy={37} r={3} fill="#111827" />
      <circle cx={38} cy={37} r={3} fill="#111827" />
    </>,
  )

const IconTankstelle: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={10} y={8} width={20} height={32} rx={3} fill="#FF4B4B" />
      <rect x={14} y={12} width={12} height={9} rx={1.5} fill="#111827" />
      <rect x={16} y={14} width={8} height={2.4} rx={1} fill="#58CC02" />
      <path d="M30 16 H35 Q38 16 38 19 V32 Q38 35 41 35" fill="none" stroke="#9CA3AF" strokeWidth={2.2} strokeLinecap="round" />
      <rect x={39} y={33} width={5} height={5} rx={1.5} fill="#374151" />
      <rect x={6} y={40} width={28} height={3} rx={1} fill="#4B5563" />
    </>,
  )

const IconFass: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M12 8 H36 Q40 24 36 40 H12 Q8 24 12 8 Z" fill="#B45309" />
      <rect x={10} y={14} width={28} height={3.5} rx={1} fill="#9CA3AF" />
      <rect x={10} y={30.5} width={28} height={3.5} rx={1} fill="#9CA3AF" />
      <path d="M17 8 V40 M24 8 V40 M31 8 V40" stroke="#111827" strokeWidth={0.8} opacity={0.3} />
      <ellipse cx={24} cy={8} rx={12} ry={3} fill="#D97706" />
    </>,
  )

const IconGitterbox: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={7} y={10} width={34} height={28} rx={1.5} fill="none" stroke="#9CA3AF" strokeWidth={2.4} />
      <path d="M7 19 H41 M7 28 H41 M16 10 V38 M24 10 V38 M32 10 V38" stroke="#9CA3AF" strokeWidth={1.2} />
      <rect x={11} y={21} width={10} height={8} rx={1} fill="#FF9600" />
      <rect x={24} y={24} width={12} height={9} rx={1} fill="#1CB0F6" />
      <rect x={6} y={38} width={36} height={4} rx={1} fill="#8B5A2B" />
    </>,
  )

const IconWarnweste: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M14 6 L20 6 L24 14 L28 6 L34 6 L40 14 L37 41 H11 L8 14 Z" fill="#FF9600" />
      <path d="M20 6 L24 14 L28 6" fill="#111827" opacity={0.35} />
      <rect x={10} y={26} width={28} height={4} fill="#F9FAFB" />
      <rect x={9.5} y={33} width={29} height={4} fill="#F9FAFB" />
      <path d="M17 14 V41 M31 14 V41" stroke="#F9FAFB" strokeWidth={3} />
    </>,
  )

const IconLorbeerkranz: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M24 42 C10 38 6 24 11 12" fill="none" stroke="#58CC02" strokeWidth={3} strokeLinecap="round" />
      <path d="M24 42 C38 38 42 24 37 12" fill="none" stroke="#58CC02" strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={9} cy={30} rx={4} ry={2.2} fill="#58CC02" transform="rotate(-50 9 30)" />
      <ellipse cx={8} cy={21} rx={4} ry={2.2} fill="#58CC02" transform="rotate(-20 8 21)" />
      <ellipse cx={39} cy={30} rx={4} ry={2.2} fill="#58CC02" transform="rotate(50 39 30)" />
      <ellipse cx={40} cy={21} rx={4} ry={2.2} fill="#58CC02" transform="rotate(20 40 21)" />
      <path d="M24 12 L27 20 L35 20.6 L29 25.6 L31 33.6 L24 29 L17 33.6 L19 25.6 L13 20.6 L21 20 Z" fill="#FFD700" />
    </>,
  )

const IconUrkundeSped: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={6} y={8} width={36} height={26} rx={2} fill="#F9FAFB" />
      <rect x={6} y={8} width={36} height={26} rx={2} fill="none" stroke="#FFD700" strokeWidth={2} />
      <rect x={13} y={14} width={22} height={2.5} rx={1} fill="#374151" />
      <rect x={16} y={19} width={16} height={2} rx={1} fill="#9CA3AF" />
      <rect x={13} y={24} width={10} height={4} rx={1} fill="#4B5563" />
      <circle cx={33} cy={34} r={5} fill="#58CC02" />
      <polygon points="30,37 28,45 33,42 38,45 36,37" fill="#58CC02" />
    </>,
  )

const IconBlitzAbzeichen: IconComponent = (props) =>
  base(
    props,
    <>
      <circle cx={24} cy={24} r={19} fill="#58CC02" />
      <circle cx={24} cy={24} r={15} fill="#111827" opacity={0.25} />
      <polygon points="27,6 14,26 22,26 19,42 34,20 25,20" fill="#FFD700" />
    </>,
  )

// ── Icon-Sets je Fachbereichs-Code ───────────────────────────────────────────

const SPED_ICONS: HofIconDef[] = [
  { key: 'sattelschlepper-rot', label: 'Roter Sattelschlepper', category: 'fahrzeuge', Svg: IconSattelschlepperRot },
  { key: 'transporter-blau', label: 'Blauer Transporter', category: 'fahrzeuge', Svg: IconTransporterBlau },
  { key: 'gabelstapler', label: 'Gabelstapler', category: 'fahrzeuge', Svg: IconGabelstapler },
  { key: 'anhaenger', label: 'Beladener Anhänger', category: 'fahrzeuge', Svg: IconAnhaenger },
  { key: 'kleinlaster-gruen', label: 'Grüner Kleinlaster', category: 'fahrzeuge', Svg: IconKleinlasterGruen },
  { key: 'kuehltransporter', label: 'Kühltransporter', category: 'fahrzeuge', Svg: IconKuehltransporter },
  { key: 'lieferwagen-gelb', label: 'Gelber Lieferwagen', category: 'fahrzeuge', Svg: IconLieferwagenGelb },
  { key: 'tieflader', label: 'Tieflader', category: 'fahrzeuge', Svg: IconTieflader },

  { key: 'lagerhalle', label: 'Lagerhalle', category: 'gebaeude_deko', Svg: IconLagerhalle },
  { key: 'buerogebaeude', label: 'Bürogebäude', category: 'gebaeude_deko', Svg: IconBuerogebaeude },
  { key: 'hoftor', label: 'Hoftor', category: 'gebaeude_deko', Svg: IconHoftor },
  { key: 'fahnenmast', label: 'Fahnenmast', category: 'gebaeude_deko', Svg: IconFahnenmast },
  { key: 'strassenlaterne', label: 'Straßenlaterne', category: 'gebaeude_deko', Svg: IconStrassenlaterne },
  { key: 'ampel', label: 'Ampel-Deko', category: 'gebaeude_deko', Svg: IconAmpel },
  { key: 'wachhund', label: 'Wachhund', category: 'gebaeude_deko', Svg: IconWachhund },
  { key: 'tankstelle', label: 'Tankstelle', category: 'gebaeude_deko', Svg: IconTankstelle },

  { key: 'europalette', label: 'Europalette', category: 'ladung_ausstattung', Svg: IconEuropalette },
  { key: 'container', label: 'Container', category: 'ladung_ausstattung', Svg: IconContainer },
  { key: 'kiste', label: 'Holzkiste', category: 'ladung_ausstattung', Svg: IconKiste },
  { key: 'schutzhelm', label: 'Schutzhelm', category: 'ladung_ausstattung', Svg: IconSchutzhelm },
  { key: 'sackkarre', label: 'Sackkarre', category: 'ladung_ausstattung', Svg: IconSackkarre },
  { key: 'fass', label: 'Fass', category: 'ladung_ausstattung', Svg: IconFass },
  { key: 'gitterbox', label: 'Gitterbox', category: 'ladung_ausstattung', Svg: IconGitterbox },
  { key: 'warnweste', label: 'Warnweste', category: 'ladung_ausstattung', Svg: IconWarnweste },

  { key: 'pokal', label: 'Pokal', category: 'abzeichen_trophaeen', Svg: IconPokal },
  { key: 'medaille', label: 'Medaille', category: 'abzeichen_trophaeen', Svg: IconMedaille },
  { key: 'schild-abzeichen', label: 'Schild-Abzeichen', category: 'abzeichen_trophaeen', Svg: IconSchildAbzeichen },
  { key: 'stern-abzeichen', label: 'Stern-Abzeichen', category: 'abzeichen_trophaeen', Svg: IconSternAbzeichen },
  { key: 'krone', label: 'Krone', category: 'abzeichen_trophaeen', Svg: IconKrone },
  { key: 'lorbeerkranz', label: 'Lorbeerkranz', category: 'abzeichen_trophaeen', Svg: IconLorbeerkranz },
  { key: 'urkunde-sped', label: 'Urkunde', category: 'abzeichen_trophaeen', Svg: IconUrkundeSped },
  { key: 'blitz-abzeichen', label: 'Blitz-Abzeichen', category: 'abzeichen_trophaeen', Svg: IconBlitzAbzeichen },
]

const ICON_SETS: Record<string, HofIconDef[]> = {
  SPED: SPED_ICONS,
  TOUR: TOUR_ICONS,
}

export function getHofIconSet(departmentCode: string): HofIconDef[] {
  return ICON_SETS[departmentCode] ?? []
}

export function getHofIconsByCategory(departmentCode: string, category: HofCategory): HofIconDef[] {
  return getHofIconSet(departmentCode).filter((i) => i.category === category)
}

export function resolveHofIcon(departmentCode: string, iconKey: string | null | undefined): HofIconDef | null {
  if (!iconKey) return null
  return getHofIconSet(departmentCode).find((i) => i.key === iconKey) ?? null
}

export function isHofCategory(value: string): value is HofCategory {
  return HOF_CATEGORIES.some((c) => c.value === value)
}

/** Serverseitige Prüfung (PROJ-26): gehört dieser Icon-Schlüssel wirklich zur angegebenen Kategorie im Icon-Set dieses Fachbereichs? */
export function iconKeyBelongsToCategory(departmentCode: string, category: HofCategory, iconKey: string): boolean {
  return getHofIconsByCategory(departmentCode, category).some((i) => i.key === iconKey)
}
