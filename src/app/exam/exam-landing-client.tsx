'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Calculator, Truck, AlertCircle, Lock, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ExamSetOption } from './page'

interface Props {
  setsByPart: Record<number, ExamSetOption[]>
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

export function ExamLandingClient({ setsByPart }: Props) {
  const router = useRouter()
  // One chosen exam set per part (part → setId). Parts can be combined.
  const [selected, setSelected] = useState<Map<number, string>>(new Map())
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function chooseSet(partId: number, setId: string) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.get(partId) === setId) next.delete(partId) // tap again to deselect
      else next.set(partId, setId)
      return next
    })
    setError(null)
  }

  const anyAvailable = PARTS.some((p) => (setsByPart[p.id]?.length ?? 0) > 0)

  async function handleStart() {
    const setIds = Array.from(selected.values())
    if (setIds.length === 0) {
      setError('Bitte wähle mindestens eine Prüfung aus.')
      return
    }
    setIsStarting(true)
    setError(null)
    try {
      const res = await fetch('/api/exam/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setIds }),
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
      <p className="text-sm font-semibold text-[#F9FAFB]">Prüfung auswählen</p>

      {PARTS.map((part) => {
        const sets = setsByPart[part.id] ?? []
        const isAvailable = sets.length > 0
        const chosenSetId = selected.get(part.id)
        const Icon = part.icon

        return (
          <div
            key={part.id}
            className={cn(
              'w-full rounded-2xl border-2 p-4 transition-all duration-200',
              chosenSetId
                ? 'border-[#1CB0F6] bg-[#1CB0F6]/10'
                : 'border-[#4B5563] bg-[#1F2937]',
              !isAvailable && 'opacity-60',
            )}
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs border-[#4B5563] text-[#9CA3AF]">
                {part.label}
              </Badge>
              <Badge variant="outline" className="text-xs border-[#4B5563] text-[#9CA3AF]">
                {part.subjects}
              </Badge>
              {!isAvailable && <Lock size={12} className="text-[#4B5563]" />}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className="text-[#1CB0F6] flex-shrink-0" />
              <span className="font-semibold text-[#F9FAFB] text-sm">
                {part.title} {part.subtitle}
              </span>
            </div>

            {!isAvailable ? (
              <p className="text-xs text-[#9CA3AF]">Noch keine Prüfung freigegeben</p>
            ) : (
              <div className="flex flex-col gap-2">
                {sets.length > 1 && (
                  <p className="text-xs text-[#9CA3AF]">Wähle die Prüfung, die dein Ausbilder angesagt hat:</p>
                )}
                {sets.map((set) => {
                  const isChosen = chosenSetId === set.id
                  return (
                    <button
                      key={set.id}
                      onClick={() => chooseSet(part.id, set.id)}
                      className={cn(
                        'w-full text-left flex items-center gap-3 rounded-xl border p-3 transition-all duration-200',
                        isChosen
                          ? 'border-[#1CB0F6] bg-[#1CB0F6]/10'
                          : 'border-[#4B5563] bg-[#111827] hover:border-[#6B7280]',
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full border-2 flex-shrink-0',
                        isChosen ? 'border-[#1CB0F6] bg-[#1CB0F6]' : 'border-[#4B5563]',
                      )}>
                        {isChosen && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#F9FAFB] font-medium truncate">{set.name}</p>
                        <p className="text-xs text-[#9CA3AF]">
                          {set.questionCount} {set.questionCount === 1 ? 'Frage' : 'Fragen'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
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
        disabled={isStarting || selected.size === 0 || !anyAvailable}
        className="w-full rounded-2xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white font-bold text-base py-6 transition-all duration-200 active:scale-95 disabled:opacity-50"
      >
        {isStarting ? 'Wird gestartet…' : 'Prüfung starten'}
      </Button>
    </div>
  )
}
