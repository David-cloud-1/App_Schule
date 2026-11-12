'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminErrorState } from '@/components/admin/admin-states'
import { TrefferKarte } from '@/components/schulrecht/treffer-karte'
import { VerweisFenster } from '@/components/schulrecht/verweis-fenster'
import { ladeNorm, ladeVorschrift, SchulrechtFehler } from '@/lib/schulrecht-api'
import { RANG_LABEL, standAnzeige, type Fundstelle, type NormVerweis, type Rechtsquelle, type VorschriftInhalt } from '@/lib/schulrecht'

const TRIGGER =
  'group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green'

/**
 * „Vorschriften durchblättern“ (PROJ-55): jede Rechtsquelle zeigt ihr
 * Inhaltsverzeichnis, jede Norm lässt sich aufklappen. Inhaltsverzeichnis und
 * Wortlaut werden erst beim Öffnen geladen, damit die Seite schlank bleibt.
 * Seit PROJ-88 mit Kurzfassung, nummerierten Absätzen und anklickbaren Verweisen.
 */
export function VorschriftenDurchblaettern({ quellen }: { quellen: Rechtsquelle[] }) {
  const [verweis, setVerweis] = useState<NormVerweis | null>(null)
  return (
    <>
      <ul className="space-y-2">
        {quellen.map((q) => (
          <li key={q.kuerzel}>
            <Quelle quelle={q} oeffneVerweis={setVerweis} />
          </li>
        ))}
      </ul>
      <VerweisFenster ziel={verweis} schliessen={() => setVerweis(null)} />
    </>
  )
}

function Quelle({ quelle, oeffneVerweis }: { quelle: Rechtsquelle; oeffneVerweis: (v: NormVerweis) => void }) {
  const [offen, setOffen] = useState(false)
  const [inhalt, setInhalt] = useState<VorschriftInhalt | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [versuch, setVersuch] = useState(0)

  useEffect(() => {
    if (!offen || inhalt) return
    let aktiv = true
    ladeVorschrift(quelle.kuerzel)
      .then((i) => aktiv && setInhalt(i))
      .catch((e: unknown) => aktiv && setFehler(e instanceof SchulrechtFehler ? e.message : 'Die Vorschrift konnte nicht geladen werden.'))
    return () => {
      aktiv = false
    }
  }, [offen, inhalt, quelle.kuerzel, versuch])

  return (
    <Collapsible open={offen} onOpenChange={setOffen} className="rounded-2xl border border-ws-line bg-ws-surface">
      <CollapsibleTrigger className={TRIGGER}>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ws-text">{quelle.kuerzel}</span>
          <span className="block truncate text-sm text-ws-muted" title={quelle.titel}>
            {quelle.titel}
          </span>
          <span className="block text-xs text-ws-faint">
            {quelle.normen} Normen · Stand {standAnzeige(quelle.stand)}
            {quelle.rang !== 'gesetz' && quelle.rang !== 'verordnung' ? ` · ${RANG_LABEL[quelle.rang]}` : ''}
          </span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-ws-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-ws-line p-3">
          {fehler ? (
            <AdminErrorState message={fehler} onRetry={() => {
              setFehler(null)
              setVersuch((v) => v + 1)
            }} />
          ) : !inhalt ? (
            <div className="space-y-2" role="status" aria-label="Wird geladen">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-11 rounded-xl bg-ws-raised" />
              ))}
            </div>
          ) : (
            <ul className="space-y-1">
              {inhalt.normen.map((n) => (
                <li key={n.nr}>
                  <NormZeile kuerzel={quelle.kuerzel} nr={n.nr} titel={n.titel} oeffneVerweis={oeffneVerweis} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function NormZeile({
  kuerzel,
  nr,
  titel,
  oeffneVerweis,
}: {
  kuerzel: string
  nr: string
  titel: string
  oeffneVerweis: (v: NormVerweis) => void
}) {
  const [offen, setOffen] = useState(false)
  const [fundstelle, setFundstelle] = useState<Fundstelle | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [versuch, setVersuch] = useState(0)

  useEffect(() => {
    if (!offen || fundstelle) return
    let aktiv = true
    ladeNorm(kuerzel, nr)
      .then((r) => aktiv && setFundstelle(r.fundstelle))
      .catch((e: unknown) => aktiv && setFehler(e instanceof SchulrechtFehler ? e.message : 'Die Norm konnte nicht geladen werden.'))
    return () => {
      aktiv = false
    }
  }, [offen, fundstelle, kuerzel, nr, versuch])

  return (
    <Collapsible open={offen} onOpenChange={setOffen}>
      <CollapsibleTrigger className={`${TRIGGER} hover:bg-ws-raised`}>
        <span className="w-20 shrink-0 text-sm font-semibold text-ws-text">{nr}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ws-muted" title={titel}>
          {titel}
        </span>
        <ChevronDown className="size-4 shrink-0 text-ws-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-2 pl-3 pr-1 pt-1">
        {fehler ? (
          <AdminErrorState message={fehler} onRetry={() => {
              setFehler(null)
              setVersuch((v) => v + 1)
            }} />
        ) : !fundstelle ? (
          <Skeleton className="h-24 rounded-xl bg-ws-raised" role="status" aria-label="Wird geladen" />
        ) : (
          <TrefferKarte fundstelle={fundstelle} alleAbsaetze oeffneVerweis={oeffneVerweis} />
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
