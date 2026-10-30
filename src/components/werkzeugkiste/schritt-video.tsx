'use client'

import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  pruefeTranskript,
  pruefeVideoLink,
  TRANSKRIPT_MIN_ZEICHEN,
  VIDEO_LINK_MAX_ZEICHEN,
  type Ablauf,
} from '@/lib/werkzeugkiste'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { ChevronDown } from 'lucide-react'

const FELD = 'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green'

/** So kommt man in YouTube an das Transkript – als ruhige Anleitung unter dem Feld */
function Anleitung() {
  return (
    <Collapsible defaultOpen className="rounded-2xl border border-ws-line bg-ws-surface">
      <CollapsibleTrigger className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-sm font-medium text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
        So kommst du an das Transkript
        <ChevronDown className="size-4 text-ws-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-ws-line px-4 py-4">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ws-muted">
          <li>Öffne das Video auf youtube.com.</li>
          <li>Klappe die Beschreibung mit „…mehr“ auf.</li>
          <li>Wähle unten „Transkript anzeigen“.</li>
          <li>Markiere den Text, kopiere ihn und füge ihn hier ein. Die Zeitstempel dürfen drinbleiben.</li>
        </ol>
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Schritt 1 bei Video-Fragen (PROJ-54, Paket D): Link (freiwillig) und
 * Transkript statt einer Datei. Der Link wird nur in den Prompt geschrieben,
 * nie abgerufen.
 */
export function VideoEingabe({
  url,
  setUrl,
  transkript,
  setTranskript,
  deaktiviert,
}: {
  url: string
  setUrl: (u: string) => void
  transkript: string
  setTranskript: (t: string) => void
  deaktiviert?: boolean
}) {
  const linkProblem = pruefeVideoLink(url)
  const laenge = transkript.trim().length
  const zuKurz = laenge > 0 && laenge < TRANSKRIPT_MIN_ZEICHEN
  const zuLang = pruefeTranskript(transkript) !== null && laenge >= TRANSKRIPT_MIN_ZEICHEN

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="wk-video-link" className="text-sm font-semibold text-ws-text">
          Link zum Video <span className="font-normal text-ws-faint">(freiwillig)</span>
        </Label>
        <Input
          id="wk-video-link"
          type="url"
          inputMode="url"
          maxLength={VIDEO_LINK_MAX_ZEICHEN}
          value={url}
          disabled={deaktiviert}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-invalid={!!linkProblem}
          aria-describedby={linkProblem ? 'wk-video-link-fehler' : undefined}
          className={cn(FELD, linkProblem && 'border-ws-red')}
        />
        {linkProblem && (
          <p id="wk-video-link-fehler" role="alert" className="text-sm text-ws-red">
            {linkProblem}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="wk-video-transkript" className="text-sm font-semibold text-ws-text">
          Transkript des Videos
        </Label>
        <Textarea
          id="wk-video-transkript"
          value={transkript}
          disabled={deaktiviert}
          onChange={(e) => setTranskript(e.target.value)}
          placeholder="Hier das komplette Transkript einfügen …"
          aria-invalid={zuKurz || zuLang}
          aria-describedby="wk-video-transkript-info"
          className={cn(FELD, 'min-h-56 resize-y leading-relaxed', (zuKurz || zuLang) && 'border-ws-orange')}
        />
        <p id="wk-video-transkript-info" className={cn('text-sm', zuKurz || zuLang ? 'text-ws-orange' : 'text-ws-faint')}>
          {laenge === 0
            ? 'Mindestens 100 Zeichen.'
            : zuKurz
              ? `Noch zu kurz: ${laenge} von mindestens ${TRANSKRIPT_MIN_ZEICHEN} Zeichen.`
              : zuLang
                ? 'Das Transkript ist zu lang. Bitte kürze es auf den Teil, zu dem Fragen entstehen sollen.'
                : `${laenge.toLocaleString('de-DE')} Zeichen`}
        </p>
      </div>

      <Anleitung />
      <p className="text-sm text-ws-faint">Bitte keine Schülerdaten im Transkript – nur Unterrichtsmaterial.</p>
    </div>
  )
}

/** Schritt 1 eines angelegten Video-Ablaufs: was gelesen wurde, mit Link und Möglichkeit zum Neuanfang */
export function VideoErgebnis({ ablauf, anderesVideo }: { ablauf: Ablauf; anderesVideo?: () => void }) {
  const k = ablauf.kennzahlen
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-ws-green/30 bg-ws-green/10 p-5 sm:flex-row sm:items-center">
        <CheckCircle2 className="size-6 shrink-0 text-ws-green" aria-hidden />
        <div className="grid min-w-0 flex-1 gap-1">
          <span className="font-semibold">Transkript gelesen</span>
          <span className="text-sm text-ws-muted">
            {k?.zeichen !== undefined ? `${k.zeichen.toLocaleString('de-DE')} Zeichen` : 'Transkript liegt vor'}
            {k?.videoUrl ? ' · ' : ''}
            {k?.videoUrl && (
              <span className="break-all" title={k.videoUrl}>
                {k.videoUrl}
              </span>
            )}
          </span>
        </div>
        {anderesVideo && (
          <Button variant="outline" onClick={anderesVideo} className={NEBENAKTION}>
            Anderes Video
          </Button>
        )}
      </div>
      {!k?.videoUrl && (
        <p className="text-sm text-ws-muted">
          Ohne Link bleibt das Feld für den Video-Link im Ergebnis leer. Das H5P-Interactive-Video braucht ihn; trage ihn dann vor dem Einsatz ein.
        </p>
      )}
    </div>
  )
}
