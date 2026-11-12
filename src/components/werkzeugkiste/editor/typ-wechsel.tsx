'use client'

import { useState } from 'react'
import { AlertTriangle, ArrowRightLeft, Check, Info } from 'lucide-react'
import { toast } from 'sonner'
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
import { Button } from '@/components/ui/button'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { KatalogDialog } from '@/components/werkzeugkiste/editor/katalog-dialog'
import { planeWechsel, wechselZiele, type WechselPlan } from '@/lib/werkzeugkiste-blocktyp-wechsel'
import { typName, type Block } from '@/lib/werkzeugkiste-editor'

/**
 * Typ wechseln (PROJ-95): Katalog im Wechsel-Modus, dann ein Dialog mit „Wird übernommen /
 * Geht verloren / Bitte prüfen“. Erst „Wechseln“ ändert den Block. Unveränderte Beispielblöcke
 * bekommen ohne Dialog das Beispiel des Zieltyps (E4).
 */
export function TypWechsel({
  offen,
  onOpenChange,
  block,
  onWechsel,
  erlaubt,
  rueckgaengig,
}: {
  offen: boolean
  onOpenChange: (offen: boolean) => void
  block: Block
  onWechsel: (neu: Block) => void
  /** Kapiteltest: nur diese Typen */
  erlaubt?: readonly string[]
  /** Macht den Wechsel im Toast rückgängig (Schritt des Editors) */
  rueckgaengig?: () => void
}) {
  const typ = String(block.type ?? '')
  const [plan, setPlan] = useState<{ ziel: string; plan: WechselPlan } | null>(null)
  const waehlbar = wechselZiele(typ).filter((z) => !erlaubt || erlaubt.includes(z))

  function gewaehlt(ziel: string) {
    const p = planeWechsel(block, ziel)
    if (!p) return
    onOpenChange(false)
    if (p.beispiel) {
      fertig(ziel, p)
      return
    }
    setPlan({ ziel, plan: p })
  }

  function fertig(ziel: string, p: WechselPlan) {
    onWechsel(p.block)
    setPlan(null)
    toast.success(`Typ gewechselt zu ${typName(ziel)}`, rueckgaengig ? { action: { label: 'Rückgängig', onClick: rueckgaengig } } : undefined)
  }

  const p = plan?.plan
  const verlust = !!p && p.verloren.length > 0
  return (
    <>
      <KatalogDialog
        offen={offen}
        onOpenChange={onOpenChange}
        onWaehle={gewaehlt}
        erlaubt={erlaubt}
        wechsel={{ aktuell: typ, waehlbar }}
      />
      <AlertDialog open={plan !== null} onOpenChange={(o) => !o && setPlan(null)}>
        <AlertDialogContent className="max-h-[90svh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Von {typName(typ)} zu {plan ? typName(plan.ziel) : ''} wechseln?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {verlust ? 'Dabei geht etwas verloren. Mit „Rückgängig“ bekommst du den alten Block zurück.' : 'Es geht nichts verloren.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {p && (
            <div className="space-y-3 text-sm">
              {p.uebernommen.length > 0 && (
                <Abschnitt titel="Wird übernommen" icon={<Check className="size-4 text-ws-green" aria-hidden />} eintraege={p.uebernommen} />
              )}
              {p.verloren.length > 0 && (
                <Abschnitt
                  titel="Geht verloren"
                  icon={<AlertTriangle className="size-4 text-ws-orange" aria-hidden />}
                  eintraege={p.verloren}
                  warnung
                />
              )}
              {p.pruefen.length > 0 && (
                <Abschnitt titel="Bitte prüfen" icon={<Info className="size-4 text-ws-blue" aria-hidden />} eintraege={p.pruefen} />
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className={NEBENAKTION} autoFocus={verlust}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
              autoFocus={!verlust}
              onClick={() => plan && fertig(plan.ziel, plan.plan)}
            >
              Wechseln
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Abschnitt({ titel, icon, eintraege, warnung }: { titel: string; icon: React.ReactNode; eintraege: string[]; warnung?: boolean }) {
  return (
    <section
      aria-label={titel}
      className={warnung ? 'rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3' : 'rounded-xl border border-ws-line bg-ws-bg p-3'}
    >
      <h4 className="mb-1 flex items-center gap-2 font-semibold text-ws-text">
        {icon}
        {titel}
      </h4>
      <ul className="list-disc space-y-0.5 pl-6 text-ws-muted">
        {eintraege.map((e) => (
          <li key={e} className={warnung ? 'text-ws-text' : undefined}>
            {e}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Knopf „Typ wechseln“ für geöffnete Blöcke und Kapiteltest-Fragen; fehlt bei Typen ohne Familie */
export function TypWechselKnopf({
  block,
  onWechsel,
  erlaubt,
  beschriftung = 'Typ wechseln',
  rueckgaengig,
}: {
  block: Block
  onWechsel: (neu: Block) => void
  erlaubt?: readonly string[]
  beschriftung?: string
  rueckgaengig?: () => void
}) {
  const [offen, setOffen] = useState(false)
  const typ = String(block.type ?? '')
  if (!wechselZiele(typ).some((z) => !erlaubt || erlaubt.includes(z))) return null
  return (
    <>
      <Button type="button" variant="outline" className={NEBENAKTION} onClick={() => setOffen(true)}>
        <ArrowRightLeft className="mr-2 size-4" aria-hidden />
        {beschriftung}
      </Button>
      <TypWechsel offen={offen} onOpenChange={setOffen} block={block} onWechsel={onWechsel} erlaubt={erlaubt} rueckgaengig={rueckgaengig} />
    </>
  )
}
