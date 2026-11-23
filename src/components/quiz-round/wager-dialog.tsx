'use client'

import { Coins, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { coinWord } from '@/lib/quiz-round'

interface WagerDialogProps {
  open: boolean
  stake: number
  pending: boolean
  error: boolean
  onDecide: (accept: boolean) => void
}

/**
 * Wett-Angebot vor der letzten Frage (PROJ-129). Eingesetzt werden nur die
 * Münzen dieser Runde – der Stand vor der Runde ist nie in Gefahr.
 */
export function WagerDialog({ open, stake, pending, error, onDecide }: WagerDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm rounded-2xl border-[#4B5563] bg-[#1F2937] text-[#F9FAFB]">
        <AlertDialogHeader>
          <div className="mx-auto mb-1 flex size-14 items-center justify-center rounded-full bg-[#FFD700]/15">
            <Coins className="size-7 text-[#FFD700]" aria-hidden="true" />
          </div>
          <AlertDialogTitle className="text-center text-xl font-bold">Letzte Frage – wetten?</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-[#9CA3AF] leading-relaxed">
            Setz deine <strong className="text-[#FFD700]">{stake} {coinWord(stake)}</strong> aus dieser Runde ein.
            Richtig = <strong className="text-[#58CC02]">{stake * 2}</strong>, falsch = 0. Deine Münzen von vorher
            bleiben sicher.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-center text-sm text-[#FF4B4B]">
            Das hat nicht geklappt. Bitte noch einmal wählen.
          </p>
        )}
        <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onDecide(true)
            }}
            disabled={pending}
            className="min-h-12 w-full rounded-2xl bg-[#FFD700] font-bold text-[#111827] hover:bg-[#FFD700]/90 active:scale-95 transition-all duration-200"
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : `Einsetzen: ${stake} → ${stake * 2}`}
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={(e) => {
              e.preventDefault()
              onDecide(false)
            }}
            disabled={pending}
            className="mt-0 min-h-12 w-full rounded-2xl border-[#4B5563] bg-transparent font-semibold text-[#9CA3AF] hover:bg-[#374151] hover:text-[#F9FAFB]"
          >
            Lieber nicht
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
