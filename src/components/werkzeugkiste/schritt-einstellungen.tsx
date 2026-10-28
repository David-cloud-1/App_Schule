'use client'

import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { findeWerkzeug, WERKZEUGE, type AblaufEinstellungen } from '@/lib/werkzeugkiste'
import type { WerkzeugOption, WerkzeugOptionen } from '@/lib/werkzeugkiste-api'
import { Hinweis } from '@/components/werkzeugkiste/schritt-skript'

/** Leerer Wert in Auswahllisten (Radix erlaubt keinen leeren String) */
const KEIN = '__kein__'

const FELD = 'min-h-11 rounded-xl border-ws-line bg-ws-surface text-ws-text focus:ring-ws-green'
const MENUE = 'border-ws-line bg-ws-surface text-ws-text'

/**
 * Schritt 2 (PROJ-51): nur Werkzeug, Format und Niveau sind sichtbar.
 * Bildungsgang, Lernfeld und Umfang stehen unter „Mehr Optionen“. Die
 * Auswahllisten liefert der Kern, damit sie der alten Werkzeugkiste entsprechen.
 */
export function SchrittEinstellungen({
  werkzeugId,
  einstellungen,
  optionen,
  optionenFehler,
  setWerkzeug,
  setEinstellungen,
}: {
  werkzeugId: string
  einstellungen: AblaufEinstellungen
  optionen: WerkzeugOptionen | null
  optionenFehler: boolean
  setWerkzeug: (id: string) => void
  setEinstellungen: (e: AblaufEinstellungen) => void
}) {
  const werkzeug = findeWerkzeug(werkzeugId)
  const setze = (teil: Partial<AblaufEinstellungen>) => setEinstellungen({ ...einstellungen, ...teil })
  const lernfelder = optionen?.lernfelder[einstellungen.bildungsgang] ?? []

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="wk-werkzeug" className="text-sm font-semibold text-ws-text">
          Werkzeug
        </Label>
        <Select value={werkzeugId} onValueChange={setWerkzeug}>
          <SelectTrigger id="wk-werkzeug" className={FELD}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={MENUE}>
            {WERKZEUGE.map((w) => (
              <SelectItem key={w.id} value={w.id} disabled={!w.aktiv} className="min-h-11">
                {w.name}
                {!w.aktiv && <span className="ml-2 text-xs text-ws-faint">kommt bald</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {werkzeug && <p className="text-sm text-ws-muted">{werkzeug.beschreibung}</p>}
      </div>

      {werkzeug && werkzeug.formate.length > 1 && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-ws-text">Format</legend>
          <RadioGroup
            value={einstellungen.format}
            onValueChange={(format) => setze({ format })}
            className="grid gap-3 sm:grid-cols-2"
          >
            {werkzeug.formate.map((f) => {
              const an = einstellungen.format === f.id
              return (
                <Label
                  key={f.id}
                  htmlFor={`wk-format-${f.id}`}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border bg-ws-surface p-4 font-normal transition-colors duration-200',
                    an ? 'border-ws-green bg-ws-green/10' : 'border-ws-line hover:bg-ws-raised',
                  )}
                >
                  <RadioGroupItem id={`wk-format-${f.id}`} value={f.id} className="mt-0.5 border-ws-line text-ws-green" />
                  <span className="grid gap-1">
                    <span className="font-semibold text-ws-text">{f.label}</span>
                    <span className="text-sm text-ws-muted">{f.hinweis}</span>
                  </span>
                </Label>
              )
            })}
          </RadioGroup>
        </fieldset>
      )}

      <div className="space-y-2">
        <span id="wk-niveau-label" className="text-sm font-semibold text-ws-text">
          Niveau
        </span>
        {optionen ? (
          <ToggleGroup
            type="single"
            value={einstellungen.niveau}
            onValueChange={(niveau) => niveau && setze({ niveau })}
            aria-labelledby="wk-niveau-label"
            className="grid grid-cols-2 gap-1 rounded-2xl border border-ws-line bg-ws-surface p-1 sm:grid-cols-5"
          >
            {optionen.niveaus.map((n) => (
              <ToggleGroupItem
                key={n.key}
                value={n.key}
                title={n.label}
                className="min-h-11 rounded-xl px-2 text-sm text-ws-muted hover:bg-ws-raised hover:text-ws-text data-[state=on]:bg-ws-raised data-[state=on]:font-semibold data-[state=on]:text-ws-text"
              >
                {kurzesNiveau(n)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : optionenFehler ? (
          <Hinweis ton="warnung">Die Auswahllisten konnten nicht geladen werden. Es gelten die Standardwerte (mittel).</Hinweis>
        ) : (
          <Skeleton className="h-14 w-full rounded-2xl bg-ws-raised/70" />
        )}
      </div>

      <Collapsible className="border-t border-ws-line pt-4">
        <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 rounded-xl text-sm text-ws-muted hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
          <ChevronDown className="size-4 -rotate-90 transition-transform duration-200 group-data-[state=open]:rotate-0" aria-hidden />
          Mehr Optionen
          <span className="text-ws-faint">· Bildungsgang, Lernfeld, Umfang</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          {optionen ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Auswahl
                id="wk-bildungsgang"
                label="Bildungsgang"
                wert={einstellungen.bildungsgang}
                optionen={optionen.bildungsgaenge}
                onChange={(bildungsgang) => setze({ bildungsgang, lernfeld: '' })}
              />
              <Auswahl
                id="wk-lernfeld"
                label="Lernfeld"
                wert={einstellungen.lernfeld}
                optionen={lernfelder}
                leer="keins"
                deaktiviert={lernfelder.length === 0}
                onChange={(lernfeld) => setze({ lernfeld })}
              />
              <Auswahl
                id="wk-umfang"
                label="Umfang"
                wert={einstellungen.umfang}
                optionen={optionen.umfaenge}
                leer="nach Skript"
                onChange={(umfang) => setze({ umfang })}
              />
            </div>
          ) : (
            <p className="text-sm text-ws-muted">Die Optionen werden geladen …</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function Auswahl({
  id,
  label,
  wert,
  optionen,
  leer,
  deaktiviert,
  onChange,
}: {
  id: string
  label: string
  wert: string
  optionen: WerkzeugOption[]
  /** Beschriftung für „nichts gewählt“; ohne Angabe gibt es diese Möglichkeit nicht */
  leer?: string
  deaktiviert?: boolean
  onChange: (wert: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm text-ws-muted">
        {label}
      </Label>
      <Select value={wert || KEIN} onValueChange={(v) => onChange(v === KEIN ? '' : v)} disabled={deaktiviert}>
        <SelectTrigger id={id} className={FELD}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={MENUE}>
          {leer !== undefined && (
            <SelectItem value={KEIN} className="min-h-11">
              {leer}
            </SelectItem>
          )}
          {optionen.map((o) => (
            <SelectItem key={o.key} value={o.key} className="min-h-11">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** „Mittel (mittlerer Schulabschluss / …)“ → „mittel“ — der volle Text steht im title */
export function kurzesNiveau(n: WerkzeugOption): string {
  const kurz = n.label.split('(')[0].trim()
  return kurz ? kurz.charAt(0).toLowerCase() + kurz.slice(1) : n.key
}
