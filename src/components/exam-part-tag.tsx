import { Badge } from "@/components/ui/badge"

export type ExamPartCode = 'LEISTUNG' | 'KSK' | 'WISO'

interface ExamPartTagProps {
  code: ExamPartCode
}

const config: Record<ExamPartCode, { label: string; className: string }> = {
  LEISTUNG: {
    label: 'Leistungserstellung',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/20',
  },
  KSK: {
    label: 'KSK-Prüfung',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/20',
  },
  WISO: {
    label: 'WiSo',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/20',
  },
}

export function ExamPartTag({ code }: ExamPartTagProps) {
  const { label, className } = config[code]
  return (
    <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </Badge>
  )
}
