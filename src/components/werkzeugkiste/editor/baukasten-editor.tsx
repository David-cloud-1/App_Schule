'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, CloudOff, Loader2, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Redo2, RotateCcw, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { useIsApplePlatform } from '@/hooks/use-is-apple-platform'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { WERKZEUGKISTE_HREF } from '@/lib/werkzeugkiste'
import { ladeEditor, veroeffentlicheEntwurf, verwirfEntwurf } from '@/lib/werkzeugkiste-api'
import { befundeJeStelle, dupliziereBlock, hatAufgaben, loescheBlock, sprungmarke, typName, type EditorDaten, type Ort } from '@/lib/werkzeugkiste-editor'
import { beispielBefunde, editorBefunde } from '@/lib/werkzeugkiste-katalog'
import { HAUPTAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { EditorGliederung, type Auswahl, type EinfuegeAnfrage, type ThemaLoeschenAnfrage } from '@/components/werkzeugkiste/editor/editor-gliederung'
import { EditorSchublade, gueltigeAuswahl } from '@/components/werkzeugkiste/editor/editor-schublade'
import { MaterialBilderProvider } from '@/components/werkzeugkiste/editor/material-bilder'
import { auswahlAusMarke } from '@/components/werkzeugkiste/editor/vorschau-skript'
import type { Taste, VorschauWunsch } from '@/components/werkzeugkiste/editor/vorschau-nachrichten'
import { BlockMenue, type MenueAnker } from '@/components/werkzeugkiste/editor/block-menue'
import { nachbarAuswahl } from '@/components/werkzeugkiste/editor/auswahl-navigation'
import {
  einfuegeortAusAuswahl,
  einfuegeortAusMarke,
  neuesThemaNach,
} from '@/components/werkzeugkiste/editor/einfuege-stelle'
import { EditorVorschau, type Modus } from '@/components/werkzeugkiste/editor/editor-vorschau'
import { useEditorVorschau, useEditorZustand } from '@/components/werkzeugkiste/editor/use-editor-zustand'

const ZURUECK = `${WERKZEUGKISTE_HREF}?tab=materialien`
const GLIEDERUNG_SPEICHER = 'wk-editor-gliederung'

/** Gliederung offen? Beim ersten Mal zu; der Speicher kann fehlen oder gesperrt sein */
function liesGliederungOffen(): boolean {
  try {
    return window.localStorage.getItem(GLIEDERUNG_SPEICHER) === 'offen'
  } catch {
    return false
  }
}

function merkeGliederungOffen(offen: boolean) {
  try {
    window.localStorage.setItem(GLIEDERUNG_SPEICHER, offen ? 'offen' : 'zu')
  } catch {
    // Merken ist nur eine Bequemlichkeit
  }
}

/** Ist das Fenster mindestens so breit? (Gliederung und Schublade passen dann zusammen neben die Vorschau) */
function useMindestBreite(px: number): boolean {
  const [breit, setBreit] = useState(true)
  useEffect(() => {
    const m = window.matchMedia(`(min-width: ${px}px)`)
    const f = () => setBreit(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [px])
  return breit
}

/**
 * Baukasten-Editor (PROJ-89, PROJ-96): Die Vorschau ist die Hauptfläche, die
 * Gliederung ein einklappbarer Streifen links, die gewählte Stelle wird in einer
 * Schublade rechts bearbeitet (unter 1024 px: Umschalter Gliederung/Vorschau und
 * Schublade als Blatt von unten). Lädt das Material und übergibt an die Arbeitsfläche.
 */
export function BaukastenEditor({ id }: { id: string }) {
  const [daten, setDaten] = useState<EditorDaten | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const laden = useCallback(() => {
    setFehler(null)
    setDaten(null)
    ladeEditor(id)
      .then((d) => {
        setDaten(d)
        setVersion((v) => v + 1)
      })
      .catch((e: Error) => setFehler(e.message))
  }, [id])

  useEffect(() => laden(), [laden])

  if (fehler) {
    return (
      <Huelle titel="Material bearbeiten">
        <div className="mx-auto w-full max-w-xl p-6">
          <AdminErrorState message={fehler} onRetry={laden} />
        </div>
      </Huelle>
    )
  }
  if (!daten) {
    return (
      <Huelle titel="Material bearbeiten">
        <div className="mx-auto w-full max-w-3xl p-6">
          <AdminLoadingState variant="list" />
        </div>
      </Huelle>
    )
  }
  // Nach Verwerfen wird neu geladen: der Schlüssel setzt Verlauf und Auswahl zurück
  return <Arbeitsflaeche key={version} daten={daten} neuLaden={laden} />
}

function Huelle({ titel, kopf, children }: { titel: string; kopf?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-ws-bg text-ws-text">
      <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center gap-2 border-b border-ws-line bg-ws-surface px-3 py-2 sm:px-6">
        {kopf ?? (
          <>
            <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 rounded-xl text-ws-muted hover:bg-ws-raised">
              <a href={ZURUECK} aria-label="Schließen und zurück">
                <X className="size-5" aria-hidden />
              </a>
            </Button>
            <h1 className="text-base font-bold">{titel}</h1>
          </>
        )}
      </header>
      <main id="ws-main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
    </div>
  )
}

function Speicheranzeige({ stand, text }: { stand: ReturnType<typeof useEditorZustand>['speicherstand']; text: string | null }) {
  const inhalt = {
    gespeichert: { icon: <Check className="size-4 text-ws-green" aria-hidden />, satz: 'Entwurf gespeichert' },
    ungespeichert: { icon: <Loader2 className="size-4 animate-spin" aria-hidden />, satz: 'Wird gespeichert …' },
    speichert: { icon: <Loader2 className="size-4 animate-spin" aria-hidden />, satz: 'Wird gespeichert …' },
    fehler: { icon: <CloudOff className="size-4 text-ws-red" aria-hidden />, satz: 'Nicht gespeichert – wird erneut versucht' },
  }[stand]
  return (
    <span className="flex items-center gap-1.5 text-xs text-ws-muted sm:text-sm" role="status" aria-live="polite" title={text ?? undefined}>
      {inhalt.icon}
      {inhalt.satz}
    </span>
  )
}

function Arbeitsflaeche({ daten, neuLaden }: { daten: EditorDaten; neuLaden: () => void }) {
  const router = useRouter()
  const apple = useIsApplePlatform()
  const z = useEditorZustand(daten.id, daten.struktur, daten.stand)
  const v = useEditorVorschau(daten.id, z.gespeichertAm)
  const [auswahl, setAuswahlRoh] = useState<Auswahl>(null)
  // PROJ-101: Auswählen (Klick in der Vorschau, Leiste am Block) und Formular öffnen (Schublade) sind zwei Dinge
  const [schubladeOffen, setSchubladeOffen] = useState(false)
  const [modus, setModus] = useState<Modus>('bearbeiten')
  const [menue, setMenue] = useState<MenueAnker | null>(null)
  // Gliederung, Katalog, Typ wechseln: Wer dort wählt, will das Formular sehen (wie vor PROJ-101)
  const setAuswahl = useCallback((a: Auswahl) => {
    setAuswahlRoh(a)
    setSchubladeOffen(a !== null)
  }, [])
  // Handy: Vorschau zuerst, die Gliederung ist einen Tipp entfernt
  const [ansicht, setAnsicht] = useState<'gliederung' | 'vorschau'>('vorschau')
  const [gliederungOffen, setGliederungOffen] = useState(liesGliederungOffen)
  const [vollbreit, setVollbreit] = useState(false)
  // PROJ-97: Gliederung bewusst aufgeklappt, obwohl die Schublade offen ist (gilt nur, solange eine Stelle gewählt ist)
  const [gliederungTrotzSchublade, setGliederungTrotzSchublade] = useState(false)
  // PROJ-97: Bitte an die Gliederung, den Katalog zu öffnen (Kürzel, „+“ in der schmalen Leiste und in der Vorschau)
  const [einfuegenAnfrage, setEinfuegenAnfrage] = useState<EinfuegeAnfrage>({ nr: 0, ort: null })
  const [themaLoeschenAnfrage, setThemaLoeschenAnfrage] = useState<ThemaLoeschenAnfrage>({ nr: 0, thema: -1 })
  const istMobil = useIsMobile()
  const platzFuerAlles = useMindestBreite(1280)
  const [dialog, setDialog] = useState<'veroeffentlichen' | 'verwerfen' | 'schliessen' | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  // Solange es noch keine Vorschau-Befunde gibt, gelten die gespeicherten
  const kernBefunde = v.befunde ?? daten.befunde
  // PROJ-90: Blöcke mit unverändertem Beispielinhalt – berechnet, nie gespeichert
  const beispiele = useMemo(() => beispielBefunde(z.struktur), [z.struktur])
  const eigene = useMemo(() => editorBefunde(z.struktur), [z.struktur])
  const befunde = useMemo(
    () => (kernBefunde || eigene.length ? [...(kernBefunde ?? []), ...eigene] : null),
    [kernBefunde, eigene],
  )
  const befundKarte = useMemo(() => befundeJeStelle(befunde), [befunde])
  const hatAenderungen = z.hatEntwurf() || z.speicherstand !== 'gespeichert'
  // PROJ-94: eigene Seite ohne veröffentlichte Fassung – es gibt nichts, auf das man zurückkann, außer dem Grundgerüst
  const nie = !!daten.nieVeroeffentlicht

  // Die Auswahl kann ins Leere zeigen (Block gelöscht, Rückgängig): dann ist nichts gewählt
  const gewaehlt = useMemo(() => gueltigeAuswahl(auswahl, z.struktur), [auswahl, z.struktur])
  // Das Formular ist offen, wenn es gewünscht ist, etwas gewählt ist und wir im Bearbeiten-Modus sind
  const schubladeAktiv = schubladeOffen && !!gewaehlt && modus === 'bearbeiten'
  // Ist die Schublade zu, gilt wieder der gemerkte Zustand der Gliederung
  if (gliederungTrotzSchublade && !schubladeAktiv) setGliederungTrotzSchublade(false)
  // Bilder, die der Entwurf schon benutzt (Marke „Verwendet“ in der Bildauswahl)
  const verwendet = useMemo(() => new Set(JSON.stringify(z.struktur).match(/images\/[^"\\]+/g) ?? []), [z.struktur])

  const marke =
    gewaehlt === null
      ? null
      : gewaehlt.art === 'deckblatt'
        ? sprungmarke('deckblatt')
        : gewaehlt.art === 'abschluss'
          ? sprungmarke('abschluss')
          : gewaehlt.art === 'thema'
            ? sprungmarke({ thema: gewaehlt.thema })
            : sprungmarke({ thema: gewaehlt.thema, block: gewaehlt.block })

  // Name der gewählten Stelle für die Leiste in der Seite
  const auswahlName =
    gewaehlt === null
      ? ''
      : gewaehlt.art === 'block'
        ? typName(String(z.struktur.chapters[gewaehlt.thema]?.elements[gewaehlt.block]?.type ?? ''))
        : gewaehlt.art === 'thema'
          ? 'Thema'
          : gewaehlt.art === 'deckblatt'
            ? 'Deckblatt'
            : 'Lernzielkontrolle'

  // Themen ohne Blöcke: Die Seite zeigt dort Vorschläge statt einer Lücke
  const leereThemen = useMemo(
    () => z.struktur.chapters.flatMap((t, i) => (t.elements.length === 0 ? [i] : [])),
    [z.struktur],
  )

  function loescheBlockAn(ort: Ort) {
    if (z.gesperrt || !z.struktur.chapters[ort.thema]?.elements[ort.block]) return
    z.aendere((s) => loescheBlock(s, ort))
    setAuswahl(null)
    toast.success('Block gelöscht', { action: { label: 'Rückgängig', onClick: z.rueckgaengig } })
  }

  function frageThemaLoeschen(thema: number) {
    if (z.gesperrt || !z.struktur.chapters[thema]) return
    setThemaLoeschenAnfrage((x) => ({ nr: x.nr + 1, thema }))
  }

  function dupliziereBlockAn(ort: Ort) {
    if (z.gesperrt || !z.struktur.chapters[ort.thema]?.elements[ort.block]) return
    z.aendere((s) => dupliziereBlock(s, ort))
    // Die Kopie steht direkt dahinter und ist danach gewählt; das Formular bleibt, wie es war
    setAuswahlRoh({ art: 'block', thema: ort.thema, block: ort.block + 1 })
  }

  // Wünsche aus der Vorschau (PROJ-101). Die Seite zeigt und meldet, die App prüft und führt aus.
  // Rückgabe false = Vorschau veraltet („Bitte gleich noch einmal klicken“); nicht ausführbares sonst still ignoriert.
  function beiWunsch(w: VorschauWunsch): boolean {
    if (w.art === 'taste') {
      beiTaste(w.taste)
      return true
    }
    if (w.art === 'abwaehlen') {
      setAuswahl(null)
      return true
    }
    if (w.art === 'neuesThema') {
      if (z.gesperrt) return true
      // Hinter dem letzten Thema; das neue Thema ist danach gewählt und sein Formular offen
      const nach = z.struktur.chapters.length ? z.struktur.chapters.length - 1 : null
      const { index } = neuesThemaNach(z.struktur, nach)
      z.aendere((s) => neuesThemaNach(s, nach).struktur)
      setAuswahl({ art: 'thema', thema: index })
      setVollbreit(false)
      return true
    }
    // Alles mit Marke: Die Marken zählen Themen und Blöcke durch – stimmt die gezeigte Seite nicht mehr mit
    // dem Entwurf überein, wäre die Stelle falsch.
    const veraltet = v.laedt || v.gebautFuer !== z.gespeichertAm || z.speicherstand !== 'gespeichert'
    if (veraltet) return false
    const a = gueltigeAuswahl(auswahlAusMarke(w.marke), z.struktur)
    if (!a) return false
    switch (w.art) {
      case 'waehle':
        setAuswahlRoh(a)
        return true
      case 'bearbeite':
        setAuswahl(a)
        // Die Schublade ist in der Vollbreite-Ansicht ausgeblendet: Wer „Bearbeiten“ klickt, will sie sehen
        setVollbreit(false)
        return true
      case 'einfuegen': {
        if (z.gesperrt) return true
        const ort = einfuegeortAusMarke(w.marke, z.struktur)
        if (!ort) return false
        setVollbreit(false)
        setEinfuegenAnfrage((x) => ({ nr: x.nr + 1, ort }))
        return true
      }
      case 'schnell': {
        if (z.gesperrt) return true
        const ort = einfuegeortAusMarke(w.marke, z.struktur)
        if (!ort) return false
        setVollbreit(false)
        setEinfuegenAnfrage((x) => ({ nr: x.nr + 1, ort, typ: w.typ }))
        return true
      }
      case 'loesche':
      case 'dupliziere':
      case 'menue': {
        // Ein Thema löscht man nur nach Rückfrage (Dialog der Gliederung)
        if (w.art === 'loesche' && a.art === 'thema') {
          if (!z.gesperrt) frageThemaLoeschen(a.thema)
          return true
        }
        if (a.art !== 'block') return false
        if (z.gesperrt) return true
        const ort = { thema: a.thema, block: a.block }
        if (w.art === 'loesche') loescheBlockAn(ort)
        else if (w.art === 'dupliziere') dupliziereBlockAn(ort)
        else {
          setAuswahlRoh(a)
          setMenue({ x: w.x, y: w.y, ort })
        }
        return true
      }
    }
  }

  // Tasten, die die Seite weitergibt (sie hat den Fokus, die App sähe sie sonst nie)
  function beiTaste(t: Taste) {
    if (modus === 'ausprobieren') {
      if (t.mod && t.key === 'e') setModus('bearbeiten')
      else if (t.mod && t.key === 'z') (t.shift ? z.wiederholen : z.rueckgaengig)()
      return
    }
    switch (t.key) {
      case 'Escape':
        if (menue) setMenue(null)
        else if (schubladeAktiv) schliesseSchublade()
        else setAuswahl(null)
        break
      case 'ArrowUp':
      case 'ArrowDown': {
        const n = nachbarAuswahl(gewaehlt, z.struktur, t.key === 'ArrowDown' ? 1 : -1)
        if (n) setAuswahlRoh(n)
        break
      }
      case 'Enter':
        if (gewaehlt) {
          setSchubladeOffen(true)
          setVollbreit(false)
        }
        break
      case 'Delete':
      case 'Backspace':
        if (gewaehlt?.art === 'block') loescheBlockAn({ thema: gewaehlt.thema, block: gewaehlt.block })
        else if (gewaehlt?.art === 'thema') frageThemaLoeschen(gewaehlt.thema)
        break
      case 'd':
        if (t.mod && gewaehlt?.art === 'block') dupliziereBlockAn({ thema: gewaehlt.thema, block: gewaehlt.block })
        break
      case 'e':
        if (t.mod) wechsleModus('ausprobieren')
        break
      case 'z':
        if (t.mod) (t.shift ? z.wiederholen : z.rueckgaengig)()
        break
      case 'b':
        if (t.alt && t.shift) oeffneKatalog()
        break
    }
  }

  // Beim Wechsel in „Ausprobieren“ schließt das Formular; die Auswahl bleibt gemerkt
  function wechsleModus(m: Modus) {
    setModus(m)
    setMenue(null)
    if (m === 'ausprobieren') setSchubladeOffen(false)
  }

  // Katalog öffnen: Stelle nach der gemeinsamen Regel, gelesen im Moment des Aufrufs (Kürzel und „+“ der schmalen Leiste)
  function oeffneKatalog() {
    if (z.gesperrt) return
    setVollbreit(false)
    setEinfuegenAnfrage((a) => ({ nr: a.nr + 1, ort: einfuegeortAusAuswahl(gewaehlt, z.struktur) }))
  }

  // Schublade: Block darunter einfügen bzw. löschen (wie im ⋯-Menü der Gliederung)
  function blockDarunter() {
    if (z.gesperrt || gewaehlt?.art !== 'block') return
    const ort = einfuegeortAusAuswahl(gewaehlt, z.struktur)
    setEinfuegenAnfrage((a) => ({ nr: a.nr + 1, ort }))
  }

  function blockLoeschenAusSchublade() {
    if (gewaehlt?.art !== 'block') return
    loescheBlockAn({ thema: gewaehlt.thema, block: gewaehlt.block })
  }

  // Schublade schließen. Am Desktop gibt es kein Blatt, das den Fokus zurückgibt: Er geht zur
  // gewählten Zeile der Gliederung, sonst zum Knopf „Gliederung einblenden“, sonst zur Vorschau.
  function schliesseSchublade() {
    const zeile = document.querySelector<HTMLElement>('section[aria-label="Gliederung"] [aria-current="true"]')
    // Nur das Formular schließt; die Auswahl (Rahmen und Leiste in der Vorschau) bleibt
    setSchubladeOffen(false)
    if (istMobil) return
    requestAnimationFrame(() => {
      const ziel =
        zeile && zeile.isConnected && zeile.offsetParent !== null
          ? zeile
          : (document.querySelector<HTMLElement>('button[aria-label="Gliederung einblenden"]') ??
            document.querySelector<HTMLElement>('iframe[title="Vorschau der Seite"]'))
      ziel?.focus({ preventScroll: true })
    })
  }

  function schalteGliederung(offen: boolean) {
    setGliederungOffen(offen)
    merkeGliederungOffen(offen)
  }

  // PROJ-101 (BUG-3): Hat nicht die Vorschau, sondern die App den Fokus (z. B. nach dem Schließen der Schublade in der
  // Gliederung), gelten Pfeile, Enter, Entf, Esc und ⌘/Strg+D trotzdem. Die Vorschau gibt ihre Tasten selbst weiter;
  // ⌘/Strg+E, Z und Alt+Umschalt+B haben eigene Handler unten.
  const beiTasteRef = useRef(beiTaste)
  useEffect(() => {
    beiTasteRef.current = beiTaste
  })
  useEffect(() => {
    function taste(e: KeyboardEvent) {
      if (e.defaultPrevented || modus !== 'bearbeiten' || !gewaehlt) return
      const k = e.key
      const mod = e.metaKey || e.ctrlKey
      const art =
        mod && !e.altKey && !e.shiftKey && k.toLowerCase() === 'd'
          ? 'd'
          : !mod && !e.altKey && !e.shiftKey && ['ArrowUp', 'ArrowDown', 'Enter', 'Delete', 'Backspace', 'Escape'].includes(k)
            ? k
            : null
      if (!art) return
      const ziel = e.target as HTMLElement | null
      if (!ziel?.closest) return
      // Eingabefelder, Dialoge, Menüs und Texteditor behalten ihre Tasten; Ziehgriffe der Gliederung ebenso
      if (
        ziel.closest(
          'input, textarea, select, [contenteditable="true"], .cm-editor, [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"], [aria-roledescription="sortable"]',
        )
      )
        return
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return
      // Enter gehört bei Knöpfen und Links dem Knopf selbst
      if (art === 'Enter' && ziel.closest('button, a, summary, [role="button"], [role="treeitem"]')) return
      e.preventDefault()
      beiTasteRef.current({ key: art, mod, shift: false, alt: false } as Taste)
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [modus, gewaehlt])

  // Strg/⌘+Z und Strg/⌘+Umschalt+Z – nicht in Eingabefeldern (dort gilt zuerst das Feld)
  useEffect(() => {
    function taste(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      const ziel = e.target as HTMLElement | null
      if (ziel?.closest('input, textarea, [contenteditable="true"], .cm-editor')) return
      e.preventDefault()
      if (e.shiftKey) z.wiederholen()
      else z.rueckgaengig()
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [z])

  // ⌘/Strg+E wechselt zwischen „Bearbeiten“ und „Ausprobieren“ (hat die Seite den Fokus, gibt sie die Taste weiter)
  useEffect(() => {
    function taste(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'e') return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      e.preventDefault()
      wechsleModus(modus === 'bearbeiten' ? 'ausprobieren' : 'bearbeiten')
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [modus])

  // Alt+Umschalt+B („B“ wie Block) öffnet den Katalog – nicht bei offenem Dialog, nicht im Schreibschutz,
  // nicht in Eingabefeldern und im Texteditor (dort gilt zuerst das Feld).
  // (⌘/Strg+Umschalt+A gehört in Chrome der Tab-Suche und ist nicht abfangbar.)
  useEffect(() => {
    function taste(e: KeyboardEvent) {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.code !== 'KeyB') return
      if (z.gesperrt || dialog || document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      const ziel = e.target as HTMLElement | null
      if (ziel?.closest?.('input, textarea, select, [contenteditable="true"], .cm-editor')) return
      e.preventDefault()
      oeffneKatalog()
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [z.gesperrt, dialog, gewaehlt, z.struktur])

  function schliessen() {
    if (z.speicherstand !== 'gespeichert') setDialog('schliessen')
    else router.push(ZURUECK)
  }

  async function veroeffentlichen() {
    setLaeuft(true)
    try {
      if (!(await z.jetztSpeichern())) {
        toast.error('Die letzten Änderungen sind noch nicht gespeichert. Bitte versuche es gleich noch einmal.')
        return
      }
      const r = await veroeffentlicheEntwurf(daten.id, z.stand())
      z.neuStart(z.struktur, null)
      v.setBefunde(r.befunde)
      setDialog(null)
      toast.success('Veröffentlicht')
    } catch (e) {
      const f = e as { message: string; hinweis?: string }
      toast.error(f.hinweis ? `${f.message} ${f.hinweis}` : f.message)
    } finally {
      setLaeuft(false)
    }
  }

  async function verwerfen() {
    setLaeuft(true)
    try {
      await verwirfEntwurf(daten.id)
      setDialog(null)
      toast.success(nie ? 'Zurück auf das Grundgerüst' : 'Entwurf verworfen')
      neuLaden()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLaeuft(false)
    }
  }

  // Was zu sehen ist: Handy = Umschalter, sonst Vorschau groß, Gliederung nach Wunsch
  const schubladeZeigen = !vollbreit || istMobil
  const gliederungZeigen = !istMobil && !vollbreit
  // PROJ-97: Bei offener Schublade klappt die Gliederung ein, damit die Vorschau breit bleibt –
  // außer, sie wurde bewusst aufgeklappt. Der gemerkte Zustand (gliederungOffen) bleibt davon unberührt.
  const gliederungSichtbar = istMobil
    ? ansicht === 'gliederung'
    : gliederungZeigen && (schubladeAktiv ? gliederungTrotzSchublade : gliederungOffen)
  const vorschauZeigen = istMobil ? ansicht === 'vorschau' : true
  const schubladeAngedockt = !istMobil && schubladeAktiv && schubladeZeigen
  const spalten = istMobil
    ? ''
    : vollbreit
      ? 'lg:grid-cols-[minmax(0,1fr)]'
      : gliederungSichtbar
        ? schubladeAngedockt
          ? 'lg:grid-cols-[minmax(18rem,22rem)_minmax(30rem,1fr)_minmax(22rem,28rem)]'
          : 'lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]'
        : schubladeAngedockt
          ? 'lg:grid-cols-[3rem_minmax(30rem,1fr)_minmax(22rem,28rem)]'
          : 'lg:grid-cols-[3rem_minmax(0,1fr)]'
  const tasten = apple ? '⌘' : 'Strg+'
  const kuerzel = apple ? '⌥⇧B' : 'Alt+Umschalt+B'
  const kleinerKnopf = 'size-11 shrink-0 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text'
  const offeneHinweise = kernBefunde?.length ?? 0

  const kopf = (
    <>
      <Button variant="ghost" size="icon" className={kleinerKnopf} onClick={schliessen} aria-label="Schließen und zurück">
        <X className="size-5" aria-hidden />
      </Button>
      <div className="grid min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-sm font-bold sm:text-base" title={daten.titel}>
          {daten.titel}
        </h1>
        <Speicheranzeige stand={z.speicherstand} text={z.fehlertext} />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={kleinerKnopf}
        onClick={z.rueckgaengig}
        disabled={!z.kannZurueck}
        aria-label={`Rückgängig (${tasten}Z)`}
        title={`Rückgängig (${tasten}Z)`}
      >
        <Undo2 className="size-5" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={kleinerKnopf}
        onClick={z.wiederholen}
        disabled={!z.kannVor}
        aria-label={`Wiederholen (${apple ? '⌘⇧' : 'Strg+Umschalt+'}Z)`}
        title={`Wiederholen (${apple ? '⌘⇧' : 'Strg+Umschalt+'}Z)`}
      >
        <Redo2 className="size-5" aria-hidden />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={kleinerKnopf} aria-label="Weitere Aktionen">
            <MoreHorizontal className="size-5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!hatAenderungen}
            onSelect={() => setDialog('verwerfen')}
            className="text-ws-red focus:text-ws-red"
          >
            <RotateCcw className="mr-2 size-4" aria-hidden /> {nie ? 'Zurück auf das Grundgerüst' : 'Entwurf verwerfen'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        className={cn(HAUPTAKTION, 'min-h-11 w-auto px-4 text-sm')}
        disabled={!hatAenderungen || z.konflikt || !!z.gesperrt}
        onClick={() => setDialog('veroeffentlichen')}
      >
        Veröffentlichen
      </Button>
    </>
  )

  return (
    <Huelle titel={daten.titel} kopf={kopf}>
     <MaterialBilderProvider materialId={daten.id} verwendet={verwendet} seitenGroesse={v.groesse}>
      {z.konflikt && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-ws-red/30 bg-ws-red/10 px-4 py-3 text-sm text-ws-red sm:px-6">
          <AlertTriangle className="size-4" aria-hidden />
          Dieses Material wurde in einem anderen Fenster geändert. Deine letzten Änderungen hier sind nicht gespeichert.
          <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => window.location.reload()}>
            Neu laden
          </Button>
        </div>
      )}
      {z.gesperrt && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-ws-red/30 bg-ws-red/10 px-4 py-3 text-sm text-ws-red sm:px-6">
          <AlertTriangle className="size-4" aria-hidden />
          {z.gesperrt} Der Editor ist jetzt schreibgeschützt.
        </div>
      )}

      <div className="border-b border-ws-line px-4 py-2 lg:hidden">
        <AdminSegmented
          value={ansicht}
          onChange={setAnsicht}
          ariaLabel="Ansicht"
          options={[
            { value: 'gliederung', label: 'Gliederung' },
            { value: 'vorschau', label: 'Vorschau' },
          ]}
        />
      </div>

      <div className={cn('grid flex-1 gap-4 p-4 sm:p-6', spalten)}>
        {gliederungZeigen && !gliederungSichtbar && (
          <div className="hidden min-w-0 flex-col gap-2 lg:sticky lg:top-24 lg:flex lg:self-start">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 rounded-xl"
              onClick={() => {
                // Mit offener Schublade ist unter 1280 px kein Platz für beides: Dort schließt der Knopf die Schublade
                if (!schubladeAktiv) schalteGliederung(true)
                else if (platzFuerAlles) setGliederungTrotzSchublade(true)
                else {
                  // Schublade schließen und die Gliederung wirklich aufklappen (auch wenn sie vorher zugeklappt war)
                  setAuswahl(null)
                  schalteGliederung(true)
                }
              }}
              aria-label="Gliederung einblenden"
              aria-expanded={false}
              title="Gliederung einblenden"
              disabled={!!z.gesperrt}
            >
              <PanelLeftOpen className="size-5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 rounded-xl"
              onClick={oeffneKatalog}
              aria-label="Block hinzufügen"
              title={`Block hinzufügen (${kuerzel})`}
              disabled={!!z.gesperrt}
            >
              <Plus className="size-5" aria-hidden />
            </Button>
          </div>
        )}
        <section
          aria-label="Gliederung"
          hidden={!gliederungSichtbar}
          // Schreibgeschützt: keine Eingaben mehr möglich, Inhalt bleibt lesbar
          inert={z.gesperrt ? true : undefined}
          aria-disabled={z.gesperrt ? true : undefined}
          className={cn('min-w-0', z.gesperrt && 'opacity-70')}
        >
          <div className="mb-3 hidden items-center justify-between gap-2 lg:flex">
            <h2 className="text-sm font-semibold text-ws-muted">Gliederung</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
              onClick={() => (schubladeAktiv ? setGliederungTrotzSchublade(false) : schalteGliederung(false))}
              aria-label="Gliederung ausblenden"
              aria-expanded
              title="Gliederung ausblenden"
            >
              <PanelLeftClose className="size-5" aria-hidden />
            </Button>
          </div>
          <EditorGliederung
            struktur={z.struktur}
            aendere={z.aendere}
            rueckgaengig={z.rueckgaengig}
            auswahl={gewaehlt}
            setAuswahl={setAuswahl}
            befunde={befunde}
            befundKarte={befundKarte}
            einfuegenAnfrage={einfuegenAnfrage}
            themaLoeschenAnfrage={themaLoeschenAnfrage}
            kuerzel={kuerzel}
          />
        </section>
        <section
          aria-label="Vorschau"
          hidden={!vorschauZeigen}
          className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100svh-7.5rem)]"
        >
          <EditorVorschau
            html={v.html}
            laedt={v.laedt}
            fehler={v.fehler}
            marke={marke}
            neuLaden={v.neuBauen}
            groesse={v.groesse}
            name={auswahlName}
            onWunsch={beiWunsch}
            modus={modus}
            onModus={wechsleModus}
            lesen={!!z.gesperrt}
            mobil={istMobil}
            leer={leereThemen}
            vollbreit={vollbreit}
            onVollbreit={() => setVollbreit((b) => !b)}
          />
        </section>
        {schubladeZeigen && schubladeAktiv && gewaehlt && (
          <EditorSchublade
            auswahl={gewaehlt}
            struktur={z.struktur}
            aendere={z.aendere}
            rueckgaengig={z.rueckgaengig}
            materialId={daten.id}
            schliessen={schliesseSchublade}
            angedockt={!istMobil}
            gesperrt={!!z.gesperrt}
            onBlockDarunter={blockDarunter}
            onBlockLoeschen={blockLoeschenAusSchublade}
          />
        )}
      </div>

      <BlockMenue
        anker={menue}
        onClose={() => setMenue(null)}
        struktur={z.struktur}
        aendere={z.aendere}
        rueckgaengig={z.rueckgaengig}
        einfuegenBei={(ort) => setEinfuegenAnfrage((x) => ({ nr: x.nr + 1, ort }))}
        folge={setAuswahlRoh}
        onLoesche={loescheBlockAn}
      />

      <AlertDialog open={dialog === 'veroeffentlichen'} onOpenChange={(o) => !o && !laeuft && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neue Fassung veröffentlichen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Die neue Fassung wird für alle sichtbar, die das Material nutzen
                  {daten.oeffentlich && daten.imRegal
                    ? ' – über den öffentlichen Link und im Regal'
                    : daten.oeffentlich
                      ? ' – auch über den öffentlichen Link'
                      : daten.imRegal
                        ? ' – auch im Regal'
                        : ''}
                  . Der Download liefert ab dann die neue Fassung.
                </p>
                {offeneHinweise > 0 && (
                  <p className="text-ws-orange">
                    Die Prüfstelle hat {offeneHinweise} {offeneHinweise === 1 ? 'Hinweis' : 'Hinweise'}. Du kannst trotzdem veröffentlichen.
                  </p>
                )}
                {beispiele.length > 0 && (
                  <p className="text-ws-orange">
                    {beispiele.length === 1 ? '1 Block enthält' : `${beispiele.length} Blöcke enthalten`} noch Beispielinhalt.
                  </p>
                )}
                {z.struktur.chapters.length === 0 && <p className="text-ws-orange">Das Material hat keine Themen mehr.</p>}
                {nie && !hatAufgaben(z.struktur) && (
                  <p className="text-ws-orange">Die Seite hat noch keine Aufgaben. Du kannst trotzdem veröffentlichen.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl" disabled={laeuft}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(HAUPTAKTION, 'min-h-11 w-auto')}
              disabled={laeuft}
              onClick={(e) => {
                e.preventDefault()
                void veroeffentlichen()
              }}
            >
              {laeuft && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Veröffentlichen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === 'verwerfen'} onOpenChange={(o) => !o && !laeuft && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{nie ? 'Zurück auf das Grundgerüst?' : 'Entwurf verwerfen?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {nie
                ? 'Alle Änderungen gehen verloren. Die Seite beginnt wieder mit dem Grundgerüst aus Deckblatt, Thema 1 und Lernzielkontrolle.'
                : 'Alle Änderungen seit dem letzten Veröffentlichen gehen verloren. Das Material ist danach wieder so, wie es veröffentlicht ist.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl" disabled={laeuft}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
              disabled={laeuft}
              onClick={(e) => {
                e.preventDefault()
                void verwerfen()
              }}
            >
              {nie ? 'Zurück auf das Grundgerüst' : 'Entwurf verwerfen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === 'schliessen'} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Änderungen sind noch nicht gespeichert</AlertDialogTitle>
            <AlertDialogDescription>Trotzdem schließen? Die letzten Änderungen gehen dann verloren.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Weiter bearbeiten</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 rounded-xl" onClick={() => router.push(ZURUECK)}>
              Trotzdem schließen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
     </MaterialBilderProvider>
    </Huelle>
  )
}
