'use client'

import { Coins, Gift } from 'lucide-react'
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
import type { DirektSperre } from '@/lib/werkzeugkiste'
import { schaetze, schaetzungsSatz, TAGESLIMIT, type ModellPreis } from '@/lib/werkzeugkiste-kosten'
import { GUTHABEN_TEXT } from '@/lib/werkzeugkiste-texte'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'

export interface WegDaten {
  sperre: DirektSperre
  preis: ModellPreis
  usdEur: number
  /** Zeichen je Teil; null = noch nicht geladen */
  teile: number[] | null
}

/**
 * Karte am Ende von Schritt 2 (PROJ-64): erklärt kurz die zwei Wege und nennt
 * beim direkten Weg die Kosten — oder warum er gerade gesperrt ist.
 */
export function WegKarte({ daten, fehler }: { daten: WegDaten | null; fehler: boolean }) {
  const schaetzung = daten?.teile ? schaetze(daten.teile, daten.preis, daten.usdEur) : null
  return (
    <section aria-label="So geht es weiter" className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-4 sm:p-5">
      <h2 className="text-base font-semibold">Wie soll dein Material entstehen?</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex gap-3">
          <Coins className="mt-0.5 size-5 shrink-0 text-ws-green" aria-hidden />
          <div className="space-y-1 text-sm leading-relaxed">
            <p className="font-semibold">Direkt erstellen</p>
            <p className="text-ws-muted">Die App erledigt alles selbst, ohne Kopieren. Das kostet etwas.</p>
            <p className="font-medium text-ws-text" aria-live="polite">
              {daten?.sperre === 'guthaben'
                ? GUTHABEN_TEXT
                : daten?.sperre === 'tageslimit'
                  ? `Heute sind schon ${TAGESLIMIT} direkte Erstellungen erreicht.`
                  : fehler
                    ? 'Die Kosten ließen sich gerade nicht berechnen.'
                    : schaetzung
                      ? schaetzungsSatz(schaetzung)
                      : 'Kosten werden berechnet …'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Gift className="mt-0.5 size-5 shrink-0 text-ws-blue" aria-hidden />
          <div className="space-y-1 text-sm leading-relaxed">
            <p className="font-semibold">Kostenlos mit eigener KI</p>
            <p className="text-ws-muted">Du kopierst einen Prompt in deine KI (z. B. ChatGPT) und fügst die Antwort wieder ein.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Rückfrage vor teuren Läufen (ab etwa 2 €) */
export function KostenRueckfrage({
  satz,
  offen,
  beiAuswahl,
}: {
  satz: string | null
  offen: boolean
  beiAuswahl: (weiter: boolean) => void
}) {
  return (
    <AlertDialog open={offen} onOpenChange={(o) => !o && beiAuswahl(false)}>
      <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
        <AlertDialogHeader>
          <AlertDialogTitle>Das wird etwas teurer</AlertDialogTitle>
          <AlertDialogDescription className="text-ws-muted">{satz}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={NEBENAKTION}>Nein, zurück</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => beiAuswahl(true)}
            className="min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover"
          >
            Trotzdem erstellen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

