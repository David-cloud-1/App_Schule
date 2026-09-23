'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { GraduationCap, KeyRound, Loader2, ListChecks, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LookupStatus = 'not_open' | 'open' | 'closed'

type LookupResponse = {
  id: string
  title: string
  questionCount: number
  durationMinutes: number
  status: LookupStatus
  needsName: boolean
  existingSessionId: string | null
  existingSessionStatus?: 'in_progress' | 'completed'
}

function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function formatCode(raw: string) {
  const c = normalizeCode(raw)
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4, 8)}` : c
}

interface Props {
  initialCode?: string
}

export function JoinAssessmentClient({ initialCode }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'code' | 'name' | 'info'>('code')
  const [code, setCode] = useState(initialCode ?? '')
  const [lookup, setLookup] = useState<LookupResponse | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoTriggered = useRef(false)

  async function handleLookup(rawCode: string) {
    const normalized = normalizeCode(rawCode)
    if (normalized.length < 4) {
      setError('Bitte den vollständigen Code eingeben.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/assessments/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 404) {
        setError('Diesen Code gibt es nicht. Bitte prüfen und erneut versuchen.')
        return
      }
      if (res.status === 429) {
        setError('Zu viele Versuche. Bitte kurz warten und erneut probieren.')
        return
      }
      if (!res.ok) {
        setError(data?.error ?? 'Code konnte nicht geprüft werden.')
        return
      }
      const result = data as LookupResponse
      setLookup(result)

      if (result.existingSessionId) {
        if (result.existingSessionStatus === 'in_progress') {
          router.push(`/exam/${result.existingSessionId}`)
        } else {
          router.push(`/exam/${result.existingSessionId}/results`)
        }
        return
      }

      if (result.status === 'not_open') {
        setError('Dieser Leistungsnachweis ist noch nicht freigegeben.')
        return
      }
      if (result.status === 'closed') {
        setError('Der Beitritt zu diesem Leistungsnachweis ist beendet.')
        return
      }

      setStep(result.needsName ? 'name' : 'info')
    } catch (err) {
      console.error('[JoinAssessment] lookup failed:', err)
      setError('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  // Deep-Link mit Code aus der URL direkt prüfen.
  useEffect(() => {
    if (initialCode && !autoTriggered.current) {
      autoTriggered.current = true
      handleLookup(initialCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode])

  async function handleStart() {
    if (!lookup) return
    setLoading(true)
    setError(null)
    try {
      const participantName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const res = await fetch(`/api/assessments/${lookup.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizeCode(code), participantName: participantName || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Beitritt fehlgeschlagen.')
        return
      }
      router.push(`/exam/${data.sessionId}`)
    } catch (err) {
      console.error('[JoinAssessment] join failed:', err)
      setError('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'code') {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1CB0F6]/10 flex items-center justify-center mx-auto mb-4">
            <KeyRound size={28} className="text-[#1CB0F6]" />
          </div>
          <h1 className="text-xl font-bold text-[#F9FAFB] mb-1">Leistungsnachweis beitreten</h1>
          <p className="text-sm text-[#9CA3AF]">Gib den Code ein, den dein Ausbilder dir gegeben hat.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code" className="text-[#9CA3AF]">Code</Label>
          <Input
            id="code"
            value={formatCode(code)}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup(code)}
            placeholder="7K2M-QX"
            autoCapitalize="characters"
            autoComplete="off"
            className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] text-center text-2xl font-mono tracking-widest py-6 rounded-xl"
          />
          {error && <p className="text-sm text-[#FF4B4B] text-center">{error}</p>}
        </div>

        <Button
          onClick={() => handleLookup(code)}
          disabled={loading || normalizeCode(code).length < 4}
          className="w-full rounded-2xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white font-bold py-6"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Weiter'}
        </Button>
      </div>
    )
  }

  if (step === 'name') {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#F9FAFB] mb-1">Wie heißt du?</h1>
          <p className="text-sm text-[#9CA3AF]">
            Dein Name erscheint nur in der Notenliste deines Ausbilders — nicht im Leaderboard.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-[#9CA3AF]">Vorname</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-[#9CA3AF]">Nachname</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] rounded-xl"
            />
          </div>
        </div>
        {error && <p className="text-sm text-[#FF4B4B] text-center">{error}</p>}
        <Button
          onClick={() => {
            if (`${firstName.trim()} ${lastName.trim()}`.trim().length < 3) {
              setError('Bitte Vor- und Nachnamen eingeben.')
              return
            }
            setError(null)
            setStep('info')
          }}
          className="w-full rounded-2xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white font-bold py-6"
        >
          Weiter
        </Button>
      </div>
    )
  }

  // step === 'info'
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#58CC02]/10 flex items-center justify-center mx-auto mb-4">
          <GraduationCap size={28} className="text-[#58CC02]" />
        </div>
        <h1 className="text-xl font-bold text-[#F9FAFB] mb-1">{lookup?.title}</h1>
        <p className="text-sm text-[#9CA3AF]">Bereit? Diese Prüfung zählt für eine Note.</p>
      </div>

      <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <ListChecks size={18} className="text-[#1CB0F6]" />
          <span className="text-sm text-[#F9FAFB]">{lookup?.questionCount} Fragen, Multiple Choice</span>
        </div>
        <div className="flex items-center gap-3">
          <Timer size={18} className="text-[#1CB0F6]" />
          <span className="text-sm text-[#F9FAFB]">{lookup?.durationMinutes} Minuten ab Start</span>
        </div>
        <div className="flex items-center gap-3">
          <GraduationCap size={18} className="text-[#FF9600]" />
          <span className="text-sm text-[#F9FAFB]">1 Versuch — zählt für eine Note</span>
        </div>
      </div>

      {error && <p className="text-sm text-[#FF4B4B] text-center">{error}</p>}

      <Button
        onClick={handleStart}
        disabled={loading}
        className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold py-6"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Jetzt starten'}
      </Button>
    </div>
  )
}
