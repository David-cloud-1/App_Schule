'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, X } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { ABLAUF_SCHRITTE, DIREKT_SCHRITTE, WERKZEUGKISTE_HREF } from '@/lib/werkzeugkiste'
import { HilfeAngebot, HilfeKnopf, HilfePanel, type HilfeKontext, type HilfeSteuerung } from '@/components/werkzeugkiste/ablauf-assistent'

export const HAUPTAKTION =
  'min-h-12 w-full rounded-2xl bg-ws-green px-6 text-base font-bold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green sm:w-auto'
export const NEBENAKTION =
  'min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text'

/**
 * Rahmen des geführten Ablaufs (PROJ-51): ohne Seitenleiste, oben Schließen,
 * Titel und Kurzinfo, darunter die Fortschrittsanzeige, der Inhalt schmal in
 * der Mitte und unten „Zurück“ links, die eine Hauptaktion rechts.
 */
export function AblaufRahmen({
  schritt,
  erreicht,
  direkt,
  schritte,
  kopfTitel = 'Neues Material',
  kurzinfo,
  titel,
  beschreibung,
  schliessen,
  fuss,
  hilfe,
  children,
}: {
  schritt: number
  /** Weitester erreichter Schritt: davor gilt alles als erledigt */
  erreicht: number
  /** Direkter Weg (PROJ-64): vier Schritte statt fünf */
  direkt?: boolean
  /** Eigene Schrittfolge (PROJ-55: Aktennotiz mit drei Schritten) */
  schritte?: { nr: number; label: string }[]
  /** Titel in der Kopfzeile, Standard „Neues Material“ */
  kopfTitel?: string
  kurzinfo?: string
  titel: string
  beschreibung?: React.ReactNode
  schliessen: React.ReactNode
  fuss?: React.ReactNode
  /** PROJ-87: Assistent „Schritt für Schritt“; ohne Angabe oder ohne fertige Hilfeseiten bleibt alles wie bisher */
  hilfe?: { steuerung: HilfeSteuerung; kontext: HilfeKontext }
  children: React.ReactNode
}) {
  const ueberschrift = useRef<HTMLHeadingElement>(null)

  // Beim Schrittwechsel liest der Screenreader die neue Überschrift vor
  useEffect(() => {
    ueberschrift.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [schritt])

  return (
    <div className="flex min-h-svh flex-col bg-ws-bg text-ws-text">
      <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-ws-line bg-ws-surface px-3 sm:px-6 print:hidden">
        {schliessen}
        <div className="grid min-w-0 leading-tight">
          <span className="text-sm font-bold sm:text-base">{kopfTitel}</span>
          {kurzinfo && (
            <span className="truncate text-xs text-ws-muted sm:text-sm" title={kurzinfo}>
              {kurzinfo}
            </span>
          )}
        </div>
        {hilfe && <HilfeKnopf steuerung={hilfe.steuerung} />}
      </header>

      <main
        id="ws-main"
        tabIndex={-1}
        className={cn(
          'mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-6 outline-none sm:px-6 sm:py-8',
          // Offene Schublade darf das Ende des Formulars nicht verdecken (ab 1536 px steht der Assistent daneben)
          hilfe?.steuerung.verfuegbar && hilfe.steuerung.offen && (hilfe.steuerung.eingeklappt ? 'pb-24 2xl:pb-8' : 'pb-[55svh] 2xl:pb-8'),
        )}
      >
        <Fortschritt schritt={schritt} erreicht={erreicht} direkt={direkt} schritte={schritte} />
        {hilfe && <HilfeAngebot steuerung={hilfe.steuerung} />}

        <div className="space-y-2">
          <h1 ref={ueberschrift} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">
            {titel}
          </h1>
          {beschreibung && <p className="max-w-prose leading-relaxed text-ws-muted">{beschreibung}</p>}
        </div>

        <div className="flex-1 space-y-6">{children}</div>

        {fuss && (
          <div
            data-hilfe="weiter"
            className="flex flex-col-reverse gap-3 border-t border-ws-line pt-6 sm:flex-row sm:items-center sm:justify-between"
          >
            {fuss}
          </div>
        )}
      </main>
      {hilfe && <HilfePanel steuerung={hilfe.steuerung} kontext={hilfe.kontext} />}
    </div>
  )
}

/** Fünf Schritte (direkt: vier); auf dem Handy als „Schritt 2 von 5 · Einstellungen“ mit Balken */
export function Fortschritt({
  schritt,
  erreicht,
  direkt,
  schritte: eigene,
}: {
  schritt: number
  erreicht: number
  direkt?: boolean
  schritte?: { nr: number; label: string }[]
}) {
  const schritte = eigene ?? (direkt ? DIREKT_SCHRITTE : ABLAUF_SCHRITTE)
  const position = Math.max(1, schritte.findIndex((s) => s.nr === schritt) + 1)
  const aktuell = schritte[position - 1]
  return (
    <nav aria-label="Fortschritt">
      <div className="space-y-2 sm:hidden">
        <p className="text-sm text-ws-muted">
          Schritt {position} von {schritte.length} · <span className="font-semibold text-ws-text">{aktuell.label}</span>
        </p>
        <Progress
          value={(position / schritte.length) * 100}
          className="h-2 bg-ws-raised [&>div]:bg-ws-green"
          aria-label={`Schritt ${position} von ${schritte.length}`}
        />
      </div>
      <ol className="hidden items-center gap-2 sm:flex">
        {schritte.map((s, i) => {
          const erledigt = s.nr < Math.max(schritt, erreicht) || schritt === 5
          const istAktuell = s.nr === schritt
          return (
            <li key={s.nr} className="flex flex-1 items-center gap-2 last:flex-none">
              <span
                className={cn('flex items-center gap-2 whitespace-nowrap text-sm', istAktuell ? 'font-semibold text-ws-text' : 'text-ws-faint')}
                aria-current={istAktuell ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full border text-xs font-bold',
                    istAktuell && 'border-ws-green bg-ws-green text-ws-on-accent',
                    !istAktuell && erledigt && 'border-ws-green/30 bg-ws-green/15 text-ws-green',
                    !istAktuell && !erledigt && 'border-ws-line',
                  )}
                >
                  {erledigt ? <Check className="size-4" aria-hidden /> : s.nr}
                </span>
                {s.label}
                {erledigt && !istAktuell && <span className="sr-only">(erledigt)</span>}
              </span>
              {i < schritte.length - 1 && (
                <span aria-hidden className={cn('h-0.5 min-w-4 flex-1 rounded-full', s.nr < schritt ? 'bg-ws-green' : 'bg-ws-raised')} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * ✕ oben links. Mit `rueckfrage` erst nach Bestätigung — dann läuft
 * `beimAbbrechen` (z. B. den Ablauf löschen), danach geht es zur Werkzeugkiste.
 */
export function SchliessenKnopf({
  rueckfrage,
  beimAbbrechen,
  ziel = WERKZEUGKISTE_HREF,
}: {
  /** Wohin der Knopf führt (Standard: Werkzeugkiste; PROJ-55: Schulrecht) */
  ziel?: string
  /** `knopf`: Beschriftung der Bestätigung (Standard „Abbrechen“); `harmlos`: nichts geht verloren, deshalb nicht rot */
  rueckfrage?: { titel: string; text: string; knopf?: string; harmlos?: boolean }
  beimAbbrechen?: () => Promise<void>
}) {
  const [offen, setOffen] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const knopf = 'size-11 shrink-0 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text'

  if (!rueckfrage) {
    return (
      <Button asChild variant="ghost" size="icon" className={knopf}>
        <Link href={ziel} aria-label="Schließen und zurück">
          <X className="size-5" aria-hidden />
        </Link>
      </Button>
    )
  }

  async function abbrechen() {
    setLaeuft(true)
    try {
      await beimAbbrechen?.()
    } catch {
      // Ein Entwurf wird ohnehin nach 7 Tagen gelöscht — nicht festhalten
    } finally {
      window.location.href = ziel
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className={knopf} aria-label="Abbrechen" onClick={() => setOffen(true)}>
        <X className="size-5" aria-hidden />
      </Button>
      <AlertDialog open={offen} onOpenChange={setOffen}>
        <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>{rueckfrage.titel}</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">{rueckfrage.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={NEBENAKTION}>Weitermachen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void abbrechen()
              }}
              disabled={laeuft}
              className={
                rueckfrage.harmlos
                  ? 'min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover'
                  : 'min-h-11 rounded-xl bg-ws-red font-semibold text-ws-on-accent hover:bg-ws-red-hover'
              }
            >
              {laeuft && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              {rueckfrage.knopf ?? 'Abbrechen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
