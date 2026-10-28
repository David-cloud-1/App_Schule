'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { VerbrauchAnsicht } from '@/lib/werkzeugkiste-verbrauch'

const ZUERST = 10

/** Monatsauswahl, Summe und Liste der Läufe. Der Monat steht in der Adresse (?verbrauch=2026-10). */
export function KontoVerbrauchAnsicht({ ansicht }: { ansicht: VerbrauchAnsicht }) {
  const router = useRouter()
  const pfad = usePathname()
  const [alle, setAlle] = useState(false)
  const { gewaehlt, monate } = ansicht
  const zeilen = alle ? gewaehlt.zeilen : gewaehlt.zeilen.slice(0, ZUERST)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold tracking-tight text-ws-text" aria-live="polite">
            {gewaehlt.summe}
          </p>
          <p className="mt-0.5 text-sm text-ws-muted">
            {gewaehlt.anzahl === 0
              ? 'In diesem Monat nichts verbraucht'
              : `aus ${gewaehlt.anzahl} ${gewaehlt.anzahl === 1 ? 'direkten Erstellung' : 'direkten Erstellungen'}`}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="verbrauch-monat" className="text-xs text-ws-muted">
            Monat
          </Label>
          <Select
            value={gewaehlt.key}
            onValueChange={(key) => {
              setAlle(false)
              router.push(`${pfad}?verbrauch=${key}#verbrauch`, { scroll: false })
            }}
          >
            <SelectTrigger id="verbrauch-monat" className="min-h-11 w-48 rounded-xl border-ws-line bg-ws-bg/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monate.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {zeilen.length > 0 && (
        <ul className="divide-y divide-ws-line rounded-xl border border-ws-line" aria-label={`Läufe im ${gewaehlt.label}`}>
          {zeilen.map((z) => (
            <li key={z.id} className="grid gap-0.5 px-3 py-2.5 sm:grid-cols-[4rem_1fr_auto] sm:items-baseline sm:gap-3">
              <div className="flex items-baseline justify-between gap-3 sm:contents">
                <span className="text-sm text-ws-muted">{z.datum}</span>
                <span className="text-sm font-semibold tabular-nums text-ws-text sm:order-last">{z.betrag}</span>
              </div>
              <p className="min-w-0 text-sm text-ws-text">
                <span className="text-ws-muted">{z.werkzeug} · </span>
                <span className="break-words" title={z.titel}>
                  {z.titel}
                </span>
                {z.abgebrochen && <span className="ml-2 rounded-full bg-ws-orange/15 px-2 py-0.5 text-xs text-ws-orange">abgebrochen</span>}
              </p>
            </li>
          ))}
        </ul>
      )}

      {gewaehlt.zeilen.length > ZUERST && !alle && (
        <Button variant="outline" onClick={() => setAlle(true)} className="min-h-11 rounded-xl border-ws-line">
          Mehr anzeigen ({gewaehlt.zeilen.length - ZUERST} weitere)
        </Button>
      )}

      <p className="text-xs text-ws-faint">Beträge ca., umgerechnet aus US-Dollar. Maßgeblich ist die Abrechnung beim Anbieter.</p>
    </div>
  )
}
