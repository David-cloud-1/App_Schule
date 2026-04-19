'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Calculator, Package, Truck, Clock, CheckSquare, Square, AlertCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PartStats {
  questionCount: number
  hasActiveSet: boolean
}

interface Props {
  partStats: Record<number, PartStats>
}

const PARTS = [
  {
    id: 1,
    label: 'Teil 1',
    title: 'Leistungserstellung',
    subtitle: 'Spedition & Logistik',
    subjects: 'STG / LOP',
    questionCount: 20,
    durationMinutes: 90,
    icon: Truck,
    description: '~70% offene Fragen, ~30% Multiple Choice',
  },
  {
    id: 2,
    label: 'Teil 2',
    title: 'Kaufm. Steuerung',
    subtitle: '& Kontrolle',
    subjects: 'KSK',
    questionCount: 15,
    durationMinutes: 90,
    icon: Calculator,
    description: 'Nur Multiple Choice',
  },
  {
    id: 3,
    label: 'Teil 3',
    title: 'Wirtschafts- &',
    subtitle: 'Sozialkunde',
    subjects: 'BGP',
    questionCount: 15,
    durationMinutes: 45,
    icon: BookOpen,
    description: 'Nur Multiple Choice',
  },
]

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} Min.`
  if (m === 0) return `${h} Std.`
  return `${h} Std. ${m} Min.`
}

export function ExamLandingClient({ partStats }: Props) {
  const router = useRouter()
  const [selectedParts, setSelectedParts] = useState<Set<number>>(new Set())
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePart(partId: number) {
    setSelectedParts((prev) => {
      const next = new Set(prev)
      if (next.has(partId)) next.delete(partId)
      else next.add(partId)
      return next
    })
    setError(null)
  }

  const totalMinutes = Array.from(selectedParts).reduce((sum, p) => {
    return sum + (PARTS.find((x) => x.id === p)?.durationMinutes ?? 0)
  }, 0)

  async function handleStart() {
    if (selectedParts.size === 0) {
      setError('Bitte wähle mindestens einen Prüfungsteil aus.')
      return
    }
    setIsStarting(true)
    setError(null)
    try {
      const res = await fetch('/api/exam/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: Array.from(selectedParts).sort() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Fehler beim Starten der Prüfung.')
        return
      }
      const { sessionId } = await res.json()
      router.push(`/exam/${sessionId}`)
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-[#F9FAFB]">Prüfungsteil auswählen</p>

      {PARTS.map((part) => {
        const stats = partStats[part.id]
        const isSelected = selectedParts.has(part.id)
        const hasEnoughQuestions = (stats?.questionCount ?? 0) > 0
        const Icon = part.icon

        return (
          <button
            key={part.id}
            onClick={() => hasEnoughQuestions && togglePart(part.id)}
            disabled={!hasEnoughQuestions}
            className={cn(
              'w-full text-left rounded-2xl border-2 p-4 transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isSelected
                ? 'border-[#1CB0F6] bg-[#1CB0F6]/10'
                : 'border-[#4B5563] bg-[#1F2937] hover:border-[#6B7280]',
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-0.5 flex-shrink-0 w-5 h-5',
                isSelected ? 'text-[#1CB0F6]' : 'text-[#4B5563]',
              )}>
                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-xs border-[#4B5563] text-[#9CA3AF]">
                    {part.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-[#4B5563] text-[#9CA3AF]">
                    {part.subjects}
                  </Badge>
                  {stats?.hasActiveSet && (
                    <Badge className="text-xs bg-[#58CC02]/20 text-[#58CC02] border-0">
                      <Shield size={10} className="mr-1" />
                      Admin-Set
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} className="text-[#1CB0F6] flex-shrink-0" />
                  <span className="font-semibold text-[#F9FAFB] text-sm">
                    {part.title} {part.subtitle}
                  </span>
                </div>

                <p className="text-xs text-[#9CA3AF]">{part.description}</p>

                <div className="flex items-center gap-4 mt-2 text-xs text-[#9CA3AF]">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDuration(part.durationMinutes)}
                  </span>
                  <span>
                    {hasEnoughQuestions
                      ? `${stats?.questionCount ?? 0} Fragen verfügbar`
                      : 'Noch keine Fragen'}
                  </span>
                </div>
              </div>
            </div>
          </button>
        )
      })}

      {selectedParts.size > 0 && (
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 text-sm">
          <p className="text-[#9CA3AF] mb-1">Gesamtzeit</p>
          <p className="text-[#F9FAFB] font-bold text-lg">{formatDuration(totalMinutes)}</p>
          {selectedParts.size === 3 && (
            <p className="text-xs text-[#9CA3AF] mt-1">Vollständige IHK-Simulation (alle 3 Teile)</p>
          )}
        </div>
      )}

      {/* Rules notice */}
      <div className="bg-[#374151] rounded-xl p-4 text-sm text-[#9CA3AF] space-y-1">
        <p className="font-semibold text-[#F9FAFB] mb-2 flex items-center gap-2">
          <AlertCircle size={16} className="text-[#FF9600]" />
          Prüfungsregeln
        </p>
        <p>• Kein sofortiges Feedback — wie in der echten IHK-Prüfung</p>
        <p>• Offene Fragen bewertest du nach Abgabe selbst</p>
        <p>• Du kannst zwischen Fragen vor- und zurückspringen</p>
        <p>• Beim Schließen der Seite gehen unbeantwortete Eingaben verloren</p>
      </div>

      {error && (
        <p className="text-[#FF4B4B] text-sm text-center">{error}</p>
      )}

      <Button
        onClick={handleStart}
        disabled={isStarting || selectedParts.size === 0}
        className="w-full rounded-2xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white font-bold text-base py-6 transition-all duration-200 active:scale-95 disabled:opacity-50"
      >
        {isStarting ? 'Wird gestartet…' : 'Prüfung starten'}
      </Button>
    </div>
  )
}
