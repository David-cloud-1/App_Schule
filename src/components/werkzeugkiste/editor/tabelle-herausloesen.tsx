'use client'

import { useMemo, useState } from 'react'
import { Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { tabelleAusHtml, type HerausgeloesteTabelle } from '@/lib/werkzeugkiste-tabelle'

/**
 * „Tabelle herauslösen“ im Textblock (PROJ-91, E3): macht aus der ersten
 * HTML-Tabelle des Textes einen eigenen Tabellen-Block. Geht dabei etwas verloren
 * (verbundene Zellen, Formatierung), wird es vorher genannt. Rückgängig geht im Editor.
 */
export function TabelleHerausloesen({ html, onHeraus }: { html: string; onHeraus: (d: HerausgeloesteTabelle) => void }) {
  const [warnung, setWarnung] = useState(false)
  const ergebnis = useMemo(() => tabelleAusHtml(html), [html])
  if (!ergebnis) return null
  if (!ergebnis.ok) {
    return <p className="rounded-xl border border-ws-line bg-ws-bg px-3 py-2 text-sm text-ws-muted">Tabelle im Text: {ergebnis.grund}</p>
  }
  const { daten } = ergebnis
  return (
    <div className="space-y-2 rounded-xl border border-ws-line bg-ws-bg p-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-ws-muted">In diesem Text steht eine Tabelle. Als eigener Block lässt sie sich wie in Excel bearbeiten.</p>
        <Button
          variant="outline"
          className={NEBENAKTION}
          onClick={() => (daten.verluste.length ? setWarnung(true) : onHeraus(daten))}
        >
          <Table2 className="mr-2 size-4" aria-hidden /> Tabelle herauslösen
        </Button>
      </div>
      {warnung && (
        <div role="alert" className="space-y-2 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm">
          <p className="font-semibold text-ws-orange">Beim Umwandeln geht verloren:</p>
          <ul className="list-disc space-y-0.5 pl-5 text-ws-text">
            {daten.verluste.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11 rounded-2xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover" onClick={() => onHeraus(daten)}>
              Trotzdem umwandeln
            </Button>
            <Button variant="outline" className={NEBENAKTION} onClick={() => setWarnung(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
