'use client'

import { useId } from 'react'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Feld, s, type FormProps } from '@/components/werkzeugkiste/editor/formular-bausteine'
import { RasterFeld } from '@/components/werkzeugkiste/editor/raster-feld'
import {
  DIAGRAMM_MAX_BESCHRIFTUNGEN,
  DIAGRAMM_MAX_REIHEN,
  diagrammAusRaster,
  diagrammProbleme,
  diagrammRaster,
  leeresRaster,
  rasterAus,
} from '@/lib/werkzeugkiste-tabelle'

/**
 * Formulare für die Blöcke Tabelle und Diagramm (PROJ-91). Beide bearbeiten ein
 * Raster aus reinem Text; das Diagramm liest seine Zahlen erst beim Bauen.
 */

const STILE = [
  { value: 'grau', label: 'Grauer Kopf' },
  { value: 'zebra', label: 'Zebrastreifen' },
  { value: 'beides', label: 'Beides' },
] as const

const ARTEN = [
  { value: 'saeulen', label: 'Säulen' },
  { value: 'balken', label: 'Balken' },
  { value: 'linie', label: 'Linie' },
  { value: 'kreis', label: 'Kreis' },
] as const

/** Leeres optionales Feld entfernen statt "" zu speichern */
function optional(b: FormProps['block'], feld: string, wert: string) {
  const neu = { ...b }
  if (wert) neu[feld] = wert
  else delete neu[feld]
  return neu
}

export function TabelleFormular({ block, onChange }: FormProps) {
  const schalterId = useId()
  const raster = rasterAus(block.zeilen)
  const sichtbar = raster.length ? raster : leeresRaster(2, 2)
  const kopfzeile = block.kopfzeile !== false
  const stil = (STILE.find((x) => x.value === s(block.stil))?.value ?? 'beides') as (typeof STILE)[number]['value']
  return (
    <div className="space-y-4">
      <RasterFeld raster={sichtbar} beschriftung="Zellen der Tabelle" kopfFett={kopfzeile} onChange={(r, feld) => onChange({ ...block, zeilen: r }, feld)} />
      <div className="flex min-h-11 items-center gap-3">
        <Switch id={schalterId} checked={kopfzeile} onCheckedChange={(v) => onChange({ ...block, kopfzeile: v }, 'kopfzeile')} />
        <Label htmlFor={schalterId}>Erste Zeile ist die Kopfzeile</Label>
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Stil</span>
        <div>
          <AdminSegmented ariaLabel="Stil der Tabelle" value={stil} onChange={(v) => onChange({ ...block, stil: v }, 'stil')} options={STILE} />
        </div>
      </div>
      <Feld label="Bildunterschrift (optional)" wert={s(block.caption)} onChange={(v) => onChange(optional(block, 'caption', v), 'caption')} />
    </div>
  )
}

export function DiagrammFormular({ block, onChange }: FormProps) {
  const art = (ARTEN.find((x) => x.value === s(block.art))?.value ?? 'saeulen') as (typeof ARTEN)[number]['value']
  const roh = diagrammRaster(block)
  const raster = roh.length ? roh : leeresRaster(2, 2)
  const { fehler, hinweise } = diagrammProbleme(block)
  const zellenFehler = new Map(fehler.filter((f) => f.zeile !== undefined).map((f) => [`${f.zeile}-${f.spalte}`, f.meldung]))
  const allgemein = fehler.filter((f) => f.zeile === undefined)
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Art des Diagramms</span>
        <div>
          <AdminSegmented ariaLabel="Art des Diagramms" value={art} onChange={(v) => onChange({ ...block, art: v }, 'art')} options={ARTEN} />
        </div>
      </div>
      <Feld label="Titel" wert={s(block.titel)} onChange={(v) => onChange(optional(block, 'titel', v), 'titel')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld label="Beschriftung der Wertachse" wert={s(block.achse)} onChange={(v) => onChange(optional(block, 'achse', v), 'achse')} hinweis="z. B. Umsatz" />
        <Feld label="Einheit" wert={s(block.einheit)} onChange={(v) => onChange(optional(block, 'einheit', v), 'einheit')} hinweis="z. B. € oder %" />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-semibold">Daten</span>
        <p className="text-xs text-ws-muted">
          Oben stehen die Namen der Reihen, links die Beschriftungen. Zahlen mit Komma, z. B. 12,5. Leere Zellen bleiben Lücken.
        </p>
        <RasterFeld
          fest
          raster={raster}
          beschriftung="Daten des Diagramms"
          zeilenName="Beschriftung"
          spaltenName="Reihe"
          maxZeilen={DIAGRAMM_MAX_BESCHRIFTUNGEN + 1}
          maxSpalten={DIAGRAMM_MAX_REIHEN + 1}
          fehler={zellenFehler}
          onChange={(r, feld) => onChange({ ...block, ...diagrammAusRaster(r) }, feld)}
        />
      </div>
      {(allgemein.length > 0 || hinweise.length > 0) && (
        <ul className="space-y-1 rounded-xl border border-ws-line bg-ws-bg px-3 py-2 text-sm" aria-live="polite">
          {allgemein.map((f) => (
            <li key={f.meldung} className="text-ws-red">
              {f.meldung}
            </li>
          ))}
          {hinweise.map((h) => (
            <li key={h} className="text-ws-orange">
              {h}
            </li>
          ))}
        </ul>
      )}
      <Feld label="Bildunterschrift (optional)" wert={s(block.caption)} onChange={(v) => onChange(optional(block, 'caption', v), 'caption')} />
    </div>
  )
}
