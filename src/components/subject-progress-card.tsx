import type { LucideIcon } from 'lucide-react'
import { CheckCircle2 } from 'lucide-react'

interface SubjectProgressCardProps {
  id: string
  code: string
  name: string
  color: string
  icon: LucideIcon
  totalQuestions: number
  seenCount: number
  correctCount: number
  seenPercent: number
  correctPercent: number
}

export function SubjectProgressCard({
  code,
  name,
  color,
  icon: Icon,
  totalQuestions,
  seenCount,
  correctCount,
  seenPercent,
  correctPercent,
}: SubjectProgressCardProps) {
  const hasQuestions = totalQuestions > 0
  const isComplete = hasQuestions && seenPercent === 100

  return (
    <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl overflow-hidden">
      {/* Colored top accent bar */}
      <div className="h-1" style={{ backgroundColor: color }} />

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon size={20} style={{ color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#F9FAFB] text-base">{code}</span>
              {isComplete && <CheckCircle2 size={15} className="text-[#58CC02] flex-shrink-0" />}
            </div>
            <p className="text-xs text-[#9CA3AF] truncate">{name}</p>
          </div>

          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#374151] text-[#9CA3AF] flex-shrink-0">
            {totalQuestions} Fragen
          </span>
        </div>

        {!hasQuestions ? (
          <p className="text-xs text-[#6B7280] text-center py-1">Noch keine Fragen verfügbar</p>
        ) : (
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#9CA3AF]">Gesehen</span>
                <span className="text-xs font-semibold text-[#F9FAFB]">
                  {seenCount}/{totalQuestions} · {seenPercent}%
                </span>
              </div>
              <div className="h-2 bg-[#374151] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${seenPercent}%`, backgroundColor: color, opacity: 0.7 }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#9CA3AF]">Richtig</span>
                <span className="text-xs font-semibold text-[#F9FAFB]">
                  {correctCount}/{totalQuestions} · {correctPercent}%
                </span>
              </div>
              <div className="h-2 bg-[#374151] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${correctPercent}%`, backgroundColor: color }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
