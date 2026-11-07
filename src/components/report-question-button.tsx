'use client'

import { useState } from 'react'
import { CheckCircle2, Flag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { REPORT_NOTE_MAX, REPORT_REASONS, REPORT_REASON_LABEL, type ReportReason } from '@/lib/question-reports'
import { cn } from '@/lib/utils'

interface ReportQuestionButtonProps {
  questionId: string
  /** Die vom Azubi gewählte Antwort (hilft der Lehrkraft beim Prüfen) */
  selectedOptionId?: string | null
  className?: string
}

/**
 * „Frage melden“ (PROJ-72): kleiner Knopf im Feedback-Bildschirm, öffnet ein
 * Bottom-Sheet mit Grund und optionalem Text. Mit `key={questionId}` einbinden,
 * damit der Zustand „gemeldet“ je Frage neu beginnt.
 */
export function ReportQuestionButton({ questionId, selectedOptionId, className }: ReportQuestionButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const needsNote = reason === 'sonstiges'
  const canSend = !!reason && (!needsNote || note.trim().length > 0) && !sending

  async function submit() {
    if (!reason) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/question-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          reason,
          note: note.trim() || undefined,
          option_id: selectedOptionId ?? undefined,
        }),
      })
      if (res.ok) {
        setDone(true)
        setTimeout(() => setOpen(false), 1400)
        return
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (res.status === 409) setDone(true)
      setError(body?.error ?? 'Das hat nicht geklappt. Bitte versuche es erneut.')
    } catch {
      setError('Keine Verbindung. Dein Text bleibt erhalten, bitte versuche es erneut.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => !done && setOpen(true)}
        disabled={done}
        aria-label={done ? 'Frage gemeldet' : 'Frage melden'}
        className={cn(
          'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-all duration-200',
          done ? 'text-[#58CC02]' : 'text-[#9CA3AF] hover:bg-[#374151] hover:text-[#F9FAFB] active:scale-95',
          className,
        )}
      >
        {done ? <CheckCircle2 className="size-4" /> : <Flag className="size-4" />}
        {done ? 'Gemeldet' : 'Frage melden'}
      </button>

      <Sheet open={open} onOpenChange={(next) => !sending && setOpen(next)}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[90vh] max-w-md overflow-y-auto rounded-t-3xl border-[#4B5563] bg-[#1F2937] text-[#F9FAFB]"
        >
          {done && !error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="size-10 text-[#58CC02]" />
              <p className="text-lg font-bold">Danke!</p>
              <p className="text-sm text-[#9CA3AF]">Wir schauen es uns an.</p>
            </div>
          ) : (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-xl font-bold text-[#F9FAFB]">Was stimmt nicht?</SheetTitle>
                <SheetDescription className="text-sm text-[#9CA3AF]">
                  Deine Lehrkraft prüft die Frage und korrigiert sie, wenn nötig.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Grund">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={reason === r}
                    onClick={() => setReason(r)}
                    className={cn(
                      'min-h-11 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 active:scale-95',
                      reason === r
                        ? 'border-[#1CB0F6] bg-[#1CB0F6]/10 text-[#F9FAFB]'
                        : 'border-[#4B5563] bg-[#111827] text-[#9CA3AF] hover:bg-[#374151]',
                    )}
                  >
                    {REPORT_REASON_LABEL[r]}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, REPORT_NOTE_MAX))}
                  placeholder={needsNote ? 'Bitte kurz beschreiben (Pflicht)' : 'Möchtest du etwas ergänzen? (optional)'}
                  maxLength={REPORT_NOTE_MAX}
                  rows={3}
                  aria-label="Ergänzung"
                  className="rounded-xl border-[#4B5563] bg-[#111827] text-[#F9FAFB] placeholder:text-[#9CA3AF] focus-visible:ring-[#1CB0F6]"
                />
                <p className="mt-1 text-right text-xs text-[#9CA3AF]" aria-live="polite">
                  {note.length} / {REPORT_NOTE_MAX}
                </p>
              </div>

              {error && (
                <p role="alert" className="mt-2 text-sm text-[#FF4B4B]">
                  {error}
                </p>
              )}

              <Button
                onClick={submit}
                disabled={!canSend}
                className="mt-4 min-h-12 w-full rounded-2xl bg-[#58CC02] text-base font-bold text-white transition-all duration-200 hover:bg-[#4CAD02] active:scale-95"
              >
                {sending ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
                Melden
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
