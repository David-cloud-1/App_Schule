'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowRightLeft, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { EditorRohfassung } from '@/components/werkzeugkiste/editor/editor-rohfassung'
import { AbschlussFormular, FORMULARE } from '@/components/werkzeugkiste/editor/editor-formulare'
import { TabelleHerausloesen } from '@/components/werkzeugkiste/editor/tabelle-herausloesen'
import { TextEditor } from '@/components/werkzeugkiste/editor/text-editor'
import { TypWechsel } from '@/components/werkzeugkiste/editor/typ-wechsel'
import type { Aendere, Auswahl } from '@/components/werkzeugkiste/editor/editor-gliederung'
import { wechselZiele } from '@/lib/werkzeugkiste-blocktyp-wechsel'
import {
  istBekannterTyp,
  kurzzeile,
  setzeAbschluss,
  setzeBlock,
  setzeDeckblatt,
  setzeThemaTitel,
  typName,
  type Block,
  type Struktur,
} from '@/lib/werkzeugkiste-editor'
import { loeseTabelleHeraus, type HerausgeloesteTabelle } from '@/lib/werkzeugkiste-tabelle'

/**
 * Gibt es die gewählte Stelle noch? Nach Löschen, Rückgängig oder einem Neubau
 * kann eine Auswahl ins Leere zeigen – dann gilt sie als nicht gewählt.
 */
export function gueltigeAuswahl(auswahl: Auswahl, struktur: Struktur): Auswahl {
  if (!auswahl) return null
  if (auswahl.art === 'thema') return struktur.chapters[auswahl.thema] ? auswahl : null
  if (auswahl.art === 'block') return struktur.chapters[auswahl.thema]?.elements[auswahl.block] ? auswahl : null
  return auswahl
}

interface SchubladeProps {
  /** Gewählte Stelle (schon geprüft mit `gueltigeAuswahl`) */
  auswahl: Exclude<Auswahl, null>
  struktur: Struktur
  aendere: Aendere
  rueckgaengig: () => void
  materialId: string
  schliessen: () => void
  /** Ab 1024 px als eigene Spalte neben der Vorschau, darunter als Blatt von unten */
  angedockt: boolean
  /** Schreibgeschützt (Konflikt, kein Zugriff): Eingaben gesperrt */
  gesperrt?: boolean
  /** Neuen Block direkt hinter dem gewählten Block einfügen (öffnet den Katalog) */
  onBlockDarunter?: () => void
  /** Gewählten Block löschen (mit „Rückgängig“ im Hinweis) */
  onBlockLoeschen?: () => void
}

function titelUndZeile(auswahl: Exclude<Auswahl, null>, struktur: Struktur): { titel: string; zeile: string } {
  if (auswahl.art === 'deckblatt') return { titel: 'Deckblatt', zeile: String(struktur.cover?.title ?? '') }
  if (auswahl.art === 'abschluss') return { titel: 'Lernzielkontrolle', zeile: String(struktur.final_chapter?.title ?? '') }
  if (auswahl.art === 'thema') return { titel: 'Thema', zeile: String(struktur.chapters[auswahl.thema]?.title ?? '') }
  const block = struktur.chapters[auswahl.thema]?.elements[auswahl.block]
  return { titel: typName(String(block?.type ?? '')), zeile: block ? kurzzeile(block) : '' }
}

/**
 * Schublade des Baukasten-Editors (PROJ-96): Hier – und nicht mehr mitten in
 * der Gliederung – wird die gewählte Stelle bearbeitet (Formular, Rohfassung,
 * Text-Editor, „Typ wechseln“). Am Desktop steht sie als Spalte neben der
 * Vorschau, damit die Seite sichtbar und bedienbar bleibt; auf Handy und
 * Tablet hochkant ist sie ein Blatt von unten.
 */
export function EditorSchublade(props: SchubladeProps) {
  const { auswahl, struktur, schliessen, angedockt, gesperrt } = props
  const { titel, zeile } = titelUndZeile(auswahl, struktur)
  const schluessel = JSON.stringify(auswahl)
  const kopfRef = useRef<HTMLHeadingElement>(null)

  // Angedockt: Der Fokus zieht beim Wechsel der Stelle in die Schublade (das Blatt macht das selbst)
  useEffect(() => {
    const kopfEl = kopfRef.current
    if (!angedockt || !kopfEl) return
    // Hat ein Feld der Schublade den Fokus schon (z. B. der Titel eines Themas), bleibt er dort
    if (!kopfEl.closest('aside')?.contains(document.activeElement)) kopfEl.focus({ preventScroll: true })
  }, [angedockt, schluessel])

  const kopf = (
    <div className="flex min-h-14 items-center gap-2 border-b border-ws-line px-4 py-2">
      <div className="min-w-0 flex-1">
        {angedockt ? (
          <h2 ref={kopfRef} tabIndex={-1} className="truncate text-base font-bold outline-none" id="schublade-titel">
            {titel}
          </h2>
        ) : (
          <SheetTitle className="truncate text-base font-bold text-ws-text">{titel}</SheetTitle>
        )}
        {zeile && (
          <p className="truncate text-sm text-ws-muted" title={zeile}>
            {zeile}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
        onClick={schliessen}
        aria-label="Bearbeiten schließen"
      >
        <X className="size-5" aria-hidden />
      </Button>
    </div>
  )

  const koerper = (
    <div className="min-h-0 flex-1 overflow-y-auto p-4" inert={gesperrt ? true : undefined}>
      <SchubladeInhalt key={schluessel} {...props} />
    </div>
  )

  if (angedockt) {
    // Esc schließt – aber nicht, wenn es nur einen Dialog oder ein Menü darüber schließt
    const beiTaste = (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== 'Escape' || e.defaultPrevented || !e.currentTarget.contains(e.target as Node)) return
      schliessen()
    }
    return (
      <aside
        aria-labelledby="schublade-titel"
        onKeyDown={beiTaste}
        className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-ws-line bg-ws-surface lg:sticky lg:top-24 lg:h-[calc(100svh-7.5rem)]"
      >
        {kopf}
        {koerper}
      </aside>
    )
  }

  return (
    <Sheet open onOpenChange={(o) => !o && schliessen()}>
      <SheetContent
        side="bottom"
        className="flex h-[92svh] flex-col gap-0 rounded-t-2xl border-ws-line bg-ws-surface p-0 text-ws-text [&>button:last-child]:hidden"
      >
        <SheetDescription className="sr-only">Hier bearbeitest du die gewählte Stelle der Seite.</SheetDescription>
        {kopf}
        {koerper}
      </SheetContent>
    </Sheet>
  )
}

/** Was in der Schublade steht – je nach gewählter Stelle */
function SchubladeInhalt({ auswahl, struktur, aendere, rueckgaengig, materialId, schliessen, onBlockDarunter, onBlockLoeschen }: SchubladeProps) {
  if (auswahl.art === 'deckblatt') return <DeckblattFormular struktur={struktur} aendere={aendere} />

  if (auswahl.art === 'thema') {
    const index = auswahl.thema
    const titel = String(struktur.chapters[index]?.title ?? '')
    return (
      <div className="space-y-2">
        <Label htmlFor={`thema-titel-${index}`}>Titel des Themas</Label>
        <Input
          id={`thema-titel-${index}`}
          value={titel}
          maxLength={500}
          autoFocus
          onChange={(e) => aendere((s) => setzeThemaTitel(s, index, e.target.value), `titel-${index}`)}
          onKeyDown={(e) => e.key === 'Enter' && schliessen()}
          className="min-h-11 rounded-xl"
        />
      </div>
    )
  }

  if (auswahl.art === 'abschluss') {
    return (
      <MitRohfassung
        materialId={materialId}
        beschriftung="Rohfassung: Lernzielkontrolle"
        // Der Kern liest einzelne Blöcke nur mit `type` – die Lernzielkontrolle bekommt dafür eine Hilfsmarke
        block={{ type: 'final_chapter', ...(struktur.final_chapter ?? { title: 'Lernzielkontrolle' }) }}
        onRohUebernommen={(b) => {
          const { type: _marke, ...rest } = b
          void _marke
          aendere((s) => setzeAbschluss(s, rest))
          schliessen()
        }}
        schliessen={schliessen}
      >
        <AbschlussFormular
          abschluss={struktur.final_chapter ?? { title: 'Lernzielkontrolle' }}
          onChange={(neu, feld) => aendere((s) => setzeAbschluss(s, neu), `abschluss-${feld}`)}
        />
      </MitRohfassung>
    )
  }

  return (
    <BlockInhalt
      auswahl={auswahl}
      struktur={struktur}
      aendere={aendere}
      rueckgaengig={rueckgaengig}
      materialId={materialId}
      schliessen={schliessen}
      onBlockDarunter={onBlockDarunter}
      onBlockLoeschen={onBlockLoeschen}
    />
  )
}

function BlockInhalt({
  auswahl,
  struktur,
  aendere,
  rueckgaengig,
  materialId,
  schliessen,
  onBlockDarunter,
  onBlockLoeschen,
}: {
  auswahl: { art: 'block'; thema: number; block: number }
  struktur: Struktur
  aendere: Aendere
  rueckgaengig: () => void
  materialId: string
  schliessen: () => void
  onBlockDarunter?: () => void
  onBlockLoeschen?: () => void
}) {
  const { thema, block: index } = auswahl
  const block = struktur.chapters[thema]?.elements[index]
  const [wechselOffen, setWechselOffen] = useState(false)
  if (!block) return null
  const typ = String(block.type ?? '')
  const name = typName(typ)
  const ort = { thema, block: index }
  const kannWechseln = wechselZiele(typ).length > 0

  return (
    <>
      {!istBekannterTyp(typ) && (
        <p className="mb-3 text-sm text-ws-orange">
          Diesen Blocktyp kennt die Seite nicht. Er wird beim Bauen übersprungen, geht aber nicht verloren.
        </p>
      )}
      {kannWechseln && (
        <div className="mb-3 flex justify-end">
          <Button type="button" variant="outline" className={NEBENAKTION} onClick={() => setWechselOffen(true)}>
            <ArrowRightLeft className="mr-2 size-4" aria-hidden /> Typ wechseln
          </Button>
        </div>
      )}
      <BlockBearbeiten
        materialId={materialId}
        block={block}
        name={name}
        gruppe={`k${thema}-e${index}`}
        onChange={(neu, feld) => aendere((s) => setzeBlock(s, ort, neu), feld)}
        onRohUebernommen={(neu) => {
          aendere((s) => setzeBlock(s, ort, neu))
          schliessen()
        }}
        onTabelleHeraus={(d) => {
          aendere((s) => loeseTabelleHeraus(s, thema, index, d), `k${thema}-e${index}-tabelle-heraus`)
          schliessen()
        }}
        schliessen={schliessen}
      />
      {(onBlockDarunter || onBlockLoeschen) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ws-line pt-3">
          {onBlockDarunter && (
            <Button type="button" variant="outline" className={NEBENAKTION} onClick={onBlockDarunter}>
              <Plus className="mr-2 size-4" aria-hidden /> Block darunter einfügen
            </Button>
          )}
          {onBlockLoeschen && (
            <Button
              type="button"
              variant="outline"
              className={cn(NEBENAKTION, 'border-ws-red/30 text-ws-red hover:bg-ws-red/15 hover:text-ws-red')}
              onClick={onBlockLoeschen}
            >
              <Trash2 className="mr-2 size-4" aria-hidden /> Block löschen
            </Button>
          )}
        </div>
      )}
      {kannWechseln && (
        <TypWechsel
          offen={wechselOffen}
          onOpenChange={setWechselOffen}
          block={block}
          rueckgaengig={rueckgaengig}
          onWechsel={(neu) => aendere((s) => setzeBlock(s, ort, neu))}
        />
      )}
    </>
  )
}

/**
 * Bearbeitungsfeld eines Blocks (Paket 2): Lehrtext im Text-Editor, die
 * häufigen Aufgabentypen im Formular (mit Umschalter zur Rohfassung), alles
 * andere als Rohfassung. Formular und Text-Editor ändern sofort.
 */
function BlockBearbeiten({
  materialId,
  block,
  name,
  gruppe,
  onChange,
  onRohUebernommen,
  onTabelleHeraus,
  schliessen,
}: {
  materialId: string
  block: Block
  name: string
  gruppe: string
  onChange: (block: Block, feld: string) => void
  onRohUebernommen: (block: Block) => void
  onTabelleHeraus: (d: HerausgeloesteTabelle) => void
  schliessen: () => void
}) {
  const typ = String(block.type ?? '')
  if (typ === 'text') {
    const inhalt = typeof block.content === 'string' ? block.content : ''
    return (
      <div className="space-y-3">
        <TabelleHerausloesen html={inhalt} onHeraus={onTabelleHeraus} />
        <TextEditor html={inhalt} beschriftung={name} onChange={(html) => onChange({ ...block, content: html }, `${gruppe}-content`)} />
      </div>
    )
  }
  const Formular = FORMULARE[typ]
  if (!Formular) {
    return (
      <EditorRohfassung
        materialId={materialId}
        block={block}
        beschriftung={`Rohfassung: ${name}`}
        onUebernehmen={onRohUebernommen}
        onAbbrechen={schliessen}
      />
    )
  }
  return (
    <MitRohfassung materialId={materialId} block={block} beschriftung={`Rohfassung: ${name}`} onRohUebernommen={onRohUebernommen} schliessen={schliessen}>
      <Formular block={block} onChange={(neu, feld) => onChange(neu, `${gruppe}-${feld}`)} />
    </MitRohfassung>
  )
}

/** Formular mit Umschalter zur Rohfassung (für Sonderfälle, die das Formular nicht abdeckt) */
function MitRohfassung({
  materialId,
  block,
  beschriftung,
  onRohUebernommen,
  schliessen,
  children,
}: {
  materialId: string
  block: Block
  beschriftung: string
  onRohUebernommen: (block: Block) => void
  schliessen: () => void
  children: ReactNode
}) {
  const [ansicht, setAnsicht] = useState<'formular' | 'roh'>('formular')
  return (
    <div className="space-y-4">
      <AdminSegmented
        ariaLabel="Bearbeiten als"
        value={ansicht}
        onChange={setAnsicht}
        options={[
          { value: 'formular', label: 'Formular' },
          { value: 'roh', label: 'Rohfassung' },
        ]}
      />
      {ansicht === 'formular' ? (
        children
      ) : (
        <EditorRohfassung
          materialId={materialId}
          block={block}
          beschriftung={beschriftung}
          onUebernehmen={(b) => {
            onRohUebernommen(b)
            setAnsicht('formular')
          }}
          onAbbrechen={() => setAnsicht('formular')}
        />
      )}
      <div className="flex justify-end border-t border-ws-line pt-3">
        <Button variant="outline" className={NEBENAKTION} onClick={schliessen}>
          Fertig
        </Button>
      </div>
    </div>
  )
}

// ── Deckblatt ─────────────────────────────────────────────────────────────

const DECKBLATT_FELDER: { feld: 'title' | 'subtitle' | 'school' | 'duration'; label: string; max: number }[] = [
  { feld: 'title', label: 'Titel', max: 200 },
  { feld: 'subtitle', label: 'Untertitel', max: 300 },
  { feld: 'school', label: 'Schule', max: 200 },
  { feld: 'duration', label: 'Dauer', max: 60 },
]

function DeckblattFormular({ struktur, aendere }: { struktur: Struktur; aendere: Aendere }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {DECKBLATT_FELDER.map(({ feld, label, max }) => (
        <div key={feld} className={cn('space-y-2', feld === 'title' && 'sm:col-span-2')}>
          <Label htmlFor={`deckblatt-${feld}`}>{label}</Label>
          <Input
            id={`deckblatt-${feld}`}
            value={String(struktur.cover?.[feld] ?? '')}
            maxLength={max}
            onChange={(e) => {
              const wert = e.target.value
              aendere((s) => setzeDeckblatt(s, { ...s.cover, [feld]: wert }), `deckblatt-${feld}`)
            }}
            className="min-h-11 rounded-xl"
          />
        </div>
      ))}
    </div>
  )
}
