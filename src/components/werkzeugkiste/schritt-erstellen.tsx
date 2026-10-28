'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, RotateCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
import type { LaufInfo } from '@/lib/werkzeugkiste'
import { euro } from '@/lib/werkzeugkiste-kosten'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'

/**
 * Schritt „Erstellen“ beim direkten Weg (PROJ-64): Fortschritt in Worten,
 * Abbrechen mit Rückfrage und bei Fehlschlag zwei klare Wege weiter.
 */
export function SchrittErstellen({
  lauf,
  beschaeftigt,
  abbrechen,
  nochmal,
  kostenlos,
}: {
  lauf: LaufInfo | null
  beschaeftigt: boolean
  abbrechen: () => void
  nochmal: () => void
  kostenlos: () => void
}) {
  if (lauf && (lauf.status === 'fehlgeschlagen' || lauf.status === 'abgebrochen')) {
    return <Gescheitert lauf={lauf} beschaeftigt={beschaeftigt} nochmal={nochmal} kostenlos={kostenlos} />
  }
  return <Wartet lauf={lauf} abbrechen={abbrechen} />
}

/** Satz zum Stand: „Teil 2 von 6 ist fertig“, „Die Datei wird gebaut“ */
export function fortschrittSatz(lauf: LaufInfo | null): string {
  if (!lauf) return 'Die Erstellung wird gestartet …'
  if (lauf.status === 'baut') return 'Die Datei wird gebaut …'
  if (lauf.teileGesamt <= 1) return 'Die KI schreibt dein Material …'
  if (lauf.teileFertig === 0) return `Die KI schreibt dein Material, ${lauf.teileGesamt} Teile gleichzeitig …`
  return `${lauf.teileFertig} von ${lauf.teileGesamt} Teilen sind fertig …`
}

function prozent(lauf: LaufInfo | null): number {
  if (!lauf) return 5
  if (lauf.status === 'baut') return 92
  // Teile zählen bis 85 %, der Rest gehört dem Zusammenfügen und Bauen
  return Math.max(8, Math.round((lauf.teileFertig / Math.max(1, lauf.teileGesamt)) * 85))
}

function Wartet({ lauf, abbrechen }: { lauf: LaufInfo | null; abbrechen: () => void }) {
  const [rueckfrage, setRueckfrage] = useState(false)
  return (
    <div className="space-y-6">
      <div className="space-y-5 rounded-2xl border border-ws-line bg-ws-surface p-5 sm:p-6" role="status" aria-live="polite">
        <p className="flex items-center gap-3 font-semibold">
          <Loader2 className="size-5 shrink-0 animate-spin text-ws-green" aria-hidden />
          {fortschrittSatz(lauf)}
        </p>
        <Progress value={prozent(lauf)} className="h-2 bg-ws-raised [&>div]:bg-ws-green" aria-label="Fortschritt der Erstellung" />
        <p className="text-sm leading-relaxed text-ws-muted">
          Das dauert meist ein bis drei Minuten. Du kannst diese Seite offen lassen oder verlassen: Dein Material wird
          trotzdem fertig. Über denselben Link siehst du es wieder.
        </p>
      </div>
      <Button variant="outline" onClick={() => setRueckfrage(true)} className={NEBENAKTION}>
        Abbrechen
      </Button>
      <AlertDialog open={rueckfrage} onOpenChange={setRueckfrage}>
        <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Erstellung abbrechen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {lauf && lauf.kostenEur > 0
                ? `Bis jetzt sind ${euro(lauf.kostenEur)} angefallen. Dieser Betrag wird berechnet, das Ergebnis geht verloren.`
                : 'Es ist noch nichts berechnet worden.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={NEBENAKTION}>Weiter warten</AlertDialogCancel>
            <AlertDialogAction
              onClick={abbrechen}
              className="min-h-11 rounded-xl bg-ws-red font-semibold text-ws-on-accent hover:bg-ws-red-hover"
            >
              Abbrechen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Gescheitert({
  lauf,
  beschaeftigt,
  nochmal,
  kostenlos,
}: {
  lauf: LaufInfo
  beschaeftigt: boolean
  nochmal: () => void
  kostenlos: () => void
}) {
  const abgebrochen = lauf.status === 'abgebrochen'
  const guthaben = lauf.fehlerArt === 'guthaben'
  return (
    <div className="space-y-6" role="alert">
      <div className="space-y-2 rounded-2xl border border-ws-orange/30 bg-ws-orange/10 p-4 sm:p-5">
        <p className="flex items-start gap-3 font-semibold">
          {abgebrochen ? (
            <XCircle className="mt-0.5 size-5 shrink-0 text-ws-orange" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-ws-orange" aria-hidden />
          )}
          {abgebrochen ? 'Die Erstellung wurde abgebrochen.' : (lauf.fehler ?? 'Die Erstellung hat nicht geklappt.')}
        </p>
        {lauf.kostenEur > 0 && (
          <p className="pl-8 text-sm text-ws-muted">Bis dahin angefallene Kosten: {euro(lauf.kostenEur)}.</p>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {!guthaben && (
          <Button onClick={nochmal} disabled={beschaeftigt} className="min-h-12 rounded-2xl bg-ws-green px-6 font-bold text-ws-on-accent hover:bg-ws-green-hover">
            {beschaeftigt ? <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> : <RotateCw className="mr-2 size-5" aria-hidden />}
            Erneut versuchen
          </Button>
        )}
        <Button variant="outline" onClick={kostenlos} disabled={beschaeftigt} className={`${NEBENAKTION} min-h-12 px-6`}>
          Kostenlos mit eigener KI weitermachen
        </Button>
      </div>
    </div>
  )
}
