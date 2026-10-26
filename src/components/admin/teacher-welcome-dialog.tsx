'use client'

import { useState } from 'react'
import { Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Merkt am Konto (nicht im Browser), dass der Hinweis gesehen wurde — erscheint auf keinem Gerät erneut. */
export const TEACHER_WELCOME_ENDPOINT = '/api/profile/teacher-welcome'

/**
 * Gilt für die Lebensdauer dieser Browser-Seite (bis zum Neuladen). Der
 * Layout-Wert „noch nicht gesehen“ kommt einmal vom Server und bleibt bei
 * App-Navigation und „Zurück“ stehen (QA BUG-2): ohne diese Merkhilfe käme der
 * Hinweis nach dem Schließen wieder, sobald die Übersicht neu aufgebaut wird.
 * Nach einem Neuladen entscheidet wieder das Konto in der Datenbank.
 */
let dismissedInThisPage = false

/** Nur für Tests: setzt die Merkhilfe zurück */
export function resetTeacherWelcomeForTests() {
  dismissedInThisPage = false
}

/**
 * Einmaliger Willkommens-Hinweis nach der Freischaltung als Lehrkraft (PROJ-44).
 * Schließen auf jedem Weg (Button, Esc, daneben tippen) zählt als gesehen.
 */
export function TeacherWelcomeDialog({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen && !dismissedInThisPage)

  function dismiss() {
    dismissedInThisPage = true
    setOpen(false)
    // Ein Fehler hier ist unkritisch: dann erscheint der Hinweis beim nächsten Mal noch einmal.
    fetch(TEACHER_WELCOME_ENDPOINT, { method: 'POST' }).catch(() => {})
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text rounded-2xl">
        <DialogHeader>
          <span className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-ws-green/15 text-ws-green">
            <Wrench className="size-6" />
          </span>
          <DialogTitle className="text-center text-xl font-bold tracking-tight">
            Willkommen im Lehrkräfte-Bereich
          </DialogTitle>
          <DialogDescription className="text-center text-base leading-relaxed text-ws-muted">
            Du bist jetzt als Lehrkraft freigeschaltet. Hier findest du die Werkzeugkiste für Arbeitsblätter,
            Klassenarbeiten und mehr. Über „Zur Lern-App“ siehst du jederzeit, was deine Schüler sehen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={dismiss}
            className="min-h-11 w-full rounded-2xl bg-ws-green font-bold text-ws-on-accent shadow-lg transition-all duration-200 hover:bg-ws-green-hover active:scale-95 sm:w-auto sm:px-8"
          >
            Los geht’s
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
