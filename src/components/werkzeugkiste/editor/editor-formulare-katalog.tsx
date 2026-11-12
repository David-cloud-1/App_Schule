'use client'

import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { Feld, Liste, TextListe, liste, s, texte, type Eintrag, type FormProps } from '@/components/werkzeugkiste/editor/formular-bausteine'
import { BildAuswahl } from '@/components/werkzeugkiste/editor/bild-dialog'
import { bildName, useGrossesBild } from '@/components/werkzeugkiste/editor/material-bilder'
import { DiagrammFormular, TabelleFormular } from '@/components/werkzeugkiste/editor/editor-formulare-tabelle'
import { cn } from '@/lib/utils'
import type { Block } from '@/lib/werkzeugkiste-editor'

/**
 * Formulare für die 18 Typen, die PROJ-89 nur als Rohfassung kannte (PROJ-90).
 * Grundlage sind die Feldnamen, die `seite.py` liest. Viele Typen akzeptieren
 * zwei Namen (`schritte`/`steps`): Das Formular zeigt ein Feld und schreibt in
 * den Namen, den der Block schon hat – neue Blöcke nutzen den aus dem Master-Prompt.
 * Felder, die ein Formular nicht kennt, bleiben unverändert erhalten.
 */

/** Welcher der gleichwertigen Feldnamen gilt in diesem Objekt? (sonst der erste = Master-Prompt) */
export function feldName(o: Eintrag, namen: string[]): string {
  return namen.find((n) => o[n] !== undefined && o[n] !== null) ?? namen[0]
}

/** Wert unter dem gültigen Namen lesen */
const lies = (o: Eintrag, namen: string[]) => o[feldName(o, namen)]

/** Wert unter dem gültigen Namen schreiben */
const mit = <T extends Eintrag>(o: T, namen: string[], wert: unknown): T => ({ ...o, [feldName(o, namen)]: wert })

/** Zahl, wenn es eine ganze Zahl ist, sonst Text (so liest der Kern beides) */
function zahlOderText(v: string): string | number {
  const t = v.trim()
  return /^-?\d+$/.test(t) ? Number(t) : v
}

/** Leeres optionales Feld entfernen statt "" zu speichern */
function optional(b: Block, feld: string, wert: string): Block {
  const neu = { ...b }
  if (wert) neu[feld] = wert
  else delete neu[feld]
  return neu
}

function Auftrag({ block, onChange, standard }: FormProps & { standard: string }) {
  return (
    <Feld
      label="Arbeitsauftrag (optional)"
      wert={s(block.description)}
      onChange={(v) => onChange(optional(block, 'description', v), 'description')}
      hinweis={`Ohne Eingabe steht dort: „${standard}“`}
    />
  )
}

const HTML_HINWEIS = 'Einfaches HTML wie <p> und <strong> ist erlaubt.'

// ── Bild (image) ────────────────────────────────────────────────────────────

const BREITEN = [
  { wert: '40%', name: 'klein' },
  { wert: '70%', name: 'mittel' },
  { wert: '100%', name: 'ganze Breite' },
]

/** Gewähltes Bild mit „Anderes Bild wählen“ und „Bild bearbeiten“ */
function BildWahl({
  pfad,
  onWaehle,
  label = 'Bild',
  mitAlt = false,
  alt = '',
}: {
  pfad: string
  onWaehle: (pfad: string, alt?: string) => void
  label?: string
  /** Im Bild-Block: Alternativtext im Bild-Fenster mitfragen */
  mitAlt?: boolean
  alt?: string
}) {
  const [offen, setOffen] = useState<'waehlen' | 'bearbeiten' | null>(null)
  const bild = useGrossesBild(pfad)
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">
        {label}
        <span className="ml-1 text-ws-red" aria-hidden>
          *
        </span>
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border border-ws-line bg-white">
          {pfad && bild === null ? (
            <Loader2 className="size-5 animate-spin text-ws-muted" aria-label="Bild wird geladen" />
          ) : bild && bild !== 'fehler' ? (
            // eslint-disable-next-line @next/next/no-img-element -- data:-Adresse vom Kern
            <img src={bild} alt="" className="size-full object-contain" />
          ) : (
            <ImageIcon className="size-6 text-ws-faint" aria-hidden />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm text-ws-muted" title={pfad}>
            {pfad ? bildName(pfad) : 'Noch kein Bild gewählt'}
          </p>
          {pfad && bild === 'fehler' && <p className="text-xs text-ws-orange">Bild fehlt im Material.</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className={NEBENAKTION} onClick={() => setOffen('waehlen')}>
              {pfad ? 'Anderes Bild wählen' : 'Bild wählen'}
            </Button>
            {/* Nur im Bild-Block: Zuschneiden würde die Punkte einer Bildzuordnung verschieben */}
            {mitAlt && pfad && bild && bild !== 'fehler' && (
              <Button variant="outline" className={NEBENAKTION} onClick={() => setOffen('bearbeiten')}>
                Bild bearbeiten
              </Button>
            )}
          </div>
        </div>
      </div>
      <BildAuswahl
        offen={offen !== null}
        onOpenChange={(o) => !o && setOffen(null)}
        aktuell={pfad}
        mitAlt={mitAlt}
        alt={alt}
        bearbeite={offen === 'bearbeiten' ? pfad : undefined}
        onWaehle={(p, a) => {
          setOffen(null)
          onWaehle(p, a)
        }}
      />
    </div>
  )
}

export function BildFormular({ block, onChange }: FormProps) {
  const breite = BREITEN.some((b) => b.wert === s(block.width)) ? s(block.width) : undefined
  return (
    <div className="space-y-4">
      <BildWahl
        pfad={s(block.path)}
        mitAlt
        alt={s(block.alt)}
        onWaehle={(p, a) => onChange({ ...block, path: p, ...(a !== undefined ? { alt: a } : {}) }, a !== undefined ? 'alt' : 'path')}
      />
      <Feld
        label="Alternativtext"
        pflicht
        wert={s(block.alt)}
        onChange={(v) => onChange({ ...block, alt: v }, 'alt')}
        hinweis="Ein Satz, was auf dem Bild zu sehen ist – für Menschen, die es nicht sehen können."
      />
      <Feld label="Bildunterschrift (optional)" wert={s(block.caption)} onChange={(v) => onChange(optional(block, 'caption', v), 'caption')} />
      <div className="max-w-60 space-y-1.5">
        <Label>Breite</Label>
        <Select value={breite} onValueChange={(v) => onChange({ ...block, width: v }, 'width')}>
          <SelectTrigger className="min-h-11 rounded-xl" aria-label="Breite des Bildes">
            <SelectValue placeholder={s(block.width) || 'ganze Breite'} />
          </SelectTrigger>
          <SelectContent>
            {BREITEN.map((b) => (
              <SelectItem key={b.wert} value={b.wert}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// ── Zuordnen (drag_drop) ────────────────────────────────────────────────────

export function ZuordnenFormular({ block, onChange }: FormProps) {
  const kategorien = texte(block.categories)
  const begriffe = liste(block.items)
  const gueltig = kategorien.filter((k) => k.trim())
  return (
    <div className="space-y-4">
      <Auftrag block={block} onChange={onChange} standard="Ordne die Begriffe den richtigen Kategorien zu." />
      <TextListe
        titel="Kategorien (mindestens zwei)"
        einzahl="Kategorie"
        mindestens={2}
        werte={kategorien}
        onChange={(w) => onChange({ ...block, categories: w }, 'categories')}
      />
      <Liste
        titel="Begriffe"
        einzahl="Begriff"
        mindestens={1}
        eintraege={begriffe}
        neu={() => ({ text: '', category: gueltig[0] ?? '' })}
        onChange={(l) => onChange({ ...block, items: l }, 'items')}
      >
        {(e, i, setze) => (
          <>
            <Feld label={`Begriff ${i + 1}`} pflicht wert={s(e.text)} onChange={(v) => setze({ ...e, text: v })} />
            <div className="space-y-1.5">
              <Label>Gehört zu</Label>
              <Select value={gueltig.includes(s(e.category)) ? s(e.category) : undefined} onValueChange={(v) => setze({ ...e, category: v })}>
                <SelectTrigger className="min-h-11 rounded-xl" aria-label={`Kategorie von Begriff ${i + 1}`}>
                  <SelectValue placeholder={s(e.category) ? `„${s(e.category)}“ gibt es nicht` : 'Kategorie wählen'} />
                </SelectTrigger>
                <SelectContent>
                  {gueltig.map((k, j) => (
                    <SelectItem key={`${k}-${j}`} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </Liste>
    </div>
  )
}

// ── Kreuzworträtsel (crossword) ─────────────────────────────────────────────

export function KreuzwortFormular({ block, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      <Auftrag block={block} onChange={onChange} standard="Kreuzworträtsel" />
      <Liste
        titel="Wörter (sechs bis zehn sind ideal)"
        einzahl="Wort"
        mindestens={2}
        eintraege={liste(block.words)}
        neu={() => ({ word: '', clue: '' })}
        onChange={(l) => onChange({ ...block, words: l }, 'words')}
      >
        {(w, i, setze) => (
          <>
            <Feld
              label={`Wort ${i + 1}`}
              pflicht
              wert={s(w.word)}
              onChange={(v) => setze({ ...w, word: v })}
              hinweis="Nur Buchstaben, Umlaute ausschreiben (ä → AE, ß → SS)."
            />
            <Feld label="Umschreibung" pflicht wert={s(w.clue)} onChange={(v) => setze({ ...w, clue: v })} />
          </>
        )}
      </Liste>
      <p className="text-sm text-ws-muted">Wie die Wörter im Gitter liegen, legt die Seite selbst fest. Passt ein Wort nicht hinein, meldet die Prüfstelle es.</p>
    </div>
  )
}

// ── Reihenfolge (reihenfolge) ───────────────────────────────────────────────

export function ReihenfolgeFormular({ block, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      <Auftrag block={block} onChange={onChange} standard="Bring die Einträge in die richtige Reihenfolge." />
      <TextListe
        titel="Schritte in der richtigen Reihenfolge (mindestens drei, die Seite mischt sie)"
        einzahl="Schritt"
        mindestens={3}
        werte={texte(block.items)}
        onChange={(w) => onChange({ ...block, items: w }, 'items')}
      />
    </div>
  )
}

// ── Rechenbeispiel (calculation_example) ────────────────────────────────────

export function RechenbeispielFormular({ block, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      <Feld label="Formel" wert={s(block.formula)} onChange={(v) => onChange({ ...block, formula: v }, 'formula')} />
      <TextListe titel="Rechenschritte" einzahl="Schritt" werte={texte(block.steps)} onChange={(w) => onChange({ ...block, steps: w }, 'steps')} />
      <Feld label="Ergebnis" wert={s(block.result)} onChange={(v) => onChange({ ...block, result: v }, 'result')} />
      <Feld label="Erklärung (optional)" mehrzeilig wert={s(block.explanation)} onChange={(v) => onChange(optional(block, 'explanation', v), 'explanation')} hinweis={HTML_HINWEIS} />
      <p className="text-sm text-ws-muted">Mindestens Formel oder Rechenschritte, sonst erscheint der Block nicht.</p>
    </div>
  )
}

// ── Kopfrechnen (arithmetic_quiz) ───────────────────────────────────────────

export function KopfrechnenFormular({ block, onChange }: FormProps) {
  return (
    <Liste
      titel="Aufgaben"
      einzahl="Aufgabe"
      mindestens={1}
      eintraege={liste(block.questions)}
      neu={() => ({ question: '', answer: '' })}
      onChange={(l) => onChange({ ...block, questions: l }, 'questions')}
    >
      {(q, i, setze) => (
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
          <Feld label={`Aufgabe ${i + 1}`} pflicht wert={s(q.question)} onChange={(v) => setze({ ...q, question: v })} />
          <Feld label="Ergebnis" pflicht wert={s(q.answer)} onChange={(v) => setze({ ...q, answer: zahlOderText(v) })} />
        </div>
      )}
    </Liste>
  )
}

// ── Video mit Fragen (interactive_video) ────────────────────────────────────

/** Sekunden ↔ mm:ss */
export function alsZeit(sek: unknown): string {
  const n = Number(sek)
  if (sek === '' || sek == null || !Number.isFinite(n) || n < 0) return ''
  return `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`
}
export function ausZeit(text: string): number | string {
  const t = text.trim()
  const m = /^(\d{1,3}):([0-5]?\d)$/.exec(t)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  return /^\d+$/.test(t) ? Number(t) : t
}

function VideoFrage({ frage, setze, nr }: { frage: Eintrag; setze: (f: Eintrag) => void; nr: number }) {
  const name = useId()
  const antworten = liste(frage.answers)
  const richtig = antworten.findIndex((a) => a.correct === true)
  const [zeit, setZeit] = useState(alsZeit(frage.time))
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
        <Feld
          label="Zeitpunkt"
          wert={zeit}
          onChange={(v) => {
            setZeit(v)
            setze({ ...frage, time: ausZeit(v) })
          }}
          hinweis="mm:ss"
        />
        <Feld label={`Frage ${nr}`} pflicht wert={s(frage.question)} onChange={(v) => setze({ ...frage, question: v })} />
      </div>
      <RadioGroup
        value={richtig >= 0 ? String(richtig) : ''}
        onValueChange={(v) => setze({ ...frage, answers: antworten.map((a, i) => ({ ...a, correct: String(i) === v })) })}
        aria-label={`Richtige Antwort zu Frage ${nr}`}
      >
        <Liste
          titel="Antworten (eine ist richtig)"
          einzahl="Antwort"
          mindestens={2}
          eintraege={antworten}
          neu={() => ({ text: '', correct: false })}
          onChange={(a) => setze({ ...frage, answers: a })}
        >
          {(a, i, setzeA) => (
            <div className="flex items-end gap-2">
              <RadioGroupItem value={String(i)} id={`${name}-${i}`} aria-label={`Antwort ${i + 1} ist richtig`} className="mb-4" />
              <div className="flex-1">
                <Feld label={`Antwort ${i + 1}${a.correct === true ? ' (richtig)' : ''}`} wert={s(a.text)} onChange={(v) => setzeA({ ...a, text: v })} />
              </div>
            </div>
          )}
        </Liste>
      </RadioGroup>
    </>
  )
}

export function VideoFormular({ block, onChange }: FormProps) {
  const url = s(block.url)
  return (
    <div className="space-y-4">
      <Feld
        label="Adresse des Videos"
        pflicht
        wert={url}
        onChange={(v) => onChange({ ...block, url: v.trim() }, 'url')}
        hinweis={url && !/^https?:\/\//i.test(url) ? 'Die Adresse sollte mit https:// beginnen.' : 'Das Video öffnet sich in einem neuen Tab, z. B. von YouTube oder der Mediathek.'}
      />
      <Liste
        titel="Fragen"
        einzahl="Frage"
        mindestens={1}
        eintraege={liste(block.questions)}
        neu={() => ({ time: 0, type: 'multiple_choice', question: '', answers: [{ text: '', correct: true }, { text: '', correct: false }] })}
        onChange={(l) => onChange({ ...block, questions: l }, 'questions')}
      >
        {(f, i, setze) => <VideoFrage frage={f} nr={i + 1} setze={setze} />}
      </Liste>
    </div>
  )
}

// ── Offene Frage (freitext) ─────────────────────────────────────────────────

export function FreitextFormular({ block, onChange }: FormProps) {
  const frage = feldName(block, ['question', 'task'])
  return (
    <div className="space-y-4">
      <Feld label="Frage" pflicht mehrzeilig wert={s(block[frage])} onChange={(v) => onChange({ ...block, [frage]: v }, 'question')} hinweis={HTML_HINWEIS} />
      <Feld
        label="Musterlösung"
        pflicht
        mehrzeilig
        zeilen={5}
        wert={s(block.solution)}
        onChange={(v) => onChange({ ...block, solution: v }, 'solution')}
        hinweis="Ausformuliert. Sie lässt sich erst aufdecken, wenn der Schüler selbst geschrieben hat."
      />
      <div className="grid max-w-md gap-2 sm:grid-cols-2">
        <Feld
          label="Mindestens Zeichen"
          wert={s(block.min_zeichen ?? '')}
          onChange={(v) => onChange({ ...block, min_zeichen: zahlOderText(v) }, 'min_zeichen')}
          hinweis="Standard 60"
        />
        <Feld label="Höhe (Zeilen)" wert={s(block.rows ?? '')} onChange={(v) => onChange({ ...block, rows: zahlOderText(v) }, 'rows')} hinweis="2 bis 12" />
      </div>
    </div>
  )
}

// ── Trainer (trainer) ───────────────────────────────────────────────────────

const GRUPPEN = ['gruppen', 'groups']
const TITEL = ['titel', 'title']
const REIHE = ['reihe', 'items']

export function TrainerFormular({ block, onChange }: FormProps) {
  const gruppen = liste(lies(block, GRUPPEN))
  return (
    <div className="space-y-4">
      <Auftrag block={block} onChange={onChange} standard="Übe, bis es sitzt." />
      <div className="max-w-48">
        <Feld label="Runden (1–5)" wert={s(block.runden ?? '')} onChange={(v) => onChange({ ...block, runden: zahlOderText(v) }, 'runden')} hinweis="Standard 2" />
      </div>
      <Liste
        titel="Gruppen (mindestens zwei mit je zwei Einträgen)"
        einzahl="Gruppe"
        mindestens={2}
        eintraege={gruppen}
        neu={() => ({ titel: '', reihe: ['', ''] })}
        onChange={(l) => onChange(mit(block, GRUPPEN, l), 'gruppen')}
      >
        {(g, i, setze) => (
          <>
            <Feld label={`Gruppe ${i + 1}: Titel`} pflicht wert={s(lies(g, TITEL))} onChange={(v) => setze(mit(g, TITEL, v))} />
            <Feld label="Hinweis (optional)" wert={s(g.hinweis)} onChange={(v) => setze({ ...g, hinweis: v })} />
            <TextListe titel="Einträge in der richtigen Reihenfolge" einzahl="Eintrag" mindestens={2} werte={texte(lies(g, REIHE))} onChange={(w) => setze(mit(g, REIHE, w))} />
            <TextListe titel="Störer (optional, sonst aus den anderen Gruppen)" einzahl="Störer" werte={texte(g.stoerer)} onChange={(w) => setze({ ...g, stoerer: w })} />
          </>
        )}
      </Liste>
    </div>
  )
}

// ── Bildzuordnung (bildzuordnung) ───────────────────────────────────────────

const PUNKTE = ['punkte', 'points']

const prozent = (v: unknown): number | null => {
  const n = Number(v)
  return v === '' || v == null || !Number.isFinite(n) ? null : n
}
const rund = (n: number) => Math.round(Math.max(0, Math.min(100, n)) * 10) / 10

/**
 * Punkte auf dem Bild setzen: Punkt in der Liste wählen, dann aufs Bild tippen;
 * gesetzte Punkte lassen sich ziehen. Werte außerhalb 0–100 % erscheinen am Rand.
 */
function PunkteSetzer({ pfad, punkte, aktiv, setAktiv, setzePunkt }: {
  pfad: string
  punkte: Eintrag[]
  aktiv: number
  setAktiv: (i: number) => void
  setzePunkt: (i: number, x: number, y: number) => void
}) {
  const bild = useGrossesBild(pfad)
  const flaeche = useRef<HTMLDivElement>(null)
  const zieht = useRef<number | null>(null)

  const position = (e: ReactPointerEvent) => {
    const r = flaeche.current!.getBoundingClientRect()
    return { x: rund(((e.clientX - r.left) / r.width) * 100), y: rund(((e.clientY - r.top) / r.height) * 100) }
  }

  if (!pfad) return <p className="text-sm text-ws-orange">Wähle zuerst ein Bild.</p>
  if (bild === null)
    return (
      <p className="flex items-center gap-2 text-sm text-ws-muted" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Bild wird geladen …
      </p>
    )
  if (bild === 'fehler') return <p className="text-sm text-ws-orange">Das Bild fehlt im Material. Wähle ein anderes.</p>

  return (
    <div className="space-y-2">
      <p className="text-sm text-ws-muted">
        Tippe aufs Bild, um <strong className="text-ws-text">Punkt {aktiv + 1}</strong> zu setzen. Gesetzte Punkte lassen sich ziehen.
      </p>
      <div
        ref={flaeche}
        className="relative touch-none select-none overflow-hidden rounded-xl border border-ws-line bg-white"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).dataset.punkt) return
          const p = position(e)
          setzePunkt(aktiv, p.x, p.y)
        }}
        onPointerMove={(e) => {
          if (zieht.current === null) return
          const p = position(e)
          setzePunkt(zieht.current, p.x, p.y)
        }}
        onPointerUp={() => (zieht.current = null)}
        onPointerCancel={() => (zieht.current = null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- data:-Adresse vom Kern */}
        <img src={bild} alt="" draggable={false} className="block w-full" />
        {punkte.map((p, i) => {
          const x = prozent(p.x)
          const y = prozent(p.y)
          if (x === null || y === null) return null
          const ausserhalb = x < 0 || x > 100 || y < 0 || y > 100
          return (
            <span
              key={i}
              data-punkt={i}
              title={s(p.label) || `Punkt ${i + 1}`}
              onPointerDown={(e) => {
                e.stopPropagation()
                ;(e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId)
                zieht.current = i
                setAktiv(i)
              }}
              style={{ left: `${Math.max(0, Math.min(100, x))}%`, top: `${Math.max(0, Math.min(100, y))}%` }}
              className={cn(
                'absolute flex size-7 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 text-xs font-bold shadow',
                i === aktiv ? 'border-white bg-ws-green text-ws-on-accent' : 'border-white bg-ws-orange text-ws-on-accent',
                ausserhalb && 'border-dashed',
              )}
            >
              {i + 1}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function BildzuordnungFormular({ block, onChange }: FormProps) {
  const name = useId()
  const [aktiv, setAktiv] = useState(0)
  const punkte = liste(lies(block, PUNKTE))
  const setzePunkte = (l: Eintrag[]) => onChange(mit(block, PUNKTE, l), 'punkte')
  return (
    <div className="space-y-4">
      <BildWahl pfad={s(block.path)} onWaehle={(p) => onChange({ ...block, path: p }, 'path')} />
      <Auftrag block={block} onChange={onChange} standard="Setze die Begriffe an die richtige Stelle." />
      <Feld label="Alternativtext" pflicht wert={s(block.alt)} onChange={(v) => onChange({ ...block, alt: v }, 'alt')} />
      <PunkteSetzer
        pfad={s(block.path)}
        punkte={punkte}
        aktiv={Math.min(aktiv, Math.max(0, punkte.length - 1))}
        setAktiv={setAktiv}
        setzePunkt={(i, x, y) => {
          if (!punkte[i]) return
          setzePunkte(punkte.map((p, j) => (j === i ? { ...p, x, y } : p)))
        }}
      />
      <RadioGroup value={String(aktiv)} onValueChange={(v) => setAktiv(Number(v))} aria-label="Punkt, der auf dem Bild gesetzt wird">
        <Liste
          titel="Punkte"
          einzahl="Punkt"
          mindestens={1}
          eintraege={punkte}
          neu={() => ({ label: '' })}
          onChange={(l) => {
            setzePunkte(l)
            if (l.length > punkte.length) setAktiv(l.length - 1)
          }}
        >
          {(p, i, setze) => {
            const x = prozent(p.x)
            const y = prozent(p.y)
            const ausserhalb = (x !== null && (x < 0 || x > 100)) || (y !== null && (y < 0 || y > 100))
            return (
              <>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={String(i)} id={`${name}-${i}`} />
                  <Label htmlFor={`${name}-${i}`} className="text-xs text-ws-muted">
                    {i === aktiv ? 'Wird beim Tippen aufs Bild gesetzt' : 'Auf dem Bild setzen'}
                  </Label>
                </div>
                <Feld label={`Begriff ${i + 1}`} pflicht wert={s(p.label)} onChange={(v) => setze({ ...p, label: v })} />
                <div className="grid max-w-xs grid-cols-2 gap-2">
                  <Feld label="Links (%)" wert={x === null ? '' : String(x)} onChange={(v) => setze({ ...p, x: v.trim() === '' ? undefined : zahlOderText(v.replace(',', '.')) })} />
                  <Feld label="Oben (%)" wert={y === null ? '' : String(y)} onChange={(v) => setze({ ...p, y: v.trim() === '' ? undefined : zahlOderText(v.replace(',', '.')) })} />
                </div>
                {ausserhalb && <p className="text-xs text-ws-orange">Dieser Punkt liegt außerhalb des Bildes.</p>}
                {(x === null || y === null) && <p className="text-xs text-ws-faint">Ohne Position setzt du den Punkt später in der fertigen Seite.</p>}
              </>
            )
          }}
        </Liste>
      </RadioGroup>
    </div>
  )
}

// ── Wörtersuche (find_words) ────────────────────────────────────────────────

const WOERTER = ['words', 'woerter']

export function WoertersucheFormular({ block, onChange }: FormProps) {
  const roh = Array.isArray(lies(block, WOERTER)) ? (lies(block, WOERTER) as unknown[]) : []
  const werte = roh.map((w) => (w && typeof w === 'object' ? s((w as Eintrag).word ?? (w as Eintrag).wort) : s(w)))
  return (
    <div className="space-y-4">
      <Auftrag block={block} onChange={onChange} standard="Finde die versteckten Begriffe." />
      <TextListe
        titel="Wörter (sechs bis zehn sind ideal)"
        einzahl="Wort"
        mindestens={3}
        werte={werte}
        onChange={(w) => onChange(mit(block, WOERTER, w), 'words')}
      />
      <p className="text-sm text-ws-muted">Nur Buchstaben, Umlaute ausschreiben (ä → AE, ß → SS), drei bis sechzehn Buchstaben.</p>
    </div>
  )
}

// ── Memory (memory_game) ────────────────────────────────────────────────────

export function MemoryFormular({ block, onChange }: FormProps) {
  const listenName = feldName(block, ['cards', 'pairs'])
  return (
    <div className="space-y-4">
      <Auftrag block={block} onChange={onChange} standard="Finde die Paare." />
      <Liste
        titel="Paare (drei bis zehn)"
        einzahl="Paar"
        mindestens={3}
        eintraege={liste(block[listenName])}
        neu={() => ({ front: '', back: '' })}
        onChange={(l) => onChange({ ...block, [listenName]: l }, 'cards')}
      >
        {(k, i, setze) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Feld label={`Paar ${i + 1}: Karte A`} pflicht wert={s(lies(k, ['front', 'a']))} onChange={(v) => setze(mit(k, ['front', 'a'], v))} />
            <Feld label="Karte B" pflicht wert={s(lies(k, ['back', 'b']))} onChange={(v) => setze(mit(k, ['back', 'b'], v))} hinweis="Kurz halten, sonst passt es nicht auf die Karte." />
          </div>
        )}
      </Liste>
    </div>
  )
}

// ── Lernkarten zum Tippen (flashcards) ──────────────────────────────────────

export function TippkartenFormular({ block, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      <Auftrag block={block} onChange={onChange} standard="Schreib zu jeder Karte die passende Antwort." />
      <Liste
        titel="Karten"
        einzahl="Karte"
        mindestens={2}
        eintraege={liste(block.cards)}
        neu={() => ({ front: '', back: '' })}
        onChange={(l) => onChange({ ...block, cards: l }, 'cards')}
      >
        {(k, i, setze) => {
          const alsListe = Array.isArray(k.back)
          return (
            <>
              <Feld label={`Karte ${i + 1}: Frage`} pflicht wert={s(k.front)} onChange={(v) => setze({ ...k, front: v })} />
              <Feld
                label="Richtige Antworten"
                pflicht
                wert={alsListe ? texte(k.back).join(' / ') : s(k.back)}
                onChange={(v) => setze({ ...k, back: alsListe ? v.split('/').map((x) => x.trim()) : v })}
                hinweis="Ein Begriff, kein Satz. Mehrere Schreibweisen mit / trennen: CMR/CMR-Frachtbrief"
              />
            </>
          )
        }}
      </Liste>
    </div>
  )
}

// ── Bilder ordnen (image_sequencing) ────────────────────────────────────────

export function BilderOrdnenFormular({ block, onChange }: FormProps) {
  const listenName = feldName(block, ['steps', 'items'])
  const schritte = liste(block[listenName])
  return (
    <div className="space-y-4">
      <Auftrag block={block} onChange={onChange} standard="Bring die Abbildungen in die richtige Reihenfolge." />
      <Liste
        titel="Schritte in der richtigen Reihenfolge (mindestens drei)"
        einzahl="Schritt"
        mindestens={3}
        eintraege={schritte}
        neu={() => ({ text: '' })}
        onChange={(l) => onChange({ ...block, [listenName]: l }, 'steps')}
      >
        {(st, i, setze) => (
          <>
            <Feld label={`Schritt ${i + 1}`} pflicht wert={s(lies(st, ['text', 'label']))} onChange={(v) => setze(mit(st, ['text', 'label'], v))} />
            <SchrittBild pfad={s(st.path)} onWaehle={(p) => setze(p ? { ...st, path: p } : (({ path: _p, ...rest }) => (void _p, rest))(st))} />
          </>
        )}
      </Liste>
      {!schritte.some((x) => s(x.path)) && <p className="text-sm text-ws-muted">Ohne Bilder läuft die Aufgabe als reine Textreihenfolge.</p>}
    </div>
  )
}

function SchrittBild({ pfad, onWaehle }: { pfad: string; onWaehle: (pfad: string) => void }) {
  const [offen, setOffen] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="truncate text-sm text-ws-muted" title={pfad}>
        {pfad ? `Bild: ${bildName(pfad)}` : 'Ohne Bild'}
      </span>
      <Button variant="outline" className={NEBENAKTION} onClick={() => setOffen(true)}>
        {pfad ? 'Bild ändern' : 'Bild wählen'}
      </Button>
      {pfad && (
        <Button variant="ghost" className="min-h-11 rounded-xl text-ws-muted" onClick={() => onWaehle('')}>
          Bild entfernen
        </Button>
      )}
      <BildAuswahl
        offen={offen}
        onOpenChange={setOffen}
        aktuell={pfad}
        onWaehle={(p) => {
          setOffen(false)
          onWaehle(p)
        }}
      />
    </div>
  )
}

// ── Rechenweg (rechenweg) ───────────────────────────────────────────────────

const SCHRITTE = ['schritte', 'steps']
const FRAGE = ['frage', 'question']
const ERGEBNIS = ['ergebnis', 'result']

export function RechenwegFormular({ block, onChange }: FormProps) {
  const aufgabe = feldName(block, ['task', 'question'])
  return (
    <div className="space-y-4">
      <Feld label="Aufgabe mit allen Ausgangsdaten" pflicht mehrzeilig zeilen={4} wert={s(block[aufgabe])} onChange={(v) => onChange({ ...block, [aufgabe]: v }, 'task')} hinweis={HTML_HINWEIS} />
      <Liste
        titel="Zwischenschritte (mindestens zwei)"
        einzahl="Schritt"
        mindestens={2}
        eintraege={liste(lies(block, SCHRITTE))}
        neu={() => ({ frage: '', ergebnis: '' })}
        onChange={(l) => onChange(mit(block, SCHRITTE, l), 'schritte')}
      >
        {(st, i, setze) => (
          <>
            <Feld label={`Schritt ${i + 1}: Frage`} pflicht wert={s(lies(st, FRAGE))} onChange={(v) => setze(mit(st, FRAGE, v))} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Feld label="Ergebnis" pflicht wert={s(lies(st, ERGEBNIS))} onChange={(v) => setze(mit(st, ERGEBNIS, v))} hinweis="Deutsches Zahlenformat, z. B. 400,00" />
              <Feld label="Einheit (optional)" wert={s(st.einheit)} onChange={(v) => setze({ ...st, einheit: v })} />
            </div>
            <Feld label="Hinweis, falls es klemmt (optional)" wert={s(st.hinweis)} onChange={(v) => setze({ ...st, hinweis: v })} />
          </>
        )}
      </Liste>
    </div>
  )
}

// ── Fallakte (fallakte) ─────────────────────────────────────────────────────

const ANTWORTEN = ['antworten', 'answers']
const ENTHUELLT = ['enthuellt', 'reveal']

function FallSchritt({ st, setze, nr }: { st: Eintrag; setze: (s: Eintrag) => void; nr: number }) {
  const name = useId()
  const antworten = liste(lies(st, ANTWORTEN))
  const richtig = antworten.findIndex((a) => a.correct === true)
  return (
    <>
      <Feld label={`Schritt ${nr}: Frage`} pflicht wert={s(lies(st, FRAGE))} onChange={(v) => setze(mit(st, FRAGE, v))} />
      <RadioGroup
        value={richtig >= 0 ? String(richtig) : ''}
        onValueChange={(v) => setze(mit(st, ANTWORTEN, antworten.map((a, i) => ({ ...a, correct: String(i) === v }))))}
        aria-label={`Richtige Antwort in Schritt ${nr}`}
      >
        <Liste
          titel="Antworten (eine ist richtig)"
          einzahl="Antwort"
          mindestens={2}
          eintraege={antworten}
          neu={() => ({ text: '', correct: false, feedback: '' })}
          onChange={(a) => setze(mit(st, ANTWORTEN, a))}
        >
          {(a, i, setzeA) => (
            <>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={String(i)} id={`${name}-${i}`} aria-label={`Antwort ${i + 1} ist richtig`} />
                <Label htmlFor={`${name}-${i}`} className={cn('text-xs', a.correct === true ? 'text-ws-green' : 'text-ws-muted')}>
                  {a.correct === true ? 'Richtige Antwort' : 'Als richtig markieren'}
                </Label>
              </div>
              <Feld label={`Antwort ${i + 1}`} wert={s(a.text)} onChange={(v) => setzeA({ ...a, text: v })} />
              <Feld label="Rückmeldung" wert={s(a.feedback)} onChange={(v) => setzeA({ ...a, feedback: v })} />
            </>
          )}
        </Liste>
      </RadioGroup>
      <Feld label="Wird danach enthüllt" mehrzeilig zeilen={2} wert={s(lies(st, ENTHUELLT))} onChange={(v) => setze(mit(st, ENTHUELLT, v))} hinweis={HTML_HINWEIS} />
    </>
  )
}

export function FallakteFormular({ block, onChange }: FormProps) {
  const titel = feldName(block, ['titel', 'title'])
  const situation = feldName(block, ['situation', 'description'])
  const urteil = feldName(block, ['urteil', 'verdict'])
  return (
    <div className="space-y-4">
      <Feld label="Titel des Falls" wert={s(block[titel])} onChange={(v) => onChange({ ...block, [titel]: v }, 'titel')} />
      <Feld label="Ausgangssituation" pflicht mehrzeilig zeilen={4} wert={s(block[situation])} onChange={(v) => onChange({ ...block, [situation]: v }, 'situation')} hinweis={HTML_HINWEIS} />
      <Liste
        titel="Schritte (mindestens zwei)"
        einzahl="Schritt"
        mindestens={2}
        eintraege={liste(lies(block, SCHRITTE))}
        neu={() => ({ frage: '', antworten: [{ text: '', correct: true, feedback: '' }, { text: '', correct: false, feedback: '' }], enthuellt: '' })}
        onChange={(l) => onChange(mit(block, SCHRITTE, l), 'schritte')}
      >
        {(st, i, setze) => <FallSchritt st={st} nr={i + 1} setze={setze} />}
      </Liste>
      <Feld label="Urteil am Ende" mehrzeilig zeilen={3} wert={s(block[urteil])} onChange={(v) => onChange({ ...block, [urteil]: v }, 'urteil')} hinweis={HTML_HINWEIS} />
    </div>
  )
}

// ── Schätzrunde (schaetzrunde) ──────────────────────────────────────────────

const FRAGEN = ['fragen', 'questions']

export function SchaetzrundeFormular({ block, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      <Auftrag block={block} onChange={onChange} standard="Schätz erst – dann wird aufgelöst." />
      <Liste
        titel="Schätzfragen"
        einzahl="Frage"
        mindestens={1}
        eintraege={liste(lies(block, FRAGEN))}
        neu={() => ({ frage: '', wert: '', einheit: '' })}
        onChange={(l) => onChange(mit(block, FRAGEN, l), 'fragen')}
      >
        {(f, i, setze) => (
          <>
            <Feld label={`Frage ${i + 1}`} pflicht wert={s(lies(f, FRAGE))} onChange={(v) => setze(mit(f, FRAGE, v))} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Feld label="Richtiger Wert" pflicht wert={s(lies(f, ['wert', 'value']))} onChange={(v) => setze(mit(f, ['wert', 'value'], v))} hinweis="z. B. 150.000" />
              <Feld label="Einheit (optional)" wert={s(f.einheit)} onChange={(v) => setze({ ...f, einheit: v })} />
            </div>
            <Feld label="Kommentar zur Auflösung (optional)" mehrzeilig zeilen={2} wert={s(lies(f, ['kommentar', 'comment']))} onChange={(v) => setze(mit(f, ['kommentar', 'comment'], v))} hinweis={HTML_HINWEIS} />
            <Feld label="Quelle (optional)" wert={s(lies(f, ['quelle', 'source']))} onChange={(v) => setze(mit(f, ['quelle', 'source'], v))} />
          </>
        )}
      </Liste>
    </div>
  )
}

// ── Selbsteinschätzung (selbsteinschaetzung) ────────────────────────────────

export function SelbsteinschaetzungFormular({ block, onChange }: FormProps) {
  const titel = feldName(block, ['titel', 'title'])
  return (
    <div className="space-y-4">
      <Feld label="Überschrift (optional)" wert={s(block[titel])} onChange={(v) => onChange({ ...block, [titel]: v }, 'titel')} />
      <Auftrag block={block} onChange={onChange} standard="Wie sicher bist du?" />
      <Liste
        titel="Aussagen (mindestens zwei)"
        einzahl="Aussage"
        mindestens={2}
        eintraege={liste(lies(block, ['punkte', 'items']))}
        neu={() => ({ text: '', hilfe: '' })}
        onChange={(l) => onChange(mit(block, ['punkte', 'items'], l), 'punkte')}
      >
        {(p, i, setze) => (
          <>
            <Feld label={`Aussage ${i + 1}`} pflicht wert={s(lies(p, ['text', 'frage']))} onChange={(v) => setze(mit(p, ['text', 'frage'], v))} hinweis="Mit Handlungsverb: „Ich kann … erklären.“" />
            <Feld label="Wo man nachsieht (optional)" wert={s(lies(p, ['hilfe', 'help']))} onChange={(v) => setze(mit(p, ['hilfe', 'help'], v))} />
          </>
        )}
      </Liste>
    </div>
  )
}

// ── Zuordnung Typ → Formular ────────────────────────────────────────────────

export const KATALOG_FORMULARE: Record<string, (p: FormProps) => React.ReactNode> = {
  tabelle: TabelleFormular,
  diagramm: DiagrammFormular,
  image: BildFormular,
  drag_drop: ZuordnenFormular,
  crossword: KreuzwortFormular,
  reihenfolge: ReihenfolgeFormular,
  calculation_example: RechenbeispielFormular,
  arithmetic_quiz: KopfrechnenFormular,
  interactive_video: VideoFormular,
  freitext: FreitextFormular,
  trainer: TrainerFormular,
  bildzuordnung: BildzuordnungFormular,
  find_words: WoertersucheFormular,
  memory_game: MemoryFormular,
  flashcards: TippkartenFormular,
  image_sequencing: BilderOrdnenFormular,
  rechenweg: RechenwegFormular,
  fallakte: FallakteFormular,
  schaetzrunde: SchaetzrundeFormular,
  selbsteinschaetzung: SelbsteinschaetzungFormular,
}
