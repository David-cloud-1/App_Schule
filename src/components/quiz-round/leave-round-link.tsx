'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const BUTTON =
  'inline-flex size-11 -m-3 items-center justify-center rounded-xl text-[#9CA3AF] transition-colors hover:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58CC02]'

/**
 * Zurück-Pfeil einer laufenden Runde. Sind schon Antworten gegeben, fragt er
 * nach, weil eine abgebrochene Runde nicht gezählt wird (Befund F6).
 */
export function LeaveRoundLink({ started, href = '/subjects' }: { started: boolean; href?: string }) {
  if (!started) {
    return (
      <Link href={href} aria-label="Runde verlassen" className={BUTTON}>
        <ArrowLeft size={20} aria-hidden />
      </Link>
    )
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger aria-label="Runde verlassen" className={BUTTON}>
        <ArrowLeft size={20} aria-hidden />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-sm rounded-2xl border-[#4B5563] bg-[#1F2937] text-[#F9FAFB]">
        <AlertDialogHeader>
          <AlertDialogTitle>Runde abbrechen?</AlertDialogTitle>
          <AlertDialogDescription className="text-[#9CA3AF]">
            Wenn du jetzt gehst, wird diese Runde nicht gezählt: keine XP und nichts für dein Tagesziel.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 rounded-2xl border-0 bg-[#58CC02] font-bold text-white hover:bg-[#4CAD02] hover:text-white">
            Weiterspielen
          </AlertDialogCancel>
          {/* Farben an AlertDialogAction, nicht am Link: nur so ersetzen sie die Standardfarben */}
          <AlertDialogAction
            asChild
            className="min-h-11 rounded-2xl border border-[#4B5563] bg-transparent text-[#F9FAFB] hover:bg-[#374151] hover:text-[#F9FAFB]"
          >
            <Link href={href}>Abbrechen und gehen</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
