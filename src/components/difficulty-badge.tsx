import { Badge } from "@/components/ui/badge"

type Difficulty = 'leicht' | 'mittel' | 'schwer'

interface DifficultyBadgeProps {
  difficulty: Difficulty
}

// Nur im Lehrkräfte-Bereich genutzt — Farben aus dessen Palette (PROJ-45, hell/dunkel)
const config: Record<Difficulty, { label: string; className: string }> = {
  leicht: {
    label: 'Leicht',
    className: 'bg-ws-green/15 text-ws-green border-ws-green/30 hover:bg-ws-green/15',
  },
  mittel: {
    label: 'Mittel',
    className: 'bg-ws-orange/15 text-ws-orange border-ws-orange/30 hover:bg-ws-orange/15',
  },
  schwer: {
    label: 'Schwer',
    className: 'bg-ws-red/15 text-ws-red border-ws-red/30 hover:bg-ws-red/15',
  },
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const { label, className } = config[difficulty]
  return (
    <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </Badge>
  )
}
