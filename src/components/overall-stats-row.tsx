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
        <div className="bg-[#58CC02]/10 border border-[#58CC02]/25 rounded-2xl p-4 text-center">
          <CheckCircle2 size={22} className="text-[#58CC02] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[#F9FAFB] leading-none tabular-nums">
            {formatNumber(totalCorrect)}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-1.5 font-medium">Richtig</p>
        </div>

        <div className="bg-[#FF4B4B]/10 border border-[#FF4B4B]/25 rounded-2xl p-4 text-center">
          <XCircle size={22} className="text-[#FF4B4B] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[#F9FAFB] leading-none tabular-nums">
            {formatNumber(totalWrong)}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-1.5 font-medium">Falsch</p>
        </div>

        <div className="bg-[#FF9600]/10 border border-[#FF9600]/25 rounded-2xl p-4 text-center">
          <Target size={22} className="text-[#FF9600] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[#F9FAFB] leading-none tabular-nums">
            {accuracyPercent}%
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-1.5 font-medium">Quote</p>
        </div>
      </div>
    </div>
  )
}
