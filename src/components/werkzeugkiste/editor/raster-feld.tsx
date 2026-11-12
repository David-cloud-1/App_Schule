'use client'

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { cn } from '@/lib/utils'
import {
  TABELLE_MAX_SPALTEN,
  TABELLE_MAX_ZEILEN,
  datenEinfuegen,
  einfuegeText,
  spaltenZahl,
  spalteEinfuegen,
  spalteLoeschen,
  spalteVerschieben,
  zeileEinfuegen,
  zeileLoeschen,
  zeileVerschieben,
  zelleSetzen,
  type Raster,
} from '@/lib/werkzeugkiste-tabelle'

/**
 * Raster zum Bearbeiten einer Tabelle (PROJ-91). Eine Zelle = ein Eingabefeld.
 * Pfeil hoch/runter springt in die Zelle darüber/darunter, Tab geht weiter, und
 * mehrere Zellen aus Excel oder Word lassen sich in eine Zelle einfügen.
 * Wird von Tabellen- und Diagramm-Formular gemeinsam benutzt.
 */
export function RasterFeld({
  raster,
  onChange,
  beschriftung,
  kopfFett = true,
  fehler,
  zeilenName = 'Zeile',
  spaltenName = 'Spalte',
  maxZeilen = TABELLE_MAX_ZEILEN,
  maxSpalten = TABELLE_MAX_SPALTEN,
  fest,
}: {
  raster: Raster
  onChange: (r: Raster, feld: string) => void
  beschriftung: string
  /** Erste Zeile optisch als Kopf zeigen */
  kopfFett?: boolean
  /** Zellen mit Problem (Zeile-Spalte) → Meldung, wird rot markiert */
  fehler?: Map<string, string>
  zeilenName?: string
  spaltenName?: string
  maxZeilen?: number
  maxSpalten?: number
  /** Diagramm-Daten: Eckfeld gesperrt, erste Zeile (Reihennamen) und erste Spalte (Beschriftungen) bleiben */
  fest?: boolean
}) {
  const wurzel = useRef<HTMLDivElement>(null)
  const breite = spaltenZahl(raster)
  const knopf = 'size-11 shrink-0 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text'

  function fokus(z: number, s: number) {
    wurzel.current?.querySelector<HTMLInputElement>(`[data-zelle="${z}-${s}"]`)?.focus()
  }

  function taste(e: KeyboardEvent<HTMLInputElement>, z: number, s: number) {
    if (e.key === 'ArrowDown' && z < raster.length - 1) {
      e.preventDefault()
      fokus(z + 1, s)
    } else if (e.key === 'ArrowUp' && z > 0) {
      e.preventDefault()
      fokus(z - 1, s)
    }
  }

  function einfuegen(e: ClipboardEvent<HTMLInputElement>, z: number, s: number) {
    const daten = einfuegeText(e.clipboardData.getData('text/plain'))
    if (!daten) return
    e.preventDefault()
    const { raster: neu, gekuerzt } = datenEinfuegen(raster, z, s, daten)
    onChange(neu, 'einfuegen')
    if (gekuerzt) toast.message(`Nur die ersten ${maxZeilen} Zeilen × ${maxSpalten} Spalten wurden übernommen.`)
  }

  return (
    <div ref={wurzel} className="space-y-2">
      <div className="max-w-full overflow-x-auto rounded-xl border border-ws-line" role="group" aria-label={beschriftung}>
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-0 p-0" />
              {raster[0]?.map((_, s) => (
                <th key={s} scope="col" className="min-w-36 border-b border-ws-line bg-ws-raised/50 p-0 font-normal">
                  <div className="flex items-center justify-center">
                    <Button variant="ghost" size="icon" className={knopf} disabled={s === (fest ? 1 : 0) || (fest && s === 0)} onClick={() => onChange(spalteVerschieben(raster, s, -1), 'spalte')} aria-label={`${spaltenName} ${s + 1} nach links`}>
                      <ArrowLeft className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" className={knopf} disabled={s === breite - 1 || (fest && s === 0)} onClick={() => onChange(spalteVerschieben(raster, s, 1), 'spalte')} aria-label={`${spaltenName} ${s + 1} nach rechts`}>
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn(knopf, 'hover:text-ws-red')} disabled={breite <= 1 || (fest && s === 0)} onClick={() => onChange(spalteLoeschen(raster, s), 'spalte')} aria-label={`${spaltenName} ${s + 1} entfernen`}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {raster.map((zeile, z) => (
              <tr key={z}>
                <th scope="row" className="border-r border-ws-line bg-ws-raised/50 p-0 align-middle font-normal">
                  <div className="flex">
                    <Button variant="ghost" size="icon" className={knopf} disabled={z === (fest ? 1 : 0) || (fest && z === 0)} onClick={() => onChange(zeileVerschieben(raster, z, -1), 'zeile')} aria-label={`${zeilenName} ${z + 1} nach oben`}>
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" className={knopf} disabled={z === raster.length - 1 || (fest && z === 0)} onClick={() => onChange(zeileVerschieben(raster, z, 1), 'zeile')} aria-label={`${zeilenName} ${z + 1} nach unten`}>
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn(knopf, 'hover:text-ws-red')} disabled={raster.length <= 1 || (fest && z === 0)} onClick={() => onChange(zeileLoeschen(raster, z), 'zeile')} aria-label={`${zeilenName} ${z + 1} entfernen`}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </th>
                {zeile.map((wert, s) => {
                  const problem = fehler?.get(`${z}-${s}`)
                  const gesperrt = fest && z === 0 && s === 0
                  return (
                    <td key={s} className="border-b border-r border-ws-line p-1 align-top">
                      <Input
                        data-zelle={`${z}-${s}`}
                        value={wert}
                        disabled={gesperrt}
                        aria-label={`${zeilenName} ${z + 1}, ${spaltenName} ${s + 1}`}
                        aria-invalid={problem ? true : undefined}
                        title={problem}
                        onChange={(e) => onChange(zelleSetzen(raster, z, s, e.target.value), `zelle-${z}-${s}`)}
                        onKeyDown={(e) => taste(e, z, s)}
                        onPaste={(e) => einfuegen(e, z, s)}
                        className={cn('min-h-11 rounded-lg', z === 0 && kopfFett && 'font-semibold', problem && 'border-ws-red')}
                      />
                      {problem && <p className="mt-1 text-xs text-ws-red">{problem}</p>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className={NEBENAKTION} disabled={raster.length >= maxZeilen} onClick={() => onChange(zeileEinfuegen(raster, raster.length - 1), 'zeile')}>
          <Plus className="mr-2 size-4" aria-hidden /> {zeilenName} hinzufügen
        </Button>
        <Button variant="outline" className={NEBENAKTION} disabled={breite >= maxSpalten} onClick={() => onChange(spalteEinfuegen(raster, breite - 1), 'spalte')}>
          <Plus className="mr-2 size-4" aria-hidden /> {spaltenName} hinzufügen
        </Button>
      </div>
      <p className="text-xs text-ws-muted">
        Bis zu {maxZeilen} Zeilen und {maxSpalten} Spalten. Zellen aus Excel oder Word lassen sich in eine Zelle einfügen (Strg/⌘ + V).
      </p>
    </div>
  )
}
