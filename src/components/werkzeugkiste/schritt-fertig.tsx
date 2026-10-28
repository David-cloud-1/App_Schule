'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Download, Eye, PencilLine, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ablaufHref, type AblaufErgebnis } from '@/lib/werkzeugkiste'
import { downloadHref, vorschauHref } from '@/lib/werkzeugkiste-api'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'

/**
 * Schritt 5 (PROJ-51): Erfolg, eine Hauptaktion „Herunterladen“, daneben die
 * Vorschau und darunter höchstens drei Vorschläge, wie es weitergeht.
 */
export function SchrittFertig({ ablaufId, ergebnis }: { ablaufId: string; ergebnis: AblaufErgebnis }) {
  const [vorschauOffen, setVorschauOffen] = useState(false)

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-ws-line bg-ws-surface px-5 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-ws-green/15 text-ws-green">
          <Check className="size-7" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="grid gap-1">
          <p className="break-words text-lg font-semibold" title={ergebnis.titel}>
            {ergebnis.titel}
          </p>
          <p className="text-sm text-ws-muted">
            {ergebnis.dateiname} · {ergebnis.kapitel} Kapitel · {ergebnis.aufgaben}{' '}
            {ergebnis.aufgaben === 1 ? 'Aufgabe' : 'Aufgaben'}
          </p>
        </div>
        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Button
            asChild
            className="min-h-12 rounded-2xl bg-ws-green px-6 text-base font-bold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green"
          >
            <a href={downloadHref(ablaufId)} download={ergebnis.dateiname}>
              <Download className="mr-2 size-5" aria-hidden />
              Herunterladen
            </a>
          </Button>
          <Button variant="outline" onClick={() => setVorschauOffen(true)} className={`${NEBENAKTION} min-h-12 px-5`}>
            <Eye className="mr-2 size-5" aria-hidden />
            Vorschau ansehen
          </Button>
        </div>
        <p className="text-xs text-ws-faint">Der Download steht 7 Tage lang bereit.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ws-muted">Wie geht es weiter?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className={`${NEBENAKTION} h-auto min-h-12 justify-start whitespace-normal py-3 text-left`}>
            <Link href={ablaufHref(ablaufId, 2)}>
              <Repeat className="mr-2 size-4 shrink-0" aria-hidden />
              Gleiches Skript, anderes Werkzeug
            </Link>
          </Button>
          <Button asChild variant="outline" className={`${NEBENAKTION} h-auto min-h-12 justify-start whitespace-normal py-3 text-left`}>
            <Link href={ablaufHref(ablaufId, 4)}>
              <PencilLine className="mr-2 size-4 shrink-0" aria-hidden />
              Antwort überarbeiten
            </Link>
          </Button>
        </div>
      </div>

      <Dialog open={vorschauOffen} onOpenChange={setVorschauOffen}>
        <DialogContent className="flex h-svh max-h-svh w-full max-w-none flex-col gap-3 rounded-none border-ws-line bg-ws-surface p-4 text-ws-text sm:h-[90svh] sm:max-w-5xl sm:rounded-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Vorschau</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Jede Aufgabe mit der hinterlegten Lösung – richtige Antworten sind hervorgehoben.
            </DialogDescription>
          </DialogHeader>
          {vorschauOffen && (
            // Abgeschottet: Die Vorschau enthält Text aus der KI-Antwort — keine Skripte, kein Zugriff auf die App
            <iframe
              src={vorschauHref(ablaufId)}
              sandbox=""
              title={`Vorschau: ${ergebnis.titel}`}
              className="min-h-0 w-full flex-1 rounded-xl border border-ws-line bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
