'use client'

import { ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import {
  feldOptionen,
  feldSetzen,
  feldSichtbar,
  findeWerkzeug,
  WERKZEUGE,
  type AblaufEinstellungen,
  type EinstellungsFeld,
} from '@/lib/werkzeugkiste'
import type { WerkzeugOption, WerkzeugOptionen } from '@/lib/werkzeugkiste-api'
import { Hinweis } from '@/components/werkzeugkiste/schritt-skript'

/** Leerer Wert in Auswahllisten (Radix erlaubt keinen leeren String) */
const KEIN = '__kein__'

const FELD = 'min-h-11 rounded-xl border-ws-line bg-ws-surface text-ws-text focus:ring-ws-green'
const MENUE = 'border-ws-line bg-ws-surface text-ws-text'

/**
 * Schritt 2 (PROJ-51, ab PROJ-54 für alle Werkzeuge): Werkzeug, Format und die
 * Einstellungen, die das Werkzeug in `felder` beschreibt. Direkt sichtbar sind
 * höchstens drei, der Rest steht unter „Mehr Optionen“. Die Auswahllisten für
 * Niveau, Bildungsgang, Lernfeld und Umfang liefert der Kern, damit sie der
 * alten Werkzeugkiste entsprechen.
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
  const setze = (teil: Partial<AblaufEinstellungen>) => setEinstellungen({ ...einstellungen, ...teil } as AblaufEinstellungen)
  const sichtbar = werkzeug?.felder.filter((f) => feldSichtbar(f, einstellungen)) ?? []
  const direkt = sichtbar.filter((f) => f.ort === 'direkt')
  const mehr = sichtbar.filter((f) => f.ort === 'mehr')
  const feld = (f: EinstellungsFeld) => (
    <FeldAnsicht
      key={f.id}
      feld={f}
      einstellungen={einstellungen}
      optionen={optionen}
      optionenFehler={optionenFehler}
      onChange={(wert) => setEinstellungen(feldSetzen(werkzeugId, einstellungen, f.id, wert))}
    />
  )

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

      {direkt.map(feld)}

      {mehr.length > 0 && (
        <Collapsible className="border-t border-ws-line pt-4">
          <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 rounded-xl text-sm text-ws-muted hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
            <ChevronDown className="size-4 -rotate-90 transition-transform duration-200 group-data-[state=open]:rotate-0" aria-hidden />
            Mehr Optionen
            <span className="text-ws-faint">· {mehr.map((f) => f.label).join(', ')}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-3">{mehr.map(feld)}</div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {werkzeug?.tipps && werkzeug.tipps.length > 0 && (
        <Collapsible className="border-t border-ws-line pt-4">
          <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 rounded-xl text-sm text-ws-muted hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
            <ChevronDown className="size-4 -rotate-90 transition-transform duration-200 group-data-[state=open]:rotate-0" aria-hidden />
            Tipps
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ws-muted">
              {werkzeug.tipps.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

/** Eine Einstellung — Darstellung nach `feld.art`; Auswahllisten vom Kern solange sie laden als Skelett */
function FeldAnsicht({
  feld,
  einstellungen,
  optionen,
  optionenFehler,
  onChange,
}: {
  feld: EinstellungsFeld
  einstellungen: AblaufEinstellungen
  optionen: WerkzeugOptionen | null
  optionenFehler: boolean
  onChange: (wert: string) => void
}) {
  const id = `wk-${feld.id}`
  const wert = einstellungen[feld.id] ?? feld.standard
  const liste = feldOptionen(feld, einstellungen, optionen)
  const brauchtKern = !!feld.quelle && !optionen

  if (feld.art === 'schalter') {
    return (
      <div className="space-y-2">
        <span id={`${id}-label`} className="text-sm font-semibold text-ws-text">
          {feld.label}
        </span>
        {brauchtKern ? (
          optionenFehler ? (
            <Hinweis ton="warnung">Die Auswahllisten konnten nicht geladen werden. Es gelten die Standardwerte ({feld.standard}).</Hinweis>
          ) : (
            <Skeleton className="h-14 w-full rounded-2xl bg-ws-raised/70" />
          )
        ) : (
          <ToggleGroup
            type="single"
            value={wert}
            onValueChange={(v) => v && onChange(v)}
            aria-labelledby={`${id}-label`}
            className={cn(
              'grid grid-cols-2 gap-1 rounded-2xl border border-ws-line bg-ws-surface p-1',
              liste.length >= 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-2',
            )}
          >
            {liste.map((n) => (
              <ToggleGroupItem
                key={n.key}
                value={n.key}
                title={n.label}
                className="min-h-11 rounded-xl px-2 text-sm text-ws-muted hover:bg-ws-raised hover:text-ws-text data-[state=on]:bg-ws-raised data-[state=on]:font-semibold data-[state=on]:text-ws-text"
              >
                {feld.quelle === 'niveaus' ? kurzesNiveau(n) : n.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {feld.hinweis && <p className="text-sm text-ws-muted">{feld.hinweis}</p>}
      </div>
    )
  }

  if (feld.art === 'mehrfach') {
    const gewaehlt = wert.split(',').filter(Boolean)
    const voll = feld.hoechstens !== undefined && gewaehlt.length >= feld.hoechstens
    const umschalten = (key: string, an: boolean) => {
      const neu = liste.filter((o) => (o.key === key ? an : gewaehlt.includes(o.key))).map((o) => o.key)
      if (neu.length > 0) onChange(neu.join(','))
    }
    return (
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold text-ws-text">{feld.label}</legend>
        <div className="flex flex-wrap gap-2">
          {liste.map((o) => {
            const an = gewaehlt.includes(o.key)
            const gesperrt = (!an && voll) || (an && gewaehlt.length === 1)
            return (
              <Label
                key={o.key}
                htmlFor={`${id}-${o.key}`}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-xl border px-3 font-normal transition-colors duration-200',
                  an ? 'border-ws-green bg-ws-green/10' : 'border-ws-line bg-ws-surface',
                  gesperrt ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-ws-raised',
                )}
              >
                <Checkbox
                  id={`${id}-${o.key}`}
                  checked={an}
                  disabled={gesperrt}
                  onCheckedChange={(v) => umschalten(o.key, v === true)}
                  className="border-ws-line data-[state=checked]:border-ws-green data-[state=checked]:bg-ws-green data-[state=checked]:text-ws-on-accent"
                />
                {o.label}
              </Label>
            )
          })}
        </div>
        {feld.hinweis && <p className="text-sm text-ws-muted">{feld.hinweis}</p>}
      </fieldset>
    )
  }

  if (feld.art === 'zahl') {
    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm text-ws-muted">
          {feld.label}
          {feld.einheit && <span className="text-ws-faint"> ({feld.einheit})</span>}
        </Label>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={feld.min}
          max={feld.max}
          step={feld.schritt}
          value={wert}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            // Außerhalb des erlaubten Bereichs zurück auf den nächsten gültigen Wert
            const n = Number(wert)
            const ok = Number.isFinite(n) && wert !== ''
            const begrenzt = ok ? Math.min(feld.max ?? n, Math.max(feld.min ?? n, Math.round(n))) : Number(feld.standard)
            if (String(begrenzt) !== wert) onChange(String(begrenzt))
          }}
          className={FELD}
        />
        {feld.hinweis && <p className="text-sm text-ws-muted">{feld.hinweis}</p>}
      </div>
    )
  }

  if (feld.art === 'text') {
    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm text-ws-muted">
          {feld.label}
        </Label>
        <Input
          id={id}
          type="text"
          maxLength={100}
          value={wert}
          placeholder={feld.platzhalter}
          onChange={(e) => onChange(e.target.value)}
          className={FELD}
        />
        {feld.hinweis && <p className="text-sm text-ws-muted">{feld.hinweis}</p>}
      </div>
    )
  }

  // wahl
  return (
    <div className="space-y-2">
      <Auswahl
        id={id}
        label={feld.label}
        wert={wert}
        optionen={liste}
        leer={feld.leer}
        deaktiviert={brauchtKern ? true : feld.quelle === 'lernfelder' && liste.length === 0}
        onChange={onChange}
      />
      {feld.hinweis && <p className="text-sm text-ws-muted">{feld.hinweis}</p>}
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
