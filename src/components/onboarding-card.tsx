import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface OnboardingCardProps {
  displayName: string
}

export function OnboardingCard({ displayName }: OnboardingCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#58CC02]/20 to-[#1CB0F6]/10 border border-[#58CC02]/30 rounded-2xl p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#58CC02]/20 flex items-center justify-center mx-auto mb-4">
        <Sparkles size={26} className="text-[#58CC02]" />
      </div>
      <h2 className="text-xl font-bold text-[#F9FAFB] mb-2">
        Willkommen, {displayName}!
      </h2>
      <p className="text-sm text-[#9CA3AF] mb-5 leading-relaxed">
        Starte jetzt deine erste Lerneinheit und sammle deine ersten XP. Täglich lernen macht den Unterschied!
      </p>
      <Link href="/quiz">
        <Button className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold py-5 transition-all duration-200 active:scale-95 shadow-lg shadow-green-900/30">
          Erste Lerneinheit starten
        </Button>
      </Link>
    </div>
  )
}
