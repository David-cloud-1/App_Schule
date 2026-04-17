import { Badge } from "@/components/ui/badge"

type Difficulty = 'leicht' | 'mittel' | 'schwer'

interface DifficultyBadgeProps {
  difficulty: Difficulty
}

const config: Record<Difficulty, { label: string; className: string }> = {
  leicht: {
    label: 'Leicht',
    className: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20',
  },
  mittel: {
    label: 'Mittel',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/20',
  },
  schwer: {
    label: 'Schwer',
    className: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/20',
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
