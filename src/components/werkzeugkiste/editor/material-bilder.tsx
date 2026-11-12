'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { OHNE_BILDER, type BilderStand } from '@/components/werkzeugkiste/editor/katalog-dialog'
import { cn } from '@/lib/utils'
import { ladeMaterialBild, ladeMaterialBilder } from '@/lib/werkzeugkiste-api'
import type { MaterialBild } from '@/lib/werkzeugkiste-editor'

/**
 * Bilder des Materials im Baukasten (PROJ-90, E5): Die Liste wird einmal je
 * geöffnetem Editor beim Kern geholt (erst, wenn jemand sie braucht) und dann
 * von Katalog, Bildauswahl und Formularen geteilt. Gespeichert wird nichts.
 */
interface Kontext {
  stand: BilderStand
  bilder: MaterialBild[]
  mehr: boolean
  /** Liste anfordern (lädt nur beim ersten Mal bzw. nach einem Fehler) */
  anfordern: () => void
  /** Ein Bild in Arbeitsgröße (data:-Adresse), zwischengespeichert */
  gross: (pfad: string) => Promise<string>
}

const BilderKontext = createContext<Kontext | null>(null)

export function MaterialBilderProvider({ materialId, children }: { materialId: string; children: ReactNode }) {
  const [stand, setStand] = useState<BilderStand>('laedt')
  const [bilder, setBilder] = useState<MaterialBild[]>([])
  const [mehr, setMehr] = useState(false)
  const laeuft = useRef(false)
  const geladen = useRef(false)
  const grosse = useRef(new Map<string, Promise<string>>())

  const anfordern = useCallback(() => {
    if (laeuft.current || geladen.current) return
    laeuft.current = true
    setStand('laedt')
    ladeMaterialBilder(materialId)
      .then((r) => {
        geladen.current = true
        setBilder(r.bilder)
        setMehr(r.mehr)
        setStand(r.bilder.length)
      })
      .catch(() => setStand('fehler'))
      .finally(() => {
        laeuft.current = false
      })
  }, [materialId])

  const gross = useCallback(
    (pfad: string) => {
      let p = grosse.current.get(pfad)
      if (!p) {
        p = ladeMaterialBild(materialId, pfad).then((r) => r.bild)
        // Fehlschläge nicht merken, damit ein neuer Versuch möglich ist
        p.catch(() => grosse.current.delete(pfad))
        grosse.current.set(pfad, p)
      }
      return p
    },
    [materialId],
  )

  const wert = useMemo(() => ({ stand, bilder, mehr, anfordern, gross }), [stand, bilder, mehr, anfordern, gross])
  return <BilderKontext.Provider value={wert}>{children}</BilderKontext.Provider>
}

/** Bilder des Materials; außerhalb des Editors (Tests, Formular-Vorschau) leer */
export function useMaterialBilder(): Kontext {
  return (
    useContext(BilderKontext) ?? {
      stand: 0,
      bilder: [],
      mehr: false,
      anfordern: () => {},
      gross: () => Promise.reject(new Error('Keine Bilder')),
    }
  )
}

/** Das Bild eines Blocks in Arbeitsgröße laden; null während des Ladens, 'fehler' wenn es nicht geht */
export function useGrossesBild(pfad: string): string | null | 'fehler' {
  const { gross } = useMaterialBilder()
  const [bild, setBild] = useState<{ pfad: string; wert: string | 'fehler' } | null>(null)
  useEffect(() => {
    if (!pfad) return
    let aktiv = true
    gross(pfad)
      .then((b) => aktiv && setBild({ pfad, wert: b }))
      .catch(() => aktiv && setBild({ pfad, wert: 'fehler' }))
    return () => {
      aktiv = false
    }
  }, [pfad, gross])
  if (!pfad) return 'fehler'
  return bild?.pfad === pfad ? bild.wert : null
}

/** Kurzer Anzeigename eines Bildes: `images/seite3_x42.png` → `seite3_x42.png` */
export const bildName = (pfad: string) => pfad.split('/').pop() || pfad

/** Fenster mit allen Bildern des Materials; ein Klick wählt (E5) */
export function BildAuswahl({
  offen,
  onOpenChange,
  onWaehle,
  aktuell,
}: {
  offen: boolean
  onOpenChange: (offen: boolean) => void
  onWaehle: (pfad: string) => void
  aktuell?: string
}) {
  const { stand, bilder, mehr, anfordern } = useMaterialBilder()
  useEffect(() => {
    if (offen) anfordern()
  }, [offen, anfordern])

  return (
    <Dialog open={offen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] w-full max-w-3xl flex-col gap-0 rounded-2xl border-ws-line bg-ws-surface p-0 text-ws-text">
        <DialogHeader className="space-y-1 border-b border-ws-line p-4 pr-14 text-left sm:p-6">
          <DialogTitle className="text-xl font-bold">Bild wählen</DialogTitle>
          <DialogDescription className="text-ws-muted">Bilder aus dem Skript dieses Materials.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {stand === 'laedt' && (
            <div className="flex items-center justify-center gap-2 py-12 text-ws-muted" role="status">
              <Loader2 className="size-5 animate-spin" aria-hidden /> Bilder werden geladen …
            </div>
          )}
          {stand === 'fehler' && (
            <div className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
              <p className="text-ws-muted">Die Bilder konnten gerade nicht geladen werden.</p>
              <Button variant="outline" className={NEBENAKTION} onClick={anfordern}>
                Erneut versuchen
              </Button>
            </div>
          )}
          {stand === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <ImageOff className="size-8 text-ws-faint" aria-hidden />
              <p className="text-ws-muted">{OHNE_BILDER}</p>
            </div>
          )}
          {typeof stand === 'number' && stand > 0 && (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {bilder.map((b) => (
                  <li key={b.pfad}>
                    <button
                      type="button"
                      onClick={() => onWaehle(b.pfad)}
                      aria-pressed={aktuell === b.pfad}
                      className={cn(
                        'flex w-full flex-col gap-1 rounded-xl border bg-ws-bg p-2 text-left transition-colors duration-200 hover:border-ws-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
                        aktuell === b.pfad ? 'border-ws-green' : 'border-ws-line',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- data:-Adresse vom Kern, kein Next-Bild möglich */}
                      <img src={b.vorschau} alt="" className="aspect-[4/3] w-full rounded-lg bg-white object-contain" />
                      <span className="truncate text-xs text-ws-muted" title={bildName(b.pfad)}>
                        {bildName(b.pfad)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {mehr && <p className="mt-3 text-sm text-ws-faint">Es werden die ersten {bilder.length} Bilder gezeigt.</p>}
            </>
          )}
        </div>
        <div className="flex justify-end border-t border-ws-line p-4 sm:px-6">
          <Button variant="outline" className={NEBENAKTION} onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
