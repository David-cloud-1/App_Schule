'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Calculator, Truck, CheckSquare, Square, AlertCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PartStats {
  questionCount: number
  setName: string | null
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
    icon: Truck,
  },
  {
    id: 2,
    label: 'Teil 2',
    title: 'Kaufm. Steuerung',
    subtitle: '& Kontrolle',
    subjects: 'KSK',
    icon: Calculator,
  },
  {
    id: 3,
    label: 'Teil 3',
    title: 'Wirtschafts- &',
    subtitle: 'Sozialkunde',
    subjects: 'BGP',
    icon: BookOpen,
  },
]

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

  async function handleStart() {
    if (selectedParts.size === 0) {
      setError('Bitte wähle mindestens eine Prüfung aus.')
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

  const anyAvailable = PARTS.some((p) => !!partStats[p.id]?.setName)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-[#F9FAFB]">Prüfung auswählen</p>

      {PARTS.map((part) => {
        const stats = partStats[part.id]
        const isSelected = selectedParts.has(part.id)
        const isAvailable = !!stats?.setName
        const Icon = part.icon

        return (
          <button
            key={part.id}
            onClick={() => isAvailable && togglePart(part.id)}
            disabled={!isAvailable}
            className={cn(
              'w-full text-left rounded-2xl border-2 p-4 transition-all duration-200',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isSelected
                ? 'border-[#1CB0F6] bg-[#1CB0F6]/10'
                : 'border-[#4B5563] bg-[#1F2937] hover:border-[#6B7280]',
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-0.5 flex-shrink-0 w-5 h-5',
                !isAvailable ? 'text-[#4B5563]' : isSelected ? 'text-[#1CB0F6]' : 'text-[#4B5563]',
              )}>
                {!isAvailable ? <Lock size={18} /> : isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-xs border-[#4B5563] text-[#9CA3AF]">
                    {part.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-[#4B5563] text-[#9CA3AF]">
                    {part.subjects}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} className="text-[#1CB0F6] flex-shrink-0" />
                  <span className="font-semibold text-[#F9FAFB] text-sm">
                    {part.title} {part.subtitle}
                  </span>
                </div>

                {isAvailable ? (
                  <div className="mt-2">
                    <p className="text-sm text-[#F9FAFB] font-medium truncate">{stats.setName}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {stats.questionCount} {stats.questionCount === 1 ? 'Frage' : 'Fragen'} · von deinem Ausbilder freigegeben
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#9CA3AF] mt-2">Noch keine Prüfung freigegeben</p>
                )}
              </div>
            </div>
          </button>
        )
      })}

      {/* Rules notice */}
      <div className="bg-[#374151] rounded-xl p-4 text-sm text-[#9CA3AF] space-y-1">
        <p className="font-semibold text-[#F9FAFB] mb-2 flex items-center gap-2">
          <AlertCircle size={16} className="text-[#FF9600]" />
          Prüfungsregeln
        </p>
        <p>• Kein sofortiges Feedback — wie in der echten IHK-Prüfung</p>
        <p>• Offene Fragen bewertest du nach Abgabe selbst</p>
        <p>• Du kannst zwischen Fragen vor- und zurückspringen</p>
        <p>• Deine Antworten werden während der Prüfung automatisch gespeichert</p>
      </div>

      {error && (
        <p className="text-[#FF4B4B] text-sm text-center">{error}</p>
      )}

      <Button
        onClick={handleStart}
        disabled={isStarting || selectedParts.size === 0 || !anyAvailable}
        className="w-full rounded-2xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white font-bold text-base py-6 transition-all duration-200 active:scale-95 disabled:opacity-50"
      >
        {isStarting ? 'Wird gestartet…' : 'Prüfung starten'}
      </Button>
    </div>
  )
}
