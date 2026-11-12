import type { ReactNode } from 'react'

/**
 * Kleine Vorschaubilder für den Aufgabentyp-Katalog (PROJ-90, E4): so sieht der
 * Block auf der Seite ungefähr aus. Gezeichnet statt fotografiert – die Farben
 * kommen aus den ws-Tokens und passen sich Hell/Dunkel von selbst an.
 */

const W = 120
const H = 72

// ── Grundformen ─────────────────────────────────────────────────────────────

/** Textzeile */
const Z = ({ x, y, w, t = 'muted' }: { x: number; y: number; w: number; t?: 'muted' | 'text' | 'green' | 'blue' | 'orange' }) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={4}
    rx={2}
    className={
      { muted: 'fill-ws-muted/40', text: 'fill-ws-text/70', green: 'fill-ws-green', blue: 'fill-ws-blue', orange: 'fill-ws-orange' }[t]
    }
  />
)

/** Kasten mit Rahmen */
const K = ({ x, y, w, h, r = 3, akzent }: { x: number; y: number; w: number; h: number; r?: number; akzent?: 'green' | 'blue' | 'orange' | 'red' }) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={r}
    className={
      akzent
        ? { green: 'fill-ws-green/15 stroke-ws-green', blue: 'fill-ws-blue/15 stroke-ws-blue', orange: 'fill-ws-orange/15 stroke-ws-orange', red: 'fill-ws-red/15 stroke-ws-red' }[akzent]
        : 'fill-ws-surface stroke-ws-line'
    }
    strokeWidth={1}
  />
)

/** Auswahlkreis */
const Kreis = ({ x, y, an }: { x: number; y: number; an?: boolean }) => (
  <circle cx={x} cy={y} r={3.2} className={an ? 'fill-ws-green stroke-ws-green' : 'fill-ws-surface stroke-ws-muted/60'} strokeWidth={1} />
)

/** Lücke (gestrichelte Linie) */
const L = ({ x, y, w, voll }: { x: number; y: number; w: number; voll?: boolean }) => (
  <rect x={x} y={y - 1} width={w} height={7} rx={2} className={voll ? 'fill-ws-blue/20 stroke-ws-blue' : 'fill-ws-bg stroke-ws-muted/60'} strokeWidth={1} strokeDasharray={voll ? undefined : '2 1.5'} />
)

/** Knopf */
const Knopf = ({ x, y, w = 26 }: { x: number; y: number; w?: number }) => <rect x={x} y={y} width={w} height={8} rx={4} className="fill-ws-green" />

const Kette = ({ children }: { children: ReactNode }) => <>{children}</>

/** Absätze aus Textzeilen */
function Absatz({ x, y, breiten, abstand = 7 }: { x: number; y: number; breiten: number[]; abstand?: number }) {
  return (
    <>
      {breiten.map((w, i) => (
        <Z key={i} x={x} y={y + i * abstand} w={w} />
      ))}
    </>
  )
}

// ── Skizzen je Typ ──────────────────────────────────────────────────────────

const SKIZZEN: Record<string, () => ReactNode> = {
  text: () => (
    <Kette>
      <Z x={10} y={8} w={50} t="text" />
      <Absatz x={10} y={18} breiten={[100, 92, 96]} />
      <K x={10} y={42} w={100} h={22} akzent="blue" />
      <Z x={16} y={48} w={30} t="blue" />
      <Z x={16} y={56} w={80} />
    </Kette>
  ),
  image: () => (
    <Kette>
      <K x={20} y={6} w={80} h={48} />
      <path d="M26 48 L46 28 L60 40 L72 30 L94 48 Z" className="fill-ws-green/40" />
      <circle cx={84} cy={18} r={5} className="fill-ws-orange/70" />
      <Z x={34} y={60} w={52} />
    </Kette>
  ),
  accordion: () => (
    <Kette>
      {[6, 26, 46].map((y, i) => (
        <g key={y}>
          <K x={10} y={y} w={100} h={i === 0 ? 18 : 14} />
          <path d={`M98 ${y + 5} l3 3 l3 -3`} className="fill-none stroke-ws-muted" strokeWidth={1.2} />
          <Z x={16} y={y + 5} w={40} t="text" />
          {i === 0 && <Z x={16} y={y + 12} w={70} />}
        </g>
      ))}
    </Kette>
  ),
  calculation_example: () => (
    <Kette>
      <K x={10} y={6} w={100} h={14} akzent="blue" />
      <Z x={16} y={11} w={70} t="blue" />
      <Absatz x={16} y={28} breiten={[60, 72, 54]} />
      <Z x={16} y={52} w={20} t="text" />
      <K x={40} y={48} w={40} h={12} akzent="green" />
      <Z x={46} y={52} w={28} t="green" />
    </Kette>
  ),
  multiple_choice: () => (
    <Kette>
      <Z x={10} y={8} w={90} t="text" />
      {[22, 36, 50].map((y, i) => (
        <g key={y}>
          <K x={10} y={y - 5} w={100} h={12} akzent={i === 0 ? 'green' : undefined} />
          <Kreis x={18} y={y + 1} an={i === 0} />
          <Z x={26} y={y - 1} w={[40, 54, 34][i]} />
        </g>
      ))}
    </Kette>
  ),
  true_false: () => (
    <Kette>
      <Absatz x={10} y={10} breiten={[100, 70]} />
      <K x={14} y={36} w={42} h={20} r={6} akzent="green" />
      <Z x={24} y={44} w={22} t="green" />
      <K x={64} y={36} w={42} h={20} r={6} />
      <Z x={74} y={44} w={22} />
    </Kette>
  ),
  single_choice_set: () => (
    <Kette>
      <rect x={10} y={6} width={100} height={4} rx={2} className="fill-ws-line" />
      <rect x={10} y={6} width={40} height={4} rx={2} className="fill-ws-green" />
      <Z x={10} y={18} w={76} t="text" />
      {[30, 44].map((y, i) => (
        <g key={y}>
          <K x={10} y={y} w={100} h={11} akzent={i === 1 ? 'green' : undefined} />
          <Z x={16} y={y + 4} w={i ? 36 : 48} />
        </g>
      ))}
      <Z x={44} y={62} w={32} />
    </Kette>
  ),
  question_set: () => (
    <Kette>
      <K x={10} y={6} w={100} h={60} />
      <Z x={16} y={12} w={44} t="text" />
      {[24, 36].map((y, i) => (
        <g key={y}>
          <Kreis x={20} y={y + 2} an={i === 0} />
          <Z x={28} y={y} w={60} />
        </g>
      ))}
      <rect x={16} y={48} width={60} height={5} rx={2.5} className="fill-ws-line" />
      <rect x={16} y={48} width={42} height={5} rx={2.5} className="fill-ws-green" />
      <Z x={82} y={48} w={22} t="green" />
    </Kette>
  ),
  freitext: () => (
    <Kette>
      <Z x={10} y={8} w={90} t="text" />
      <K x={10} y={18} w={100} h={30} />
      <Absatz x={16} y={24} breiten={[80, 66]} />
      <Knopf x={10} y={56} w={44} />
      <Z x={60} y={58} w={40} />
    </Kette>
  ),
  interactive_video: () => (
    <Kette>
      <K x={10} y={6} w={100} h={40} />
      <path d="M54 18 L54 34 L68 26 Z" className="fill-ws-text/70" />
      <rect x={10} y={50} width={100} height={3} rx={1.5} className="fill-ws-line" />
      <rect x={10} y={50} width={36} height={3} rx={1.5} className="fill-ws-blue" />
      <circle cx={46} cy={51.5} r={3.5} className="fill-ws-orange" />
      <Z x={10} y={60} w={70} />
    </Kette>
  ),
  fill_blanks: () => (
    <Kette>
      <Z x={10} y={12} w={30} />
      <L x={44} y={12} w={26} />
      <Z x={74} y={12} w={36} />
      <Z x={10} y={26} w={52} />
      <L x={66} y={26} w={30} voll />
      <Z x={10} y={40} w={18} />
      <L x={32} y={40} w={24} />
      <Z x={60} y={40} w={46} />
      <Knopf x={10} y={56} />
    </Kette>
  ),
  advanced_fill_blanks: () => (
    <Kette>
      <Z x={10} y={12} w={30} />
      <L x={44} y={12} w={26} />
      <circle cx={76} cy={14.5} r={4} className="fill-ws-orange/20 stroke-ws-orange" strokeWidth={1} />
      <Z x={84} y={12} w={26} />
      <K x={44} y={22} w={56} h={12} akzent="orange" />
      <Z x={50} y={26} w={40} t="orange" />
      <Z x={10} y={42} w={52} />
      <L x={66} y={42} w={30} />
      <Knopf x={10} y={56} />
    </Kette>
  ),
  drag_words: () => (
    <Kette>
      {[10, 34, 58].map((x, i) => (
        <rect key={x} x={x + 4} y={6} width={22} height={10} rx={5} className={i === 1 ? 'fill-ws-bg stroke-ws-line' : 'fill-ws-blue/20 stroke-ws-blue'} strokeWidth={1} strokeDasharray={i === 1 ? '2 1.5' : undefined} />
      ))}
      <Z x={10} y={28} w={30} />
      <L x={44} y={28} w={26} voll />
      <Z x={74} y={28} w={36} />
      <Z x={10} y={42} w={52} />
      <L x={66} y={42} w={30} />
      <Knopf x={10} y={56} />
    </Kette>
  ),
  mark_words: () => (
    <Kette>
      {[10, 24, 38].map((y, r) => (
        <g key={y}>
          {[0, 1, 2, 3].map((i) => {
            const x = 10 + i * 26
            const an = (r + i) % 3 === 0
            return an ? (
              <g key={i}>
                <rect x={x - 2} y={y - 2} width={24} height={8} rx={2} className="fill-ws-orange/30" />
                <Z x={x} y={y} w={20} t="orange" />
              </g>
            ) : (
              <Z key={i} x={x} y={y} w={20} />
            )
          })}
        </g>
      ))}
      <Knopf x={10} y={56} />
    </Kette>
  ),
  drag_drop: () => (
    <Kette>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={10 + i * 34} y={6} width={30} height={9} rx={4.5} className="fill-ws-blue/20 stroke-ws-blue" strokeWidth={1} />
      ))}
      <K x={10} y={22} w={48} h={42} />
      <Z x={16} y={27} w={24} t="text" />
      <rect x={16} y={36} width={30} height={9} rx={4.5} className="fill-ws-green/20 stroke-ws-green" strokeWidth={1} />
      <K x={62} y={22} w={48} h={42} />
      <Z x={68} y={27} w={24} t="text" />
    </Kette>
  ),
  reihenfolge: () => (
    <Kette>
      {[6, 21, 36, 51].map((y, i) => (
        <g key={y}>
          <K x={10} y={y} w={100} h={12} />
          <circle cx={19} cy={y + 6} r={4} className="fill-ws-green/20 stroke-ws-green" strokeWidth={1} />
          <Z x={28} y={y + 4} w={[52, 40, 60, 34][i]} />
          <path d={`M98 ${y + 3.5} h6 M98 ${y + 6} h6 M98 ${y + 8.5} h6`} className="stroke-ws-muted" strokeWidth={1} />
        </g>
      ))}
    </Kette>
  ),
  bildzuordnung: () => (
    <Kette>
      <K x={10} y={6} w={70} h={58} />
      <path d="M16 56 L36 30 L50 44 L60 34 L74 56 Z" className="fill-ws-green/30" />
      <circle cx={36} cy={24} r={4} className="fill-ws-orange stroke-ws-surface" strokeWidth={1.5} />
      <circle cx={62} cy={46} r={4} className="fill-ws-surface stroke-ws-orange" strokeWidth={1.5} strokeDasharray="2 1.5" />
      {[10, 24, 38].map((y) => (
        <rect key={y} x={86} y={y} width={26} height={9} rx={4.5} className="fill-ws-blue/20 stroke-ws-blue" strokeWidth={1} />
      ))}
    </Kette>
  ),
  image_sequencing: () => (
    <Kette>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <K x={10 + i * 35} y={10} w={30} h={30} />
          <path d={`M${14 + i * 35} 36 l8 -10 l6 6 l4 -4 l8 8 Z`} className="fill-ws-green/40" />
          <circle cx={25 + i * 35} cy={50} r={5} className="fill-ws-green/20 stroke-ws-green" strokeWidth={1} />
          <Z x={14 + i * 35} y={60} w={22} />
        </g>
      ))}
    </Kette>
  ),
  calculation_exercise: () => (
    <Kette>
      <Absatz x={10} y={8} breiten={[100, 84, 60]} />
      <K x={10} y={34} w={60} h={14} />
      <Z x={16} y={39} w={30} t="text" />
      <Z x={74} y={39} w={10} />
      <Knopf x={10} y={56} />
    </Kette>
  ),
  arithmetic_quiz: () => (
    <Kette>
      {[6, 26, 46].map((y, i) => (
        <g key={y}>
          <Z x={10} y={y + 5} w={34} t="text" />
          <rect x={48} y={y + 5} width={6} height={4} className="fill-ws-muted/60" />
          <K x={60} y={y} w={30} h={14} akzent={i === 0 ? 'green' : undefined} />
          {i === 0 && <path d={`M96 ${y + 7} l3 3 l6 -6`} className="fill-none stroke-ws-green" strokeWidth={1.6} />}
        </g>
      ))}
    </Kette>
  ),
  rechenweg: () => (
    <Kette>
      <Z x={10} y={6} w={90} t="text" />
      {[16, 32, 48].map((y, i) => (
        <g key={y} opacity={i === 2 ? 0.45 : 1}>
          <circle cx={16} cy={y + 6} r={4} className={i === 0 ? 'fill-ws-green' : 'fill-ws-surface stroke-ws-muted/60'} strokeWidth={1} />
          <Z x={24} y={y + 1} w={50} />
          <K x={24} y={y + 7} w={40} h={8} akzent={i === 0 ? 'green' : undefined} />
        </g>
      ))}
      <Knopf x={80} y={58} w={30} />
    </Kette>
  ),
  schaetzrunde: () => (
    <Kette>
      <Z x={10} y={8} w={80} t="text" />
      <rect x={10} y={30} width={100} height={4} rx={2} className="fill-ws-line" />
      <path d="M46 24 l4 6 l4 -6 Z" className="fill-ws-blue" />
      <Z x={40} y={18} w={20} t="blue" />
      <path d="M76 40 l4 -6 l4 6 Z" className="fill-ws-green" />
      <Z x={70} y={44} w={22} t="green" />
      <K x={10} y={54} w={100} h={12} akzent="orange" />
      <Z x={16} y={58} w={60} t="orange" />
    </Kette>
  ),
  crossword: () => (
    <Kette>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={`h${i}`} x={20 + i * 10} y={26} width={10} height={10} className="fill-ws-surface stroke-ws-muted/60" strokeWidth={1} />
      ))}
      {[0, 1, 3, 4].map((i) => (
        <rect key={`v${i}`} x={40} y={6 + i * 10} width={10} height={10} className="fill-ws-surface stroke-ws-muted/60" strokeWidth={1} />
      ))}
      <rect x={40} y={26} width={10} height={10} className="fill-ws-green/30 stroke-ws-green" strokeWidth={1} />
      <Absatz x={80} y={10} breiten={[30, 24, 28, 20]} abstand={10} />
    </Kette>
  ),
  find_words: () => (
    <Kette>
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 7 }).map((__, c) => (
          <rect key={`${r}-${c}`} x={10 + c * 10} y={6 + r * 12} width={6} height={6} rx={1} className="fill-ws-muted/40" />
        )),
      )}
      <rect x={18} y={16} width={44} height={10} rx={5} className="fill-ws-orange/25 stroke-ws-orange" strokeWidth={1} />
      <Absatz x={86} y={10} breiten={[24, 20, 26, 18]} abstand={10} />
    </Kette>
  ),
  memory_game: () => (
    <Kette>
      {[0, 1].map((r) =>
        [0, 1, 2, 3].map((c) => {
          const offen = (r === 0 && c === 1) || (r === 1 && c === 2)
          return (
            <g key={`${r}-${c}`}>
              <rect x={12 + c * 25} y={8 + r * 30} width={20} height={26} rx={3} className={offen ? 'fill-ws-surface stroke-ws-green' : 'fill-ws-blue/30 stroke-ws-blue'} strokeWidth={1} />
              {offen && <Z x={15 + c * 25} y={19 + r * 30} w={14} t="green" />}
            </g>
          )
        }),
      )}
    </Kette>
  ),
  trainer: () => (
    <Kette>
      <K x={22} y={14} w={76} h={46} />
      <K x={18} y={10} w={76} h={46} />
      <K x={14} y={6} w={76} h={46} />
      <Z x={22} y={14} w={44} t="text" />
      <K x={22} y={26} w={60} h={10} />
      <Z x={22} y={42} w={30} t="orange" />
      <path d="M100 30 a10 10 0 1 1 -4 -8" className="fill-none stroke-ws-orange" strokeWidth={1.5} />
      <path d="M94 18 l2 4 l4 -2" className="fill-none stroke-ws-orange" strokeWidth={1.5} />
    </Kette>
  ),
  fallakte: () => (
    <Kette>
      <path d="M10 12 h28 l4 -6 h26 v6 h42 v54 h-100 Z" className="fill-ws-orange/15 stroke-ws-orange" strokeWidth={1} />
      <Z x={16} y={18} w={54} t="text" />
      <Absatz x={16} y={28} breiten={[80, 68]} />
      <K x={16} y={44} w={40} h={10} akzent="green" />
      <K x={60} y={44} w={40} h={10} />
      <rect x={16} y={58} width={84} height={4} rx={2} className="fill-ws-muted/30" strokeDasharray="2 2" />
    </Kette>
  ),
  dialog_cards: () => (
    <Kette>
      <rect x={30} y={8} width={60} height={42} rx={4} className="fill-ws-surface stroke-ws-line" strokeWidth={1} transform="rotate(-6 60 29)" />
      <rect x={30} y={8} width={60} height={42} rx={4} className="fill-ws-blue/15 stroke-ws-blue" strokeWidth={1} />
      <Z x={42} y={26} w={36} t="blue" />
      <path d="M50 60 a12 6 0 0 0 20 0" className="fill-none stroke-ws-muted" strokeWidth={1.2} />
      <path d="M68 56 l3 4 l-4 2" className="fill-none stroke-ws-muted" strokeWidth={1.2} />
    </Kette>
  ),
  flashcards: () => (
    <Kette>
      <rect x={20} y={6} width={80} height={32} rx={4} className="fill-ws-blue/15 stroke-ws-blue" strokeWidth={1} />
      <Z x={30} y={20} w={60} t="blue" />
      <K x={20} y={44} w={56} h={12} />
      <Z x={26} y={48} w={24} t="text" />
      <Knopf x={80} y={46} w={20} />
      <Z x={44} y={62} w={32} />
    </Kette>
  ),
  summary: () => (
    <Kette>
      {[6, 19, 32].map((y, i) => (
        <g key={y}>
          <K x={10} y={y} w={100} h={10} akzent={i === 1 ? 'green' : undefined} />
          <Z x={16} y={y + 3} w={[70, 60, 76][i]} t={i === 1 ? 'green' : 'muted'} />
        </g>
      ))}
      <K x={10} y={48} w={100} h={18} akzent="blue" />
      <Absatz x={16} y={52} breiten={[60, 44]} abstand={6} />
    </Kette>
  ),
  selbsteinschaetzung: () => (
    <Kette>
      {[8, 30, 52].map((y, i) => (
        <g key={y}>
          <Z x={10} y={y + 2} w={44} />
          {(['green', 'orange', 'red'] as const).map((f, j) => (
            <rect
              key={f}
              x={62 + j * 16}
              y={y - 2}
              width={13}
              height={12}
              rx={3}
              className={
                j === i
                  ? { green: 'fill-ws-green stroke-ws-green', orange: 'fill-ws-orange stroke-ws-orange', red: 'fill-ws-red stroke-ws-red' }[f]
                  : 'fill-ws-surface stroke-ws-line'
              }
              strokeWidth={1}
            />
          ))}
        </g>
      ))}
    </Kette>
  ),
}

/**
 * Vorschaubild eines Typs. `alt` beschreibt es für Bildschirmleser; leer = Schmuck
 * (im Katalog steht Name und Beschreibung direkt daneben, sonst würde alles doppelt vorgelesen).
 */
export function KatalogSkizze({ typ, alt, className }: { typ: string; alt: string; className?: string }) {
  const skizze = SKIZZEN[typ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })} className={className}>
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={6} className="fill-ws-bg stroke-ws-line" strokeWidth={1} />
      {skizze ? skizze() : <Z x={10} y={30} w={100} />}
    </svg>
  )
}

export const SKIZZEN_TYPEN = Object.keys(SKIZZEN)
