'use client'

import { useId } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { cn } from '@/lib/utils'
import type { Block } from '@/lib/werkzeugkiste-editor'

/**
 * Gemeinsame Bausteine der Block-Formulare im Baukasten (PROJ-89, PROJ-90):
 * Feld, sortierbare Liste, Textliste und kleine Lesehilfen.
 *
 * `onChange(block, feld)`: `feld` fasst Tippen in einem Feld zu einem
 * Rückgängig-Schritt zusammen. Felder, die ein Formular nicht kennt, bleiben erhalten.
 */
export type FormProps = { block: Block; onChange: (block: Block, feld: string) => void }

export type Eintrag = Record<string, unknown>

export const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
export const liste = (v: unknown): Eintrag[] => (Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? (x as Eintrag) : { text: x })) : [])
export const texte = (v: unknown): string[] => (Array.isArray(v) ? v.map(s) : [])

// ── Bausteine ─────────────────────────────────────────────────────────────

export function Feld({
  label,
  wert,
  onChange,
  mehrzeilig,
  hinweis,
  pflicht,
  zeilen = 3,
}: {
  label: string
  wert: string
  onChange: (v: string) => void
  mehrzeilig?: boolean
  hinweis?: React.ReactNode
  pflicht?: boolean
  zeilen?: number
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {pflicht && (
          <span className="ml-1 text-ws-red" aria-hidden>
            *
          </span>
        )}
      </Label>
      {mehrzeilig ? (
        <Textarea
          id={id}
          value={wert}
          rows={zeilen}
          required={pflicht}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl"
        />
      ) : (
        <Input id={id} value={wert} required={pflicht} onChange={(e) => onChange(e.target.value)} className="min-h-11 rounded-xl" />
      )}
      {hinweis && <p className="text-xs text-ws-muted">{hinweis}</p>}
    </div>
  )
}

/** Liste mit Hinzufügen, Entfernen und Verschieben – für Antworten, Karten, Begriffe … */
export function Liste<T>({
  titel,
  eintraege,
  neu,
  onChange,
  einzahl,
  mindestens = 0,
  hinzufuegen,
  children,
}: {
  titel: string
  eintraege: T[]
  neu: () => T
  onChange: (l: T[]) => void
  einzahl: string
  mindestens?: number
  /** Eigener Weg zum Hinzufügen (z. B. Katalog im Kapiteltest) statt `neu()` */
  hinzufuegen?: () => void
  children: (e: T, i: number, setze: (neu: T) => void) => React.ReactNode
}) {
  const setze = (i: number, w: T) => onChange(eintraege.map((x, j) => (j === i ? w : x)))
  const tausche = (i: number, j: number) => {
    const n = [...eintraege]
    ;[n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }
  const knopf = 'size-11 shrink-0 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text'
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">{titel}</legend>
      {eintraege.length === 0 && <p className="text-sm text-ws-faint">Noch keine Einträge.</p>}
      <ol className="space-y-2">
        {eintraege.map((e, i) => (
          <li key={i} className="flex gap-1 rounded-xl border border-ws-line bg-ws-bg p-2">
            <div className="min-w-0 flex-1 space-y-2">{children(e, i, (w) => setze(i, w))}</div>
            <div className="flex shrink-0 flex-col">
              <Button variant="ghost" size="icon" className={knopf} disabled={i === 0} onClick={() => tausche(i, i - 1)} aria-label={`${einzahl} ${i + 1} nach oben`}>
                <ArrowUp className="size-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={knopf}
                disabled={i === eintraege.length - 1}
                onClick={() => tausche(i, i + 1)}
                aria-label={`${einzahl} ${i + 1} nach unten`}
              >
                <ArrowDown className="size-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(knopf, 'hover:text-ws-red')}
                disabled={eintraege.length <= mindestens}
                onClick={() => onChange(eintraege.filter((_, j) => j !== i))}
                aria-label={`${einzahl} ${i + 1} entfernen`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Button variant="outline" className={NEBENAKTION} onClick={hinzufuegen ?? (() => onChange([...eintraege, neu()]))}>
        <Plus className="mr-2 size-4" aria-hidden /> {einzahl} hinzufügen
      </Button>
    </fieldset>
  )
}

export function TextListe({ titel, einzahl, werte, onChange, mindestens = 0 }: { titel: string; einzahl: string; werte: string[]; onChange: (w: string[]) => void; mindestens?: number }) {
  return (
    <Liste titel={titel} einzahl={einzahl} mindestens={mindestens} eintraege={werte} neu={() => ''} onChange={onChange}>
      {(w, i, setze) => <Feld label={`${einzahl} ${i + 1}`} wert={w} onChange={setze} />}
    </Liste>
  )
}

