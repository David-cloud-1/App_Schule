import type { SVGProps } from 'react'
import type { HofIconDef } from './hof-icons'
import { RESORT_NEU } from './hof-welt/resort-weich'
import { RESORT_DEKO } from './hof-welt/resort-deko'
import { RESORT_TIERE } from './hof-welt/figuren'
import { iconsAusSprites } from './hof-icons-sprite'

/**
 * Tourismus-Grafikset (PROJ-31) — handgefertigte Inline-SVG-Illustrationen
 * im selben Stil wie das Spedition-Set (48x48, Palette aus docs/DESIGN.md,
 * auf dunklem Hintergrund erkennbar). Kein Bild-Upload, kein externer Dienst.
 *
 * Eigene Datei, damit hof-icons.tsx übersichtlich bleibt; die Typen kommen
 * nur als `import type` (kein Laufzeit-Zyklus).
 */

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element

function base(props: SVGProps<SVGSVGElement>, children: React.ReactNode) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  )
}

// ── Verkehrsmittel ───────────────────────────────────────────────────────────

const IconFlugzeug: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={6} y={21} width={36} height={7} rx={3.5} fill="#F9FAFB" />
      <polygon points="22,22 30,22 24,8 18,8" fill="#9CA3AF" />
      <polygon points="22,27 30,27 24,41 18,41" fill="#9CA3AF" />
      <polygon points="6,21 6,13 11,21" fill="#1CB0F6" />
      <circle cx={36} cy={24} r={1.2} fill="#1CB0F6" />
      <circle cx={31} cy={24} r={1.2} fill="#1CB0F6" />
      <circle cx={26} cy={24} r={1.2} fill="#1CB0F6" />
    </>,
  )

const IconReisebus: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={4} y={14} width={40} height={20} rx={4} fill="#FF9600" />
      <rect x={8} y={18} width={7} height={7} rx={1} fill="#1CB0F6" />
      <rect x={17} y={18} width={7} height={7} rx={1} fill="#1CB0F6" />
      <rect x={26} y={18} width={7} height={7} rx={1} fill="#1CB0F6" />
      <rect x={36} y={18} width={5} height={10} rx={1} fill="#111827" opacity={0.35} />
      <circle cx={14} cy={35} r={4} fill="#111827" />
      <circle cx={14} cy={35} r={1.6} fill="#9CA3AF" />
      <circle cx={34} cy={35} r={4} fill="#111827" />
      <circle cx={34} cy={35} r={1.6} fill="#9CA3AF" />
    </>,
  )

const IconZug: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={9} y={8} width={30} height={26} rx={7} fill="#FF4B4B" />
      <rect x={13} y={13} width={22} height={10} rx={2} fill="#1CB0F6" />
      <circle cx={17} cy={28} r={2} fill="#FFD700" />
      <circle cx={31} cy={28} r={2} fill="#FFD700" />
      <rect x={6} y={37} width={36} height={3} rx={1.5} fill="#4B5563" />
      <rect x={14} y={34} width={4} height={4} fill="#374151" />
      <rect x={30} y={34} width={4} height={4} fill="#374151" />
    </>,
  )

const IconKreuzfahrtschiff: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="4,30 44,30 38,40 10,40" fill="#F9FAFB" />
      <rect x={10} y={21} width={28} height={9} rx={1.5} fill="#1CB0F6" />
      <rect x={16} y={14} width={16} height={7} rx={1.5} fill="#9CA3AF" />
      <rect x={28} y={7} width={4} height={8} fill="#FF4B4B" />
      <circle cx={14} cy={25} r={1.2} fill="#F9FAFB" />
      <circle cx={20} cy={25} r={1.2} fill="#F9FAFB" />
      <circle cx={26} cy={25} r={1.2} fill="#F9FAFB" />
      <circle cx={32} cy={25} r={1.2} fill="#F9FAFB" />
      <path d="M2 43 Q8 40 14 43 T26 43 T38 43 T46 43" fill="none" stroke="#1CB0F6" strokeWidth={2} />
    </>,
  )

const IconMietwagen: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M5 30 L9 21 Q10 19 13 19 H31 Q34 19 36 21 L41 30 V34 H5 Z" fill="#58CC02" />
      <path d="M13 21 H21 V28 H10 Z" fill="#1CB0F6" />
      <path d="M24 21 H31 L35 28 H24 Z" fill="#1CB0F6" />
      <circle cx={14} cy={35} r={4} fill="#111827" />
      <circle cx={14} cy={35} r={1.6} fill="#9CA3AF" />
      <circle cx={33} cy={35} r={4} fill="#111827" />
      <circle cx={33} cy={35} r={1.6} fill="#9CA3AF" />
    </>,
  )

const IconHeissluftballon: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M24 5 C12 5 9 15 12 22 C14 26 18 29 24 31 C30 29 34 26 36 22 C39 15 36 5 24 5 Z" fill="#FF4B4B" />
      <path d="M24 5 C19 9 18 22 24 31 C30 22 29 9 24 5 Z" fill="#FFD700" />
      <line x1={19} y1={30} x2={20} y2={36} stroke="#9CA3AF" strokeWidth={1.2} />
      <line x1={29} y1={30} x2={28} y2={36} stroke="#9CA3AF" strokeWidth={1.2} />
      <rect x={18} y={36} width={12} height={7} rx={1.5} fill="#B45309" />
    </>,
  )

// ── Hotels & Reise-Deko ──────────────────────────────────────────────────────

const IconHotel: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={10} y={8} width={28} height={32} rx={2} fill="#374151" />
      <rect x={13} y={12} width={5} height={5} rx={0.8} fill="#FFD700" />
      <rect x={21.5} y={12} width={5} height={5} rx={0.8} fill="#FFD700" />
      <rect x={30} y={12} width={5} height={5} rx={0.8} fill="#FFD700" />
      <rect x={13} y={20} width={5} height={5} rx={0.8} fill="#FFD700" />
      <rect x={21.5} y={20} width={5} height={5} rx={0.8} fill="#9CA3AF" />
      <rect x={30} y={20} width={5} height={5} rx={0.8} fill="#FFD700" />
      <rect x={20} y={30} width={8} height={10} rx={1} fill="#111827" />
      <rect x={14} y={4} width={20} height={4} rx={1} fill="#FF4B4B" />
    </>,
  )

const IconReisebuero: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={6} y={18} width={36} height={22} rx={2} fill="#374151" />
      <path d="M4 18 H44 L41 10 H7 Z" fill="#1CB0F6" />
      <path d="M7 10 L9 18 M15 10 L16 18 M23 10 L23 18 M31 10 L30 18 M39 10 L38 18" stroke="#F9FAFB" strokeWidth={1.4} />
      <rect x={10} y={23} width={14} height={10} rx={1} fill="#111827" />
      <circle cx={17} cy={28} r={3} fill="#58CC02" />
      <rect x={29} y={26} width={8} height={14} rx={1} fill="#111827" />
    </>,
  )

const IconPalme: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M23 42 C23 34 25 26 24 19 L27 19 C28 26 27 34 28 42 Z" fill="#B45309" />
      <path d="M25 19 C16 15 10 17 7 22 C14 19 20 20 25 22 Z" fill="#58CC02" />
      <path d="M25 19 C34 15 40 17 43 22 C36 19 30 20 25 22 Z" fill="#58CC02" />
      <path d="M25 19 C21 11 15 9 10 11 C17 12 21 16 25 22 Z" fill="#3E9A00" />
      <path d="M25 19 C29 11 35 9 40 11 C33 12 29 16 25 22 Z" fill="#3E9A00" />
      <circle cx={24} cy={21} r={1.8} fill="#B45309" />
      <rect x={14} y={41} width={20} height={3} rx={1.5} fill="#FFD700" />
    </>,
  )

const IconLeuchtturm: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="19,40 29,40 27,16 21,16" fill="#F9FAFB" />
      <polygon points="20.2,28 27.8,28 27.3,22 20.7,22" fill="#FF4B4B" />
      <rect x={20} y={11} width={8} height={5} rx={1} fill="#FFD700" />
      <polygon points="19,11 24,6 29,11" fill="#FF4B4B" />
      <rect x={14} y={40} width={20} height={3} rx={1} fill="#4B5563" />
      <polygon points="29,12 42,8 42,16" fill="#FFD700" opacity={0.35} />
    </>,
  )

const IconFlughafenTower: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="21,40 27,40 26,24 22,24" fill="#9CA3AF" />
      <polygon points="14,14 34,14 31,24 17,24" fill="#1CB0F6" />
      <rect x={13} y={11} width={22} height={4} rx={1} fill="#374151" />
      <line x1={24} y1={11} x2={24} y2={4} stroke="#9CA3AF" strokeWidth={1.5} />
      <circle cx={24} cy={4} r={1.5} fill="#FF4B4B" />
      <rect x={12} y={40} width={24} height={3} rx={1} fill="#4B5563" />
    </>,
  )

const IconSonnenschirm: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M5 24 C5 12 15 7 24 7 C33 7 43 12 43 24 Z" fill="#FF4B4B" />
      <path d="M24 7 C20 11 19 18 20 24 H28 C29 18 28 11 24 7 Z" fill="#F9FAFB" />
      <rect x={23} y={24} width={2} height={17} fill="#B45309" />
      <path d="M8 44 C14 40 34 40 40 44 Z" fill="#FFD700" />
    </>,
  )

// ── Reiseausstattung ─────────────────────────────────────────────────────────

const IconKoffer: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={9} y={14} width={30} height={25} rx={4} fill="#FF9600" />
      <path d="M18 14 V10 Q18 8 20 8 H28 Q30 8 30 10 V14" fill="none" stroke="#9CA3AF" strokeWidth={2} />
      <rect x={9} y={24} width={30} height={2.5} fill="#111827" opacity={0.3} />
      <rect x={21} y={22} width={6} height={6} rx={1} fill="#FFD700" />
      <rect x={14} y={39} width={4} height={3} rx={1} fill="#374151" />
      <rect x={30} y={39} width={4} height={3} rx={1} fill="#374151" />
    </>,
  )

const IconGlobus: IconComponent = (props) =>
  base(
    props,
    <>
      <circle cx={24} cy={21} r={14} fill="#1CB0F6" />
      <path d="M15 17 Q19 12 24 15 Q22 20 17 22 Q14 21 15 17 Z" fill="#58CC02" />
      <path d="M27 24 Q33 22 35 27 Q32 33 28 31 Q26 28 27 24 Z" fill="#58CC02" />
      <path d="M12 40 H36" stroke="#9CA3AF" strokeWidth={3} strokeLinecap="round" />
      <path d="M24 35 V40" stroke="#9CA3AF" strokeWidth={2.5} />
    </>,
  )

const IconReisefuehrer: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={11} y={6} width={26} height={35} rx={2.5} fill="#1CB0F6" />
      <rect x={11} y={6} width={4} height={35} rx={2} fill="#0E7FB8" />
      <circle cx={26} cy={19} r={7} fill="#F9FAFB" />
      <path d="M26 14 V24 M21 19 H31" stroke="#1CB0F6" strokeWidth={1.4} />
      <rect x={18} y={30} width={14} height={2.5} rx={1} fill="#F9FAFB" />
      <rect x={18} y={34} width={9} height={2} rx={1} fill="#F9FAFB" opacity={0.7} />
    </>,
  )

const IconRucksack: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={12} y={12} width={24} height={29} rx={8} fill="#58CC02" />
      <path d="M17 12 Q17 6 24 6 Q31 6 31 12" fill="none" stroke="#3E9A00" strokeWidth={2.4} />
      <rect x={16} y={26} width={16} height={11} rx={3} fill="#3E9A00" />
      <rect x={21} y={29} width={6} height={2.5} rx={1} fill="#FFD700" />
      <rect x={18} y={17} width={12} height={2.5} rx={1} fill="#111827" opacity={0.3} />
    </>,
  )

const IconKompass: IconComponent = (props) =>
  base(
    props,
    <>
      <circle cx={24} cy={24} r={17} fill="#374151" />
      <circle cx={24} cy={24} r={14} fill="#111827" />
      <polygon points="24,11 28,24 24,22 20,24" fill="#FF4B4B" />
      <polygon points="24,37 20,24 24,26 28,24" fill="#F9FAFB" />
      <circle cx={24} cy={24} r={1.8} fill="#FFD700" />
      <circle cx={24} cy={9.5} r={1} fill="#F9FAFB" />
      <circle cx={38.5} cy={24} r={1} fill="#F9FAFB" />
      <circle cx={24} cy={38.5} r={1} fill="#F9FAFB" />
      <circle cx={9.5} cy={24} r={1} fill="#F9FAFB" />
    </>,
  )

const IconBordkarte: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={5} y={12} width={38} height={24} rx={3} fill="#F9FAFB" />
      <rect x={5} y={12} width={38} height={7} rx={3} fill="#1CB0F6" />
      <line x1={31} y1={19} x2={31} y2={36} stroke="#9CA3AF" strokeWidth={1.4} strokeDasharray="2 2" />
      <rect x={9} y={23} width={14} height={2.5} rx={1} fill="#374151" />
      <rect x={9} y={28} width={9} height={2.5} rx={1} fill="#9CA3AF" />
      <rect x={34} y={23} width={6} height={9} rx={1} fill="#111827" opacity={0.75} />
    </>,
  )

// ── Abzeichen & Trophäen ─────────────────────────────────────────────────────

const IconWeltreisePokal: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M14 8 H34 V20 C34 27 29 31 24 31 C19 31 14 27 14 20 Z" fill="#FFD700" />
      <path d="M14 11 H8 C8 18 11 21 15 21 M34 11 H40 C40 18 37 21 33 21" fill="none" stroke="#FFD700" strokeWidth={2.4} />
      <rect x={21.5} y={31} width={5} height={6} fill="#FFD700" />
      <rect x={15} y={37} width={18} height={5} rx={1.5} fill="#B8860B" />
      <circle cx={24} cy={19} r={5} fill="#1CB0F6" />
      <path d="M21 18 Q24 15 27 18 Q25 21 22 21 Z" fill="#58CC02" />
    </>,
  )

const IconGoldMedaille: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="14,4 22,4 25,18 18,20" fill="#FF4B4B" />
      <polygon points="34,4 26,4 23,18 30,20" fill="#1CB0F6" />
      <circle cx={24} cy={30} r={12} fill="#FFD700" />
      <circle cx={24} cy={30} r={8.5} fill="#B8860B" opacity={0.35} />
      <path d="M24 24 L25.8 28.4 L30.5 28.7 L26.9 31.7 L28.1 36.3 L24 33.7 L19.9 36.3 L21.1 31.7 L17.5 28.7 L22.2 28.4 Z" fill="#FFD700" />
    </>,
  )

const IconReisepass: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={10} y={5} width={28} height={38} rx={3} fill="#1F6FEB" />
      <rect x={10} y={5} width={4} height={38} rx={2} fill="#1855B8" />
      <circle cx={25} cy={22} r={8} fill="none" stroke="#FFD700" strokeWidth={1.8} />
      <path d="M17 22 H33 M25 14 V30 M19.5 17 Q25 22 19.5 27 M30.5 17 Q25 22 30.5 27" stroke="#FFD700" strokeWidth={1.2} fill="none" />
      <rect x={18} y={34} width={14} height={2.5} rx={1} fill="#FFD700" />
    </>,
  )

const IconGlobetrotterStern: IconComponent = (props) =>
  base(
    props,
    <>
      <circle cx={24} cy={24} r={19} fill="#1CB0F6" opacity={0.25} />
      <path d="M24 6 L29.4 17.8 L42 19.4 L32.7 28 L35.2 40.6 L24 34.4 L12.8 40.6 L15.3 28 L6 19.4 L18.6 17.8 Z" fill="#FFD700" />
      <circle cx={24} cy={24} r={5} fill="#FF9600" />
    </>,
  )

const IconWimpel: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={11} y={5} width={3} height={38} rx={1.5} fill="#9CA3AF" />
      <polygon points="14,7 42,15 14,23" fill="#58CC02" />
      <polygon points="14,7 28,11 14,15" fill="#F9FAFB" opacity={0.9} />
      <circle cx={12.5} cy={5} r={2.2} fill="#FFD700" />
      <rect x={6} y={41} width={14} height={3} rx={1.5} fill="#4B5563" />
    </>,
  )

const IconUrkunde: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={7} y={9} width={34} height={24} rx={2} fill="#F9FAFB" />
      <rect x={7} y={9} width={34} height={24} rx={2} fill="none" stroke="#FFD700" strokeWidth={2} />
      <rect x={13} y={15} width={22} height={2.5} rx={1} fill="#374151" />
      <rect x={16} y={20} width={16} height={2} rx={1} fill="#9CA3AF" />
      <rect x={16} y={24} width={12} height={2} rx={1} fill="#9CA3AF" />
      <circle cx={34} cy={34} r={5} fill="#FF4B4B" />
      <polygon points="31,37 29,45 34,42 39,45 37,37" fill="#FF4B4B" />
    </>,
  )

// ── PROJ-32: Erweiterung auf mind. 8 je Kategorie ───────────────────────────

const IconSegelboot: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="23,6 23,30 8,30" fill="#F9FAFB" />
      <polygon points="26,12 26,30 38,30" fill="#1CB0F6" />
      <rect x={22.5} y={5} width={1.8} height={27} fill="#9CA3AF" />
      <path d="M6 32 H42 L37 40 H11 Z" fill="#FF4B4B" />
      <path d="M2 44 Q8 41 14 44 T26 44 T38 44 T46 44" fill="none" stroke="#1CB0F6" strokeWidth={2} />
    </>,
  )

const IconSeilbahn: IconComponent = (props) =>
  base(
    props,
    <>
      <line x1={2} y1={10} x2={46} y2={6} stroke="#9CA3AF" strokeWidth={1.6} />
      <line x1={24} y1={8.3} x2={24} y2={18} stroke="#9CA3AF" strokeWidth={1.6} />
      <rect x={13} y={18} width={22} height={17} rx={3} fill="#FF9600" />
      <rect x={16} y={21} width={7} height={8} rx={1} fill="#1CB0F6" />
      <rect x={25} y={21} width={7} height={8} rx={1} fill="#1CB0F6" />
      <rect x={13} y={32} width={22} height={2.5} fill="#111827" opacity={0.3} />
      <polygon points="4,44 20,36 30,44" fill="#4B5563" />
      <polygon points="22,44 36,34 46,44" fill="#374151" />
    </>,
  )

const IconBerghuette: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="24,6 44,24 4,24" fill="#B45309" />
      <rect x={9} y={24} width={30} height={17} fill="#8B5A2B" />
      <rect x={20} y={29} width={8} height={12} rx={1} fill="#111827" />
      <rect x={11} y={28} width={6} height={6} rx={1} fill="#FFD700" />
      <rect x={31} y={28} width={6} height={6} rx={1} fill="#FFD700" />
      <rect x={31} y={9} width={5} height={9} fill="#4B5563" />
      <polygon points="14,15 24,6 34,15" fill="#F9FAFB" opacity={0.9} />
    </>,
  )

const IconZelt: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="24,8 44,40 4,40" fill="#58CC02" />
      <polygon points="24,8 33,40 15,40" fill="#3E9A00" />
      <polygon points="24,24 29,40 19,40" fill="#111827" />
      <line x1={24} y1={8} x2={24} y2={4} stroke="#9CA3AF" strokeWidth={1.6} />
      <polygon points="24,4 31,6 24,8" fill="#FF4B4B" />
      <rect x={2} y={40} width={44} height={3} rx={1.5} fill="#8B5A2B" />
    </>,
  )

const IconFotokamera: IconComponent = (props) =>
  base(
    props,
    <>
      <rect x={5} y={14} width={38} height={26} rx={5} fill="#374151" />
      <rect x={15} y={9} width={12} height={6} rx={2} fill="#4B5563" />
      <circle cx={24} cy={27} r={9} fill="#111827" />
      <circle cx={24} cy={27} r={6} fill="#1CB0F6" />
      <circle cx={21.5} cy={24.5} r={1.8} fill="#F9FAFB" opacity={0.8} />
      <circle cx={37} cy={19} r={1.8} fill="#FF4B4B" />
    </>,
  )

const IconSonnenbrille: IconComponent = (props) =>
  base(
    props,
    <>
      <path d="M5 20 H43" stroke="#111827" strokeWidth={3} strokeLinecap="round" />
      <rect x={5} y={20} width={16} height={12} rx={5} fill="#111827" />
      <rect x={27} y={20} width={16} height={12} rx={5} fill="#111827" />
      <path d="M21 23 Q24 20 27 23" fill="none" stroke="#111827" strokeWidth={2.4} />
      <path d="M8 23 L14 23 L10 29 Z" fill="#1CB0F6" opacity={0.5} />
      <path d="M30 23 L36 23 L32 29 Z" fill="#1CB0F6" opacity={0.5} />
      <path d="M5 21 L2 16 M43 21 L46 16" stroke="#111827" strokeWidth={2.4} strokeLinecap="round" />
    </>,
  )

const IconSilberMedaille: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="14,4 22,4 25,18 18,20" fill="#1CB0F6" />
      <polygon points="34,4 26,4 23,18 30,20" fill="#F9FAFB" />
      <circle cx={24} cy={30} r={12} fill="#D1D5DB" />
      <circle cx={24} cy={30} r={8.5} fill="#9CA3AF" opacity={0.5} />
      <path d="M20 26 H25 Q28 26 28 29 T25 32 H20 M20 32 V37" fill="none" stroke="#F9FAFB" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </>,
  )

const IconEhrenschleife: IconComponent = (props) =>
  base(
    props,
    <>
      <polygon points="15,26 9,44 17,40 22,44 24,28" fill="#FF4B4B" />
      <polygon points="33,26 39,44 31,40 26,44 24,28" fill="#1CB0F6" />
      <circle cx={24} cy={20} r={13} fill="#FFD700" />
      <circle cx={24} cy={20} r={9} fill="#FF9600" />
      <path d="M24 13 L26 18 L31 18.4 L27.2 21.6 L28.4 26.5 L24 23.8 L19.6 26.5 L20.8 21.6 L17 18.4 L22 18 Z" fill="#FFD700" />
    </>,
  )

// ── Tourismus-Set ────────────────────────────────────────────────────────────

export const TOUR_ICONS: HofIconDef[] = [
  { key: 'flugzeug', label: 'Flugzeug', category: 'fahrzeuge', Svg: IconFlugzeug },
  { key: 'reisebus', label: 'Reisebus', category: 'fahrzeuge', Svg: IconReisebus },
  { key: 'zug', label: 'Zug', category: 'fahrzeuge', Svg: IconZug },
  { key: 'kreuzfahrtschiff', label: 'Kreuzfahrtschiff', category: 'fahrzeuge', Svg: IconKreuzfahrtschiff },
  { key: 'mietwagen', label: 'Mietwagen', category: 'fahrzeuge', Svg: IconMietwagen },
  { key: 'heissluftballon', label: 'Heißluftballon', category: 'fahrzeuge', Svg: IconHeissluftballon },
  { key: 'segelboot', label: 'Segelboot', category: 'fahrzeuge', Svg: IconSegelboot },
  { key: 'seilbahn', label: 'Seilbahn', category: 'fahrzeuge', Svg: IconSeilbahn },

  { key: 'hotel', label: 'Strandhotel', category: 'gebaeude_deko', Svg: IconHotel },
  { key: 'reisebuero', label: 'Reisebüro', category: 'gebaeude_deko', Svg: IconReisebuero },
  { key: 'palme', label: 'Palme', category: 'gebaeude_deko', Svg: IconPalme },
  { key: 'leuchtturm', label: 'Leuchtturm', category: 'gebaeude_deko', Svg: IconLeuchtturm },
  { key: 'flughafen-tower', label: 'Flughafen-Tower', category: 'gebaeude_deko', Svg: IconFlughafenTower },
  { key: 'sonnenschirm', label: 'Sonnenschirm', category: 'gebaeude_deko', Svg: IconSonnenschirm },
  { key: 'berghuette', label: 'Berghütte', category: 'gebaeude_deko', Svg: IconBerghuette },
  { key: 'zelt', label: 'Zelt', category: 'gebaeude_deko', Svg: IconZelt },

  { key: 'koffer', label: 'Reisekoffer', category: 'ladung_ausstattung', Svg: IconKoffer },
  { key: 'globus', label: 'Globus', category: 'ladung_ausstattung', Svg: IconGlobus },
  { key: 'reisefuehrer', label: 'Reiseführer', category: 'ladung_ausstattung', Svg: IconReisefuehrer },
  { key: 'rucksack', label: 'Rucksack', category: 'ladung_ausstattung', Svg: IconRucksack },
  { key: 'kompass', label: 'Kompass', category: 'ladung_ausstattung', Svg: IconKompass },
  { key: 'bordkarte', label: 'Bordkarte', category: 'ladung_ausstattung', Svg: IconBordkarte },
  { key: 'fotokamera', label: 'Fotokamera', category: 'ladung_ausstattung', Svg: IconFotokamera },
  { key: 'sonnenbrille', label: 'Sonnenbrille', category: 'ladung_ausstattung', Svg: IconSonnenbrille },

  { key: 'weltreise-pokal', label: 'Weltreise-Pokal', category: 'abzeichen_trophaeen', Svg: IconWeltreisePokal },
  { key: 'gold-medaille', label: 'Goldmedaille', category: 'abzeichen_trophaeen', Svg: IconGoldMedaille },
  { key: 'reisepass', label: 'Reisepass', category: 'abzeichen_trophaeen', Svg: IconReisepass },
  { key: 'globetrotter-stern', label: 'Globetrotter-Stern', category: 'abzeichen_trophaeen', Svg: IconGlobetrotterStern },
  { key: 'wimpel', label: 'Wimpel', category: 'abzeichen_trophaeen', Svg: IconWimpel },
  { key: 'urkunde', label: 'Urkunde', category: 'abzeichen_trophaeen', Svg: IconUrkunde },
  { key: 'silber-medaille', label: 'Silbermedaille', category: 'abzeichen_trophaeen', Svg: IconSilberMedaille },
  { key: 'ehrenschleife', label: 'Ehrenschleife', category: 'abzeichen_trophaeen', Svg: IconEhrenschleife },
]

/**
 * Neue Resort-Bauten (PROJ-35) und Deko (PROJ-36): flache Icons aus den Sprites,
 * siehe hof-icons-sprite.tsx.
 */
const RESORT_ICONS: HofIconDef[] = iconsAusSprites('TOUR', [...RESORT_NEU, ...RESORT_DEKO, ...RESORT_TIERE])

export const TOUR_ALLE_ICONS: HofIconDef[] = [...TOUR_ICONS, ...RESORT_ICONS]
