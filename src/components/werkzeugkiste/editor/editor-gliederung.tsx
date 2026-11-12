'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpToLine,
  ArrowUp,
  BookOpen,
  Box,
  Calculator,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  BarChart3,
  GraduationCap,
  GripVertical,
  HelpCircle,
  Image as BildIcon,
  Layers,
  ListOrdered,
  MoreHorizontal,
  Pencil,
  Plus,
  Table2,
  TextCursorInput,
  Trash2,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { cn } from '@/lib/utils'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { EditorRohfassung } from '@/components/werkzeugkiste/editor/editor-rohfassung'
import { AbschlussFormular, FORMULARE } from '@/components/werkzeugkiste/editor/editor-formulare'
import { TabelleHerausloesen } from '@/components/werkzeugkiste/editor/tabelle-herausloesen'
import { TextEditor } from '@/components/werkzeugkiste/editor/text-editor'
import { KatalogDialog } from '@/components/werkzeugkiste/editor/katalog-dialog'
import { BildAuswahl } from '@/components/werkzeugkiste/editor/bild-dialog'
import { MaterialBilderProvider, useMaterialBilder } from '@/components/werkzeugkiste/editor/material-bilder'
import { beispielBlock, fuegeBlockEin, katalogEintrag, merkeZuletzt } from '@/lib/werkzeugkiste-katalog'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import {
  dupliziereBlock,
  dupliziereThema,
  istBekannterTyp,
  kurzzeile,
  loescheBlock,
  loescheThema,
  neuesThema,
  setzeAbschluss,
  setzeBlock,
  setzeDeckblatt,
  setzeThemaTitel,
  typName,
  verschiebeBlock,
  verschiebeThema,
  type Block,
  type BefundSchluessel,
  type EditorBefund,
  type Ort,
  type Struktur,
} from '@/lib/werkzeugkiste-editor'
import { loeseTabelleHeraus, type HerausgeloesteTabelle } from '@/lib/werkzeugkiste-tabelle'

export type Auswahl =
  | { art: 'deckblatt' }
  | { art: 'thema'; thema: number }
  | { art: 'block'; thema: number; block: number }
  | { art: 'abschluss' }
  | null

type Aendere = (neu: (s: Struktur) => Struktur, gruppe?: string) => void

/** Stelle, an der ein neuer Block eingefügt wird (PROJ-90) */
type Einfuegestelle = { thema: number; index: number }
type EinfuegenBei = (stelle: Einfuegestelle) => void

/** Ab so vielen Themen starten alle zugeklappt (Edge Case „sehr großes Material“) */
const ZUKLAPPEN_AB = 20

const ZEILE = 'flex min-h-11 items-center gap-1 rounded-xl border border-ws-line bg-ws-surface pr-1'
const GRIFF =
  'flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-ws-faint hover:bg-ws-raised hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green active:cursor-grabbing'
const MENUKNOPF = 'size-11 shrink-0 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text'

function TypIcon({ typ }: { typ: string }) {
  const k = 'size-4 shrink-0 text-ws-muted'
  if (typ === 'text') return <FileText className={k} aria-hidden />
  if (typ === 'image' || typ === 'bildzuordnung' || typ === 'image_sequencing') return <BildIcon className={k} aria-hidden />
  if (typ === 'tabelle') return <Table2 className={k} aria-hidden />
  if (typ === 'diagramm') return <BarChart3 className={k} aria-hidden />
  if (typ === 'interactive_video') return <Video className={k} aria-hidden />
  if (typ.includes('calculation') || typ === 'arithmetic_quiz' || typ === 'rechenweg' || typ === 'schaetzrunde')
    return <Calculator className={k} aria-hidden />
  if (typ.includes('fill_blanks') || typ.includes('words')) return <TextCursorInput className={k} aria-hidden />
  if (typ === 'dialog_cards' || typ === 'flashcards' || typ === 'memory_game' || typ === 'accordion') return <Layers className={k} aria-hidden />
  if (typ === 'reihenfolge' || typ === 'drag_drop') return <ListOrdered className={k} aria-hidden />
  if (typ === 'question_set' || typ === 'summary') return <GraduationCap className={k} aria-hidden />
  if (istBekannterTyp(typ)) return <HelpCircle className={k} aria-hidden />
  return <Box className={k} aria-hidden />
}

function HinweisMarke({ anzahl, was }: { anzahl: number | undefined; was: string }) {
  if (!anzahl) return null
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ws-orange/30 bg-ws-orange/15 px-2 py-0.5 text-xs font-semibold text-ws-orange"
      title={`${anzahl} ${anzahl === 1 ? 'Hinweis' : 'Hinweise'} der Prüfstelle zu ${was}`}
    >
      <AlertTriangle className="size-3" aria-hidden />
      {anzahl}
      <span className="sr-only">{anzahl === 1 ? 'Hinweis' : 'Hinweise'}</span>
    </span>
  )
}

/** Ziel einer Ziehbewegung aus der Kennung lesen */
function lies(id: string): { art: 'thema'; thema: number } | { art: 'block'; thema: number; block: number } | { art: 'ende'; thema: number } | null {
  const t = /^t-(\d+)$/.exec(id)
  if (t) return { art: 'thema', thema: Number(t[1]) }
  const b = /^b-(\d+)-(\d+)$/.exec(id)
  if (b) return { art: 'block', thema: Number(b[1]), block: Number(b[2]) }
  const e = /^ende-(\d+)$/.exec(id)
  if (e) return { art: 'ende', thema: Number(e[1]) }
  return null
}

/**
 * Gliederung des Baukasten-Editors (PROJ-89): Deckblatt, Themen mit ihren
 * Blöcken (ziehbar, auch in andere Themen) und Lernzielkontrolle. Ein Klick
 * öffnet das Bearbeitungsfeld direkt unter der Zeile – immer nur eins.
 */
export function EditorGliederung(props: GliederungProps) {
  // Bilder, die der Entwurf schon benutzt (Marke „Verwendet“ in der Bildauswahl)
  const verwendet = useMemo(() => new Set(JSON.stringify(props.struktur).match(/images\/[^"\\]+/g) ?? []), [props.struktur])
  return (
    <MaterialBilderProvider materialId={props.materialId} verwendet={verwendet} seitenGroesse={props.seitenGroesse}>
      <Gliederung {...props} />
    </MaterialBilderProvider>
  )
}

interface GliederungProps {
  materialId: string
  struktur: Struktur
  aendere: Aendere
  rueckgaengig: () => void
  auswahl: Auswahl
  setAuswahl: (a: Auswahl) => void
  befunde: EditorBefund[] | null
  befundKarte: Map<BefundSchluessel, number>
  /** Größe der Seite laut letzter Vorschau (Bytes), 0 = unbekannt */
  seitenGroesse?: number
}

function Gliederung({
  materialId,
  struktur,
  aendere,
  rueckgaengig,
  auswahl,
  setAuswahl,
  befunde,
  befundKarte,
}: GliederungProps) {
  const [zu, setZu] = useState<Set<number>>(
    () => new Set(struktur.chapters.length >= ZUKLAPPEN_AB ? struktur.chapters.map((_, i) => i) : []),
  )
  const [themaLoeschen, setThemaLoeschen] = useState<number | null>(null)
  const sensoren = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const themen = struktur.chapters

  // ── Neuen Block einfügen (PROJ-90) ──────────────────────────────────────
  const bilder = useMaterialBilder()
  const [ziel, setZiel] = useState<Einfuegestelle | null>(null)
  const [katalogOffen, setKatalogOffen] = useState(false)
  const [bildFuer, setBildFuer] = useState<string | null>(null)

  const einfuegenBei: EinfuegenBei = (stelle) => {
    setZiel(stelle)
    setKatalogOffen(true)
    bilder.anfordern()
  }

  function einfuegen(typ: string, bild?: string, alt?: string) {
    if (!ziel) return
    const { thema, index } = ziel
    const laenge = themen[thema]?.elements.length ?? 0
    const block = beispielBlock(typ, bild)
    if (alt && typ === 'image') block.alt = alt // eigener Alternativtext aus dem Bild-Fenster
    aendere((s) => fuegeBlockEin(s, thema, index, block))
    setZu((z) => {
      const n = new Set(z)
      n.delete(thema)
      return n
    })
    setAuswahl({ art: 'block', thema, block: Math.max(0, Math.min(index, laenge)) })
    setZiel(null)
    // Gliederung scrollt zum neuen Block (sobald er gezeichnet ist)
    requestAnimationFrame(() =>
      document.getElementById(`block-${thema}-${Math.max(0, Math.min(index, laenge))}`)?.scrollIntoView?.({ block: "center", behavior: "smooth" }),
    )
  }

  function typGewaehlt(typ: string) {
    merkeZuletzt(typ)
    setKatalogOffen(false)
    if (katalogEintrag(typ)?.brauchtBild) setBildFuer(typ)
    else einfuegen(typ)
  }

  function bewegeBlock(von: Ort, nach: Ort) {
    aendere((s) => verschiebeBlock(s, von, nach))
    // Die Auswahl wandert mit dem bewegten Block
    if (auswahl?.art === 'block' && auswahl.thema === von.thema && auswahl.block === von.block) {
      const index = von.thema === nach.thema && nach.block > von.block ? nach.block - 1 : nach.block
      const laenge = themen[nach.thema]?.elements.length ?? 0
      setAuswahl({ art: 'block', thema: nach.thema, block: Math.max(0, Math.min(index, von.thema === nach.thema ? laenge - 1 : laenge)) })
    } else if (auswahl?.art === 'block') {
      setAuswahl(null)
    }
  }

  function bewegeThema(von: number, nach: number) {
    aendere((s) => verschiebeThema(s, von, nach))
    setZu(new Set())
    setAuswahl(auswahl?.art === 'thema' && auswahl.thema === von ? { art: 'thema', thema: nach } : null)
  }

  function ziehEnde({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const a = lies(String(active.id))
    const o = lies(String(over.id))
    if (!a || !o) return
    if (a.art === 'thema') {
      if (o.thema !== a.thema) bewegeThema(a.thema, o.thema)
      return
    }
    if (a.art !== 'block') return
    const von = { thema: a.thema, block: a.block }
    if (o.art === 'block') {
      const nach = o.thema === a.thema && o.block > a.block ? o.block + 1 : o.block
      bewegeBlock(von, { thema: o.thema, block: nach })
    } else {
      bewegeBlock(von, { thema: o.thema, block: themen[o.thema]?.elements.length ?? 0 })
    }
  }

  function blockLoeschen(ort: Ort) {
    aendere((s) => loescheBlock(s, ort))
    setAuswahl(null)
    toast.success('Block gelöscht', { action: { label: 'Rückgängig', onClick: rueckgaengig } })
  }

  const istGewaehlt = (a: Auswahl) => JSON.stringify(a) === JSON.stringify(auswahl)
  const waehle = (a: Auswahl) => setAuswahl(istGewaehlt(a) ? null : a)

  return (
    <div className="space-y-3">
      {!!befunde?.length && (
        <Collapsible className="rounded-xl border border-ws-orange/30 bg-ws-orange/10">
          <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-semibold text-ws-orange">
            <AlertTriangle className="size-4" aria-hidden />
            Hinweise der Prüfstelle ({befunde.length})
            <ChevronDown className="ml-auto size-4" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="space-y-1 px-3 pb-3 text-sm">
              {befunde.map((b, i) => {
                const st = b.stellen[0]
                const ziel: Auswahl = !st
                  ? null
                  : 'abschluss' in st
                    ? { art: 'abschluss' }
                    : st.element === undefined
                      ? { art: 'thema', thema: st.kapitel }
                      : { art: 'block', thema: st.kapitel, block: st.element }
                return (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={!ziel}
                      onClick={() => ziel && setAuswahl(ziel)}
                      className="min-h-9 w-full rounded-lg px-2 py-1 text-left text-ws-text hover:bg-ws-raised disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span className={cn('mr-2 font-semibold', b.schwere === 'hoch' ? 'text-ws-red' : 'text-ws-orange')}>
                        {b.schwere === 'hoch' ? 'Wichtig:' : 'Hinweis:'}
                      </span>
                      {b.text}
                    </button>
                  </li>
                )
              })}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Deckblatt */}
      <div>
        <div className={cn(ZEILE, 'pl-3', istGewaehlt({ art: 'deckblatt' }) && 'border-ws-green')}>
          <BookOpen className="size-4 shrink-0 text-ws-muted" aria-hidden />
          <button
            type="button"
            onClick={() => waehle({ art: 'deckblatt' })}
            aria-expanded={istGewaehlt({ art: 'deckblatt' })}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="text-sm font-semibold">Deckblatt</span>
            <span className="truncate text-sm text-ws-muted">{String(struktur.cover?.title ?? '')}</span>
          </button>
        </div>
        {istGewaehlt({ art: 'deckblatt' }) && (
          <div className="mt-2 rounded-xl border border-ws-line bg-ws-surface p-4">
            <DeckblattFormular struktur={struktur} aendere={aendere} />
          </div>
        )}
      </div>

      <DndContext sensors={sensoren} collisionDetection={closestCenter} onDragEnd={ziehEnde}>
        <SortableContext items={themen.map((_, i) => `t-${i}`)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-3" aria-label="Themen">
            {themen.map((thema, ti) => (
              <ThemaKarte
                key={`t-${ti}`}
                index={ti}
                titel={String(thema.title ?? '')}
                bloecke={thema.elements}
                anzahlThemen={themen.length}
                alleThemen={themen.map((t) => String(t.title ?? ''))}
                zu={zu.has(ti)}
                umschalten={() => setZu((z) => {
                  const n = new Set(z)
                  if (n.has(ti)) n.delete(ti)
                  else n.add(ti)
                  return n
                })}
                gewaehlt={istGewaehlt({ art: 'thema', thema: ti })}
                waehleThema={() => waehle({ art: 'thema', thema: ti })}
                gewaehlterBlock={auswahl?.art === 'block' && auswahl.thema === ti ? auswahl.block : null}
                waehleBlock={(bi) => waehle({ art: 'block', thema: ti, block: bi })}
                befundKarte={befundKarte}
                aendere={aendere}
                bewegeBlock={bewegeBlock}
                bewegeThema={bewegeThema}
                blockLoeschen={blockLoeschen}
                themaLoeschen={() => setThemaLoeschen(ti)}
                schliessen={() => setAuswahl(null)}
                materialId={materialId}
                einfuegenBei={einfuegenBei}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        className={cn(NEBENAKTION, 'w-full justify-center')}
        onClick={() => {
          aendere((s) => neuesThema(s))
          setAuswahl({ art: 'thema', thema: themen.length })
        }}
      >
        <Plus className="mr-2 size-4" aria-hidden />
        Thema hinzufügen
      </Button>

      {/* Lernzielkontrolle */}
      <div>
        <div className={cn(ZEILE, 'pl-3', istGewaehlt({ art: 'abschluss' }) && 'border-ws-green')}>
          <GraduationCap className="size-4 shrink-0 text-ws-muted" aria-hidden />
          <button
            type="button"
            onClick={() => waehle({ art: 'abschluss' })}
            aria-expanded={istGewaehlt({ art: 'abschluss' })}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="text-sm font-semibold">{String(struktur.final_chapter?.title ?? 'Lernzielkontrolle')}</span>
            {!struktur.final_chapter && <span className="text-sm text-ws-muted">leer</span>}
          </button>
          <HinweisMarke anzahl={befundKarte.get('abschluss')} was="der Lernzielkontrolle" />
        </div>
        {istGewaehlt({ art: 'abschluss' }) && (
          <div className="mt-2 rounded-xl border border-ws-line bg-ws-surface p-4">
            <MitRohfassung
              materialId={materialId}
              beschriftung="Rohfassung: Lernzielkontrolle"
              // Der Kern liest einzelne Blöcke nur mit `type` – die Lernzielkontrolle bekommt dafür eine Hilfsmarke
              block={{ type: 'final_chapter', ...(struktur.final_chapter ?? { title: 'Lernzielkontrolle' }) }}
              onRohUebernommen={(b) => {
                const { type: _marke, ...rest } = b
                void _marke
                aendere((s) => setzeAbschluss(s, rest))
                setAuswahl(null)
              }}
              schliessen={() => setAuswahl(null)}
            >
              <AbschlussFormular
                abschluss={struktur.final_chapter ?? { title: 'Lernzielkontrolle' }}
                onChange={(neu, feld) => aendere((s) => setzeAbschluss(s, neu), `abschluss-${feld}`)}
              />
            </MitRohfassung>
          </div>
        )}
      </div>

      <KatalogDialog
        offen={katalogOffen}
        onOpenChange={(o) => {
          setKatalogOffen(o)
          if (!o && !bildFuer) setZiel(null)
        }}
        onWaehle={typGewaehlt}
      />
      <BildAuswahl
        offen={bildFuer !== null}
        onOpenChange={(o) => {
          if (!o) {
            setBildFuer(null)
            setZiel(null)
          }
        }}
        mitAlt={bildFuer === 'image'}
        onWaehle={(pfad, alt) => {
          const typ = bildFuer
          setBildFuer(null)
          if (typ) einfuegen(typ, pfad, alt)
        }}
      />

      <AlertDialog open={themaLoeschen !== null} onOpenChange={(o) => !o && setThemaLoeschen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Thema „{String(themaLoeschen !== null ? (themen[themaLoeschen]?.title ?? '') : '')}“ löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {themaLoeschen !== null && themen[themaLoeschen]
                ? `Das Thema und seine ${themen[themaLoeschen].elements.length} Blöcke werden aus dem Entwurf entfernt. Mit „Rückgängig“ holst du es zurück.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
              onClick={() => {
                if (themaLoeschen === null) return
                const i = themaLoeschen
                aendere((s) => loescheThema(s, i))
                setAuswahl(null)
                setZu(new Set())
                setThemaLoeschen(null)
              }}
            >
              Thema löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Thema ─────────────────────────────────────────────────────────────────

function ThemaKarte({
  index,
  titel,
  bloecke,
  anzahlThemen,
  alleThemen,
  zu,
  umschalten,
  gewaehlt,
  waehleThema,
  gewaehlterBlock,
  waehleBlock,
  befundKarte,
  aendere,
  bewegeBlock,
  bewegeThema,
  blockLoeschen,
  themaLoeschen,
  schliessen,
  materialId,
  einfuegenBei,
}: {
  index: number
  titel: string
  bloecke: Block[]
  anzahlThemen: number
  alleThemen: string[]
  zu: boolean
  umschalten: () => void
  gewaehlt: boolean
  waehleThema: () => void
  gewaehlterBlock: number | null
  waehleBlock: (b: number) => void
  befundKarte: Map<BefundSchluessel, number>
  aendere: Aendere
  bewegeBlock: (von: Ort, nach: Ort) => void
  bewegeThema: (von: number, nach: number) => void
  blockLoeschen: (ort: Ort) => void
  themaLoeschen: () => void
  schliessen: () => void
  materialId: string
  einfuegenBei: EinfuegenBei
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `t-${index}`,
  })
  const ende = useDroppable({ id: `ende-${index}` })
  const name = titel || `Thema ${index + 1}`
  const hinweiseImThema =
    (befundKarte.get(`k${index}`) ?? 0) +
    bloecke.reduce((n, _, bi) => n + (befundKarte.get(`k${index}-e${bi}`) ?? 0), 0)

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('rounded-2xl border border-ws-line bg-ws-bg p-2', isDragging && 'z-10 opacity-80 shadow-lg')}
    >
      <div className={cn(ZEILE, gewaehlt && 'border-ws-green')}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={GRIFF}
          aria-label={`Thema „${name}“ verschieben`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={umschalten}
          aria-expanded={!zu}
          aria-label={zu ? `Thema „${name}“ aufklappen` : `Thema „${name}“ zuklappen`}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ws-muted hover:bg-ws-raised"
        >
          {zu ? <ChevronRight className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
        </button>
        <button type="button" onClick={waehleThema} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate font-semibold" title={name}>
            {name}
          </span>
          <span className="shrink-0 text-xs text-ws-faint">
            {bloecke.length} {bloecke.length === 1 ? 'Block' : 'Blöcke'}
          </span>
        </button>
        <HinweisMarke anzahl={hinweiseImThema} was={`Thema „${name}“`} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={MENUKNOPF} aria-label={`Weitere Aktionen für Thema „${name}“`}>
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={waehleThema}>
              <Pencil className="mr-2 size-4" aria-hidden /> Umbenennen
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === 0} onSelect={() => bewegeThema(index, index - 1)}>
              <ArrowUp className="mr-2 size-4" aria-hidden /> Nach oben
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === anzahlThemen - 1} onSelect={() => bewegeThema(index, index + 1)}>
              <ArrowDown className="mr-2 size-4" aria-hidden /> Nach unten
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => einfuegenBei({ thema: index, index: bloecke.length })}>
              <Plus className="mr-2 size-4" aria-hidden /> Block hinzufügen …
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => aendere((s) => dupliziereThema(s, index))}>
              <Copy className="mr-2 size-4" aria-hidden /> Duplizieren
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={themaLoeschen} className="text-ws-red focus:text-ws-red">
              <Trash2 className="mr-2 size-4" aria-hidden /> Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {gewaehlt && (
        <div className="mt-2 space-y-2 rounded-xl border border-ws-line bg-ws-surface p-4">
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
      )}

      {!zu && (
        <SortableContext items={bloecke.map((_, bi) => `b-${index}-${bi}`)} strategy={verticalListSortingStrategy}>
          <ol className="mt-2 space-y-2 pl-2 sm:pl-6" aria-label={`Blöcke in „${name}“`}>
            {bloecke.map((block, bi) => [
              bi > 0 && <Einfuegestelle key={`plus-${index}-${bi}`} onClick={() => einfuegenBei({ thema: index, index: bi })} />,
              <BlockZeile
                key={`b-${index}-${bi}`}
                thema={index}
                index={bi}
                block={block}
                anzahl={bloecke.length}
                alleThemen={alleThemen}
                gewaehlt={gewaehlterBlock === bi}
                waehlen={() => waehleBlock(bi)}
                hinweise={befundKarte.get(`k${index}-e${bi}`)}
                aendere={aendere}
                bewegeBlock={bewegeBlock}
                loeschen={() => blockLoeschen({ thema: index, block: bi })}
                schliessen={schliessen}
                materialId={materialId}
                einfuegenBei={einfuegenBei}
              />,
            ])}
            <li
              ref={ende.setNodeRef}
              className={cn(
                'rounded-xl border border-dashed border-transparent px-3 text-sm text-ws-faint',
                bloecke.length === 0 ? 'border-ws-line py-3' : 'py-1',
                ende.isOver && 'border-ws-green bg-ws-green/10',
              )}
            >
              {bloecke.length === 0 ? 'Noch keine Blöcke' : <span className="sr-only">Ende des Themas</span>}
            </li>
          </ol>
          <div className="mt-2 pl-2 sm:pl-6">
            <Button
              variant="outline"
              className={cn(NEBENAKTION, 'w-full justify-center border-dashed')}
              onClick={() => einfuegenBei({ thema: index, index: bloecke.length })}
              aria-label={`Block hinzufügen in „${name}“`}
            >
              <Plus className="mr-2 size-4" aria-hidden />
              Block hinzufügen
            </Button>
          </div>
        </SortableContext>
      )}
    </li>
  )
}

/**
 * Einfügestelle „+“ zwischen zwei Blöcken (PROJ-90): mit der Maus beim
 * Überfahren, per Tastatur beim Fokus sichtbar; auf Touch-Geräten immer und 44 px hoch.
 */
function Einfuegestelle({ onClick }: { onClick: () => void }) {
  return (
    // Am Desktop ragt der Knopf (24 px) nur in den Zeilenabstand, nie über die Nachbarzeilen
    <li className="relative flex h-3 items-center [@media(pointer:coarse)]:h-11">
      <button
        type="button"
        onClick={onClick}
        aria-label="Block hier einfügen"
        className={cn(
          'absolute inset-x-0 top-1/2 flex h-6 -translate-y-1/2 [@media(pointer:coarse)]:h-11 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-ws-green',
          'opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
          '[@media(pointer:coarse)]:opacity-100',
        )}
      >
        <span className="h-px flex-1 bg-ws-green/40" aria-hidden />
        <span className="flex size-6 items-center justify-center rounded-full border border-ws-green bg-ws-surface">
          <Plus className="size-3.5" aria-hidden />
        </span>
        <span className="h-px flex-1 bg-ws-green/40" aria-hidden />
      </button>
    </li>
  )
}

// ── Block ─────────────────────────────────────────────────────────────────

function BlockZeile({
  thema,
  index,
  block,
  anzahl,
  alleThemen,
  gewaehlt,
  waehlen,
  hinweise,
  aendere,
  bewegeBlock,
  loeschen,
  schliessen,
  materialId,
  einfuegenBei,
}: {
  thema: number
  index: number
  block: Block
  anzahl: number
  alleThemen: string[]
  gewaehlt: boolean
  waehlen: () => void
  hinweise: number | undefined
  aendere: Aendere
  bewegeBlock: (von: Ort, nach: Ort) => void
  loeschen: () => void
  schliessen: () => void
  materialId: string
  einfuegenBei: EinfuegenBei
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `b-${thema}-${index}`,
  })
  const typ = String(block.type ?? '')
  const name = typName(typ)
  const kurz = kurzzeile(block)
  const ort = { thema, block: index }

  return (
    <li
      ref={setNodeRef}
      id={`block-${thema}-${index}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('scroll-mt-24', isDragging && 'z-10 opacity-80')}
    >
      <div className={cn(ZEILE, gewaehlt && 'border-ws-green', !istBekannterTyp(typ) && 'border-ws-orange/50')}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={GRIFF}
          aria-label={`${name} verschieben`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={waehlen}
          aria-expanded={gewaehlt}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-1 text-left"
        >
          <TypIcon typ={typ} />
          <span className="shrink-0 text-sm font-semibold">{name}</span>
          {kurz && (
            <span className="truncate text-sm text-ws-muted" title={kurz}>
              {kurz}
            </span>
          )}
        </button>
        <HinweisMarke anzahl={hinweise} was={name} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={MENUKNOPF} aria-label={`Weitere Aktionen für ${name}`}>
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onSelect={() => bewegeBlock(ort, { thema, block: index - 1 })}>
              <ArrowUp className="mr-2 size-4" aria-hidden /> Nach oben
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === anzahl - 1} onSelect={() => bewegeBlock(ort, { thema, block: index + 2 })}>
              <ArrowDown className="mr-2 size-4" aria-hidden /> Nach unten
            </DropdownMenuItem>
            {alleThemen.length > 1 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRightLeft className="mr-2 size-4" aria-hidden /> In anderes Thema …
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                  {alleThemen.map((t, ti) =>
                    ti === thema ? null : (
                      <DropdownMenuItem key={ti} onSelect={() => bewegeBlock(ort, { thema: ti, block: Number.MAX_SAFE_INTEGER })}>
                        <span className="max-w-64 truncate">{t || `Thema ${ti + 1}`}</span>
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            <DropdownMenuItem onSelect={() => aendere((s) => dupliziereBlock(s, ort))}>
              <Copy className="mr-2 size-4" aria-hidden /> Duplizieren
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => einfuegenBei({ thema, index })}>
              <ArrowUpToLine className="mr-2 size-4" aria-hidden /> Block darüber einfügen …
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => einfuegenBei({ thema, index: index + 1 })}>
              <ArrowDownToLine className="mr-2 size-4" aria-hidden /> Block darunter einfügen …
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={loeschen} className="text-ws-red focus:text-ws-red">
              <Trash2 className="mr-2 size-4" aria-hidden /> Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {gewaehlt && (
        <div className="mt-2 rounded-xl border border-ws-line bg-ws-surface p-4">
          {!istBekannterTyp(typ) && (
            <p className="mb-3 text-sm text-ws-orange">
              Diesen Blocktyp kennt die Seite nicht. Er wird beim Bauen übersprungen, geht aber nicht verloren.
            </p>
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
        </div>
      )}
    </li>
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
