'use client'

import { useState } from 'react'
import { ChevronDown, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { fundstelleKurz, kopierText, RANG_LABEL, standAnzeige, type Fundstelle } from '@/lib/schulrecht'

/**
 * Eine Fundstelle im Wortlaut (PROJ-55): Vorschrift, Paragraph, Überschrift
 * und Stand-Datum in der Kopfzeile, darunter aufklappbar der Text. Der erste
 * Treffer einer Suche ist aufgeklappt. Treffer der Ähnlichkeitssuche sind als
 * „ungeprüft“ gekennzeichnet, Verwaltungsvorschriften als ohne Gesetzeskraft.
 */
export function FundstelleKarte({
  fundstelle,
  startOffen = false,
}: {
  fundstelle: Fundstelle
  startOffen?: boolean
}) {
  const [offen, setOffen] = useState(startOffen)
  const gesetzesrang = fundstelle.rang === 'gesetz' || fundstelle.rang === 'verordnung'

  async function kopiere() {
    try {
      await navigator.clipboard.writeText(kopierText(fundstelle))
      toast.success('Text kopiert')
    } catch {
      toast.error('Dein Browser lässt das Kopieren nicht zu. Bitte markiere den Text von Hand.')
    }
  }

  return (
    <Collapsible open={offen} onOpenChange={setOffen} asChild>
      <article className="rounded-2xl border border-ws-line bg-ws-surface">
        <CollapsibleTrigger
          className="group flex min-h-14 w-full items-start gap-3 rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
          aria-label={`${fundstelleKurz(fundstelle)} ${fundstelle.titel}, Wortlaut ${offen ? 'zuklappen' : 'aufklappen'}`}
        >
          <span className="min-w-0 flex-1 space-y-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-ws-text">{fundstelleKurz(fundstelle)}</span>
              {fundstelle.ungeprueft && (
                <Badge variant="outline" className="rounded-full border-ws-orange/30 bg-ws-orange/15 text-ws-orange">
                  ungeprüft
                </Badge>
              )}
              {!gesetzesrang && (
                <Badge variant="outline" className="rounded-full border-ws-blue/30 bg-ws-blue/15 text-ws-blue">
                  {RANG_LABEL[fundstelle.rang]}
                </Badge>
              )}
            </span>
            <span className="block break-words text-ws-text" title={fundstelle.titel}>
              {fundstelle.titel}
            </span>
            <span className="block text-sm text-ws-muted">
              {fundstelle.vorschrift} · Stand {standAnzeige(fundstelle.stand)}
            </span>
          </span>
          <ChevronDown
            className="mt-1 size-5 shrink-0 text-ws-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 border-t border-ws-line p-4">
            {fundstelle.ungeprueft && (
              <p className="text-sm text-ws-muted">
                Dieser Treffer kommt aus der Ähnlichkeitssuche und ist nicht sicher richtig. Bitte lies den Wortlaut selbst.
              </p>
            )}
            <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-ws-text">{fundstelle.text}</p>
            <Button
              variant="outline"
              onClick={kopiere}
              className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
            >
              <Copy className="mr-2 size-4" aria-hidden />
              Text kopieren
            </Button>
          </div>
        </CollapsibleContent>
      </article>
    </Collapsible>
  )
}
