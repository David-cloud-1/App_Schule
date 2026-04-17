import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SubjectCardProps {
  id: string
  code: string
  name: string
  description: string
  color: string
  icon: LucideIcon
  activeQuestionCount: number
}

export function SubjectCard({
  id,
  code,
  name,
  description,
  color,
  icon: Icon,
  activeQuestionCount,
}: SubjectCardProps) {
  const hasQuestions = activeQuestionCount > 0

  return (
    <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl shadow-lg transition-all duration-200 hover:border-[#6B7280]">
      <CardContent className="p-5">
        {/* Icon + question count */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon size={24} style={{ color }} />
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-[#4B5563] text-[#9CA3AF] text-xs"
          >
            {activeQuestionCount} {activeQuestionCount === 1 ? 'Frage' : 'Fragen'}
          </Badge>
        </div>

        {/* Subject info */}
        <div className="mb-4">
          <h3 className="font-bold text-[#F9FAFB] text-xl tracking-tight">{code}</h3>
          <p className="text-sm font-medium text-[#9CA3AF] mt-0.5 leading-snug">{name}</p>
          <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">{description}</p>
        </div>

        {/* CTA */}
        {hasQuestions ? (
          <Link href={`/quiz?subject=${id}`}>
            <Button
              className="w-full rounded-2xl font-semibold text-white transition-all duration-200 active:scale-95"
              style={{ backgroundColor: color }}
            >
              Jetzt lernen
            </Button>
          </Link>
        ) : (
          <div className="w-full rounded-2xl border border-[#4B5563] px-4 py-2 text-center text-sm text-[#6B7280]">
            Noch keine Fragen verfügbar
          </div>
        )}
      </CardContent>
    </Card>
  )
}
