'use client'

import { useState } from 'react'
import { ChevronDown, Copy, Quote } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  absaetzeVon,
  fundstelleKurz,
  KURZFASSUNG_HINWEIS,
  kopierText,
  quellenAngabe,
  RANG_LABEL,
  standAnzeige,
  zerlegeText,
  type FundAbsatz,
  type Fundstelle,
  type NormVerweis,
} from '@/lib/schulrecht'

const NEBENAKTION =
  'min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text'

/**
 * Ein Treffer (PROJ-88): Paragraph und Überschrift zuerst, darunter die
 * Kurzfassung in Alltagssprache, dann der passende Absatz im Wortlaut mit
 * markierten Suchwörtern. Die übrigen Absätze sind eingeklappt und nummeriert.
 *
 * `alleAbsaetze`: beim Durchblättern und im Verweis-Fenster gibt es keinen
 * „passenden“ Absatz – dann stehen alle Absätze offen da.
 */
export function TrefferKarte({
  fundstelle,
  alleAbsaetze = false,
  oeffneVerweis,
}: {
  fundstelle: Fundstelle
  alleAbsaetze?: boolean
  oeffneVerweis?: (v: NormVerweis) => void
}) {
  const absaetze = absaetzeVon(fundstelle)
  const passendNr = !alleAbsaetze && fundstelle.passend && absaetze.some((a) => a.i === fundstelle.passend) ? fundstelle.passend : null
  const passend = passendNr ? absaetze.find((a) => a.i === passendNr)! : !alleAbsaetze ? absaetze[0] : null
  const uebrige = passend ? absaetze.filter((a) => a.i !== passend.i) : []
  const [mehr, setMehr] = useState(false)
  const gesetzesrang = fundstelle.rang === 'gesetz' || fundstelle.rang === 'verordnung'

  async function kopiere(text: string, meldung: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(meldung)
    } catch {
      toast.error('Dein Browser lässt das Kopieren nicht zu. Bitte markiere den Text von Hand.')
    }
  }

  return (
    <article className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-4" aria-label={`${fundstelleKurz(fundstelle)} ${fundstelle.titel}`}>
      <header className="space-y-1">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <h3 className="min-w-0 flex-1 break-words text-base font-bold text-ws-text">
            {fundstelle.nr} <span className="font-semibold">{fundstelle.titel}</span>
          </h3>
          {fundstelle.sicher === true && (
            <Badge variant="outline" className="rounded-full border-ws-green/30 bg-ws-green/15 text-ws-green">
              passt sicher
            </Badge>
          )}
          {fundstelle.sicher === false && (
            <Badge variant="outline" className="rounded-full border-ws-orange/30 bg-ws-orange/15 text-ws-orange" title="Nur ein Suchverfahren sieht diese Stelle vorn. Bitte den Wortlaut selbst prüfen.">
              Vorschlag
            </Badge>
          )}
        </div>
        <p className="text-sm text-ws-muted">
          <span className="font-semibold">{fundstelle.kuerzel}</span> · Stand {standAnzeige(fundstelle.stand)}
          {!gesetzesrang && <span className="text-ws-blue"> · {RANG_LABEL[fundstelle.rang]}</span>}
        </p>
      </header>

      {fundstelle.kurzfassung && (
        <div className="space-y-1">
          <p className="max-w-prose leading-relaxed text-ws-text">{fundstelle.kurzfassung}</p>
          <p className="text-xs text-ws-faint">{KURZFASSUNG_HINWEIS}</p>
        </div>
      )}

      {passend && (
        <AbsatzBlock absatz={passend} hervorheben oeffneVerweis={oeffneVerweis} kuerzel={fundstelle.kuerzel} />
      )}

      {alleAbsaetze && (
        <ol className="space-y-3" aria-label="Absätze">
          {absaetze.map((a) => (
            <li key={a.i}>
              <AbsatzBlock absatz={a} oeffneVerweis={oeffneVerweis} kuerzel={fundstelle.kuerzel} />
            </li>
          ))}
        </ol>
      )}

      {uebrige.length > 0 && (
        <Collapsible open={mehr} onOpenChange={setMehr}>
          <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-medium text-ws-blue hover:text-ws-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
            {mehr ? 'Übrige Absätze ausblenden' : `${uebrige.length} ${uebrige.length === 1 ? 'weiterer Absatz' : 'weitere Absätze'} anzeigen`}
            <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ol className="space-y-3 pt-2" aria-label="Weitere Absätze">
              {uebrige.map((a) => (
                <li key={a.i}>
                  <AbsatzBlock absatz={a} oeffneVerweis={oeffneVerweis} kuerzel={fundstelle.kuerzel} />
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="outline" onClick={() => void kopiere(kopierText(fundstelle), 'Text kopiert')} className={NEBENAKTION}>
          <Copy className="mr-2 size-4" aria-hidden />
          Text kopieren
        </Button>
        <Button variant="outline" onClick={() => void kopiere(quellenAngabe(fundstelle), 'Quelle kopiert')} className={NEBENAKTION}>
          <Quote className="mr-2 size-4" aria-hidden />
          Quelle kopieren
        </Button>
      </div>
    </article>
  )
}

function AbsatzBlock({
  absatz,
  hervorheben = false,
  oeffneVerweis,
  kuerzel,
}: {
  absatz: FundAbsatz
  hervorheben?: boolean
  oeffneVerweis?: (v: NormVerweis) => void
  kuerzel: string
}) {
  const stuecke = zerlegeText(absatz.text, absatz.markiert, oeffneVerweis ? absatz.verweise : [])
  return (
    <div
      className={
        hervorheben
          ? 'space-y-1 rounded-xl border-l-4 border-ws-green bg-ws-raised/60 py-2 pl-3 pr-2'
          : 'space-y-1 border-l-2 border-ws-line pl-3'
      }
    >
      {hervorheben && <p className="text-xs font-semibold uppercase tracking-wide text-ws-muted">Passende Stelle</p>}
      {absatz.kernaussage && !hervorheben && <p className="text-sm font-medium text-ws-muted">{absatz.kernaussage}</p>}
      <p className="max-w-prose whitespace-pre-line break-words text-sm leading-relaxed text-ws-text">
        {stuecke.map((s, n) =>
          s.art === 'mark' ? (
            <mark key={n} className="rounded bg-ws-gold/20 px-0.5 font-semibold text-ws-text">
              {s.text}
            </mark>
          ) : s.art === 'verweis' ? (
            <button
              key={n}
              type="button"
              onClick={() => oeffneVerweis?.(s.verweis)}
              className="rounded text-ws-blue underline decoration-dotted underline-offset-2 hover:text-ws-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
              aria-label={`${s.text}${s.verweis.kuerzel !== kuerzel ? '' : ` ${kuerzel}`} öffnen`}
            >
              {s.text}
            </button>
          ) : (
            <span key={n}>{s.text}</span>
          ),
        )}
      </p>
    </div>
  )
}
