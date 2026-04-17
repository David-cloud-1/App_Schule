import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, XCircle, Target } from 'lucide-react'

interface OverallStatsRowProps {
  totalCorrect: number
  totalWrong: number
  accuracyPercent: number
}

function formatNumber(n: number): string {
  return n.toLocaleString('de-DE')
}

export function OverallStatsRow({ totalCorrect, totalWrong, accuracyPercent }: OverallStatsRowProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
        Gesamtstatistik
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl">
          <CardContent className="p-3 text-center">
            <CheckCircle2 size={18} className="text-[#58CC02] mx-auto mb-1.5" />
            <p className="text-base font-bold text-[#F9FAFB] leading-none">
              {formatNumber(totalCorrect)}
            </p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">Richtig</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl">
          <CardContent className="p-3 text-center">
            <XCircle size={18} className="text-[#FF4B4B] mx-auto mb-1.5" />
            <p className="text-base font-bold text-[#F9FAFB] leading-none">
              {formatNumber(totalWrong)}
            </p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">Falsch</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl">
          <CardContent className="p-3 text-center">
            <Target size={18} className="text-[#FF9600] mx-auto mb-1.5" />
            <p className="text-base font-bold text-[#F9FAFB] leading-none">
              {accuracyPercent}%
            </p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">Genauigkeit</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
