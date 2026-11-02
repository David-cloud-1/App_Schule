'use client'

import { ArrowRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Hinweis } from '@/components/werkzeugkiste/schritt-skript'
import {
  ANONYMISIERUNGS_WARNUNG,
  FUND_ART_LABEL,
  alleAbgelehnt,
  wendeErsetzungenAn,
  type Entscheidung,
  type Fund,
} from '@/lib/schulrecht'

/**
 * Personenbezüge im Sachverhalt (PROJ-55, E3): Jeder Fund steht mit seinem
 * Ersetzungsvorschlag auf dem Bildschirm. Die Lehrkraft nimmt ihn an, ändert
 * ihn oder lässt die Stelle stehen. Nichts wird stillschweigend ersetzt; ganz
 * unten steht, wie der Text danach aussieht.
 */
export function SachverhaltFunde({
  sachverhalt,
  funde,
  entscheidungen,
  setEntscheidung,
  bestaetigt,
  setBestaetigt,
}: {
  sachverhalt: string
  funde: Fund[]
  entscheidungen: Record<number, Entscheidung>
  setEntscheidung: (id: number, e: Entscheidung) => void
  /** Ausdrückliche Bestätigung, wenn alle Vorschläge abgelehnt wurden */
  bestaetigt: boolean
  setBestaetigt: (b: boolean) => void
}) {
  const abgelehnt = alleAbgelehnt(funde, entscheidungen)

  if (funde.length === 0) {
    return (
      <div className="space-y-3">
        <Hinweis>
          Es wurden keine Namen, Klassen oder Daten erkannt. Lies den Text trotzdem noch einmal durch: Nicht alles lässt sich automatisch finden.
        </Hinweis>
        <Vorschau text={sachverhalt} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="max-w-prose leading-relaxed text-ws-muted">
        Diese Stellen könnten Personen oder Betriebe erkennbar machen. Prüfe jeden Vorschlag, bevor der Text an eine fremde KI geht.
      </p>

      <ul className="space-y-3">
        {funde.map((fund) => {
          const e = entscheidungen[fund.id]
          const ersetzen = e?.art !== 'ablehnen'
          const wert = e?.art === 'aendern' ? e.text : fund.vorschlag
          return (
            <li key={fund.id} className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-ws-raised px-3 py-1 text-xs font-semibold text-ws-muted">{FUND_ART_LABEL[fund.art]}</span>
                <span className="break-all font-semibold text-ws-text">{fund.text}</span>
                <ArrowRight className="size-4 text-ws-faint" aria-hidden />
                <span className="text-ws-muted">{ersetzen ? (wert.trim() ? wert : '(leer)') : 'bleibt stehen'}</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Label
                  htmlFor={`sr-fund-ersetzen-${fund.id}`}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl"
                >
                  <Checkbox
                    id={`sr-fund-ersetzen-${fund.id}`}
                    checked={ersetzen}
                    onCheckedChange={(v) => setEntscheidung(fund.id, v === true ? { art: 'annehmen' } : { art: 'ablehnen' })}
                  />
                  Ersetzen durch
                </Label>
                <Input
                  aria-label={`Ersatz für ${fund.text}`}
                  value={wert}
                  disabled={!ersetzen}
                  maxLength={60}
                  onChange={(ev) =>
                    setEntscheidung(fund.id, ev.target.value === fund.vorschlag ? { art: 'annehmen' } : { art: 'aendern', text: ev.target.value })
                  }
                  className="min-h-11 flex-1 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green"
                />
              </div>
            </li>
          )
        })}
      </ul>

      {abgelehnt && (
        <div className="space-y-3">
          <Hinweis ton="warnung">{ANONYMISIERUNGS_WARNUNG}</Hinweis>
          <Label htmlFor="sr-bestaetigt" className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl leading-relaxed">
            <Checkbox id="sr-bestaetigt" checked={bestaetigt} onCheckedChange={(v) => setBestaetigt(v === true)} className="mt-0.5" />
            Ich weiß das und möchte den Text so weitergeben.
          </Label>
        </div>
      )}

      <Vorschau text={wendeErsetzungenAn(sachverhalt, funde, entscheidungen)} />
    </div>
  )
}

function Vorschau({ text }: { text: string }) {
  return (
    <section aria-label="So geht der Text an die KI" className="space-y-2">
      <h2 className="text-sm font-semibold text-ws-muted">So geht der Text an die KI</h2>
      <p className="whitespace-pre-wrap break-words rounded-2xl border border-ws-line bg-ws-bg p-4 text-sm leading-relaxed text-ws-text">
        {text}
      </p>
    </section>
  )
}
