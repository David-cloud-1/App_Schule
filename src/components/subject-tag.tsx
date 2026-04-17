import { Badge } from "@/components/ui/badge"

export type SubjectCode = 'BGP' | 'KSK' | 'STG' | 'LOP' | 'PUG'

interface SubjectTagProps {
  code: SubjectCode
}

const config: Record<SubjectCode, { className: string }> = {
  BGP: { className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/20' },
  KSK: { className: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/20' },
  STG: { className: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20' },
  LOP: { className: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/20' },
  PUG: { className: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20' },
}

export function SubjectTag({ code }: SubjectTagProps) {
  const { className } = config[code]
  return (
    <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-xs font-medium ${className}`}>
      {code}
    </Badge>
  )
}
