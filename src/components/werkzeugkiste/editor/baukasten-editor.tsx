'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, CloudOff, Loader2, FolderInput, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Redo2, RotateCcw, Undo2, X } from 'lucide-react'
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
import { ladeEditor, uebernehmeBilder, veroeffentlicheEntwurf, verwirfEntwurf } from '@/lib/werkzeugkiste-api'
import {
  befundeJeStelle,
  dupliziereBlock,
  hatAufgaben,
  loescheBlock,
  setzeBlock,
  sprungmarke,
  typName,
  verschiebeThema,
  type Block,
  type EditorDaten,
  type Ort,
} from '@/lib/werkzeugkiste-editor'
import {
  ZWISCHENABLAGE_MAX_BLOECKE,
  bereichOrte,
  bildPfadeIn,
  blockZahl,
  bloeckeAn,
  eineStelle,
  ersetzeBildPfade,
  fuegeBloeckeEin,
  gleicheTypOrte,
  loescheBloecke,
  ordneOrte,
  passendeBloecke,
  setzeUebernahmeEin,
  textAlsBlock,
  verschiebeBloecke,
  type Ziel,
} from '@/lib/werkzeugkiste-bloecke'
import { beispielBefunde, editorBefunde } from '@/lib/werkzeugkiste-katalog'
import {
  fasseZurGalerieZusammen,
  kannZurGalerie,
  loeseGalerieAuf,
  setzeAusrichtung,
  setzeBreite,
  hatBild,
  begrenzeBreite,
} from '@/lib/werkzeugkiste-bild-block'
import { HAUPTAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { EditorGliederung, type Auswahl, type EinfuegeAnfrage, type ThemaLoeschenAnfrage } from '@/components/werkzeugkiste/editor/editor-gliederung'
import { EditorSchublade, gueltigeAuswahl } from '@/components/werkzeugkiste/editor/editor-schublade'
import { MaterialBilderProvider } from '@/components/werkzeugkiste/editor/material-bilder'
import {
  BildWerkzeuge,
  KEINE_BILDANFRAGE,
  liesBilderAusZwischenablage,
  type BildAnfrage,
  type DateiZiel,
} from '@/components/werkzeugkiste/editor/bild-werkzeuge'
import { auswahlAusMarke } from '@/components/werkzeugkiste/editor/vorschau-skript'
import type { Taste, VorschauWunsch } from '@/components/werkzeugkiste/editor/vorschau-nachrichten'
import { BlockMenue, type MenueAnker } from '@/components/werkzeugkiste/editor/block-menue'
import { nachbarAuswahl } from '@/components/werkzeugkiste/editor/auswahl-navigation'
import { kopiereBloecke, liesZwischenablage } from '@/components/werkzeugkiste/editor/block-zwischenablage'
import { UebernehmenDialog } from '@/components/werkzeugkiste/editor/uebernehmen-dialog'
import type { UebernahmeErgebnis } from '@/lib/werkzeugkiste-api'
import {
  einfuegeortAusAuswahl,
  einfuegeortAusMarke,
  neuesThemaNach,
} from '@/components/werkzeugkiste/editor/einfuege-stelle'
import { EditorVorschau, type DateiZielMarke, type Modus } from '@/components/werkzeugkiste/editor/editor-vorschau'
import { stelleStimmt, useEditorVorschau, useEditorZustand } from '@/components/werkzeugkiste/editor/use-editor-zustand'
import {
  direktBearbeitbar,
  einfachText,
  schreibWert,
  setzeSchreibWert,
  alsReinerText,
  uebernimmSchreibtext,
  type SchreibTeil,
} from '@/components/werkzeugkiste/editor/schreiben'
import type { AufgabeBefehl, AufgabeStart, SchreibBefehl, SchreibStart } from '@/components/werkzeugkiste/editor/editor-vorschau'
import { LOESCH_TEXTE, eintragFuerBlock, hatBauplan, uebernimmAufgabe, type EintragOrt } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'

/** PROJ-114: Eine offene Aufgabe in der Seite (je Marke; eine alte darf ihre letzten Meldungen noch schicken) */
interface AufgabeSitzung {
  nr: number
  marke: string
  ort: Ort
  typ: string
  /** Stand, den die Seite gerade zeigt (als Text), damit Rückgängig dort ankommt */
  bekannt: string
}

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
  // PROJ-103: Direkt in der Seite schreiben. Solange die Sitzung läuft, baut die Vorschau nicht neu.
  const [schreiben, setSchreiben] = useState<SchreibStart | null>(null)
  const [schreibBefehl, setSchreibBefehl] = useState<SchreibBefehl | null>(null)
  const schreibRef = useRef<{ nr: number; marke: string; teil: SchreibTeil; ort: Auswahl; start: string } | null>(null)
  const schreibZaehler = useRef(0)
  // PROJ-114: Aufgabe an Ort und Stelle bearbeiten. Solange sie offen ist, baut die Vorschau nicht neu.
  const [aufgabe, setAufgabe] = useState<AufgabeStart | null>(null)
  const [aufgabeBefehl, setAufgabeBefehl] = useState<AufgabeBefehl | null>(null)
  const sitzungen = useRef(new Map<string, AufgabeSitzung>())
  const aktiveAufgabe = useRef<string | null>(null)
  const aufgabeZaehler = useRef(0)
  const v = useEditorVorschau(daten.id, z.gespeichertAm, !!schreiben || !!aufgabe, z.gespeichertSchluessel)
  const [auswahl, setAuswahlState] = useState<Auswahl>(null)
  // PROJ-102: Mehrfachauswahl (mindestens zwei Blöcke); `auswahl` bleibt der zuletzt gewählte Block, an dem die Leiste hängt
  const [markiert, setMarkiert] = useState<Ort[]>([])
  const [loeschenFrage, setLoeschenFrage] = useState<Ort[] | null>(null)
  const anker = useRef<Ort | null>(null)
  const nutzer = daten.nutzer ?? 'unbekannt'
  // Eine normale Auswahl beendet immer die Mehrfachauswahl
  const setAuswahlRoh = useCallback((a: Auswahl) => {
    // Ausgangspunkt für Umschalt+Klick ist jeder zuletzt einzeln gewählte Block
    if (a?.art === 'block') anker.current = { thema: a.thema, block: a.block }
    setAuswahlState(a)
    setMarkiert([])
  }, [])
  // PROJ-101: Auswählen (Klick in der Vorschau, Leiste am Block) und Formular öffnen (Schublade) sind zwei Dinge
  const [schubladeOffen, setSchubladeOffen] = useState(false)
  const [modus, setModus] = useState<Modus>('bearbeiten')
  const [menue, setMenue] = useState<MenueAnker | null>(null)
  // Gliederung, Katalog, Typ wechseln: Wer dort wählt, will das Formular sehen (wie vor PROJ-101)
  const setAuswahl = useCallback((a: Auswahl) => {
    setAuswahlRoh(a)
    setSchubladeOffen(a !== null)
  }, [setAuswahlRoh])
  // Handy: Vorschau zuerst, die Gliederung ist einen Tipp entfernt
  const [ansicht, setAnsicht] = useState<'gliederung' | 'vorschau'>('vorschau')
  const [gliederungOffen, setGliederungOffen] = useState(liesGliederungOffen)
  const [vollbreit, setVollbreit] = useState(false)
  // PROJ-97: Gliederung bewusst aufgeklappt, obwohl die Schublade offen ist (gilt nur, solange eine Stelle gewählt ist)
  const [gliederungTrotzSchublade, setGliederungTrotzSchublade] = useState(false)
  // PROJ-97: Bitte an die Gliederung, den Katalog zu öffnen (Kürzel, „+“ in der schmalen Leiste und in der Vorschau)
  const [einfuegenAnfrage, setEinfuegenAnfrage] = useState<EinfuegeAnfrage>({ nr: 0, ort: null })
  const [themaLoeschenAnfrage, setThemaLoeschenAnfrage] = useState<ThemaLoeschenAnfrage>({ nr: 0, thema: -1 })
  // PROJ-104/106: Aufträge an die Bild-Werkzeuge (Austauschen, Zuschneiden, Drehen, Beschriften, Dateien)
  const [bildAnfrage, setBildAnfrage] = useState<BildAnfrage>(KEINE_BILDANFRAGE)
  const istMobil = useIsMobile()
  const platzFuerAlles = useMindestBreite(1280)
  const [dialog, setDialog] = useState<'veroeffentlichen' | 'verwerfen' | 'schliessen' | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  // PROJ-108: Dialog „Aus Material übernehmen“; `ziel` ist die Stelle, an der er geöffnet wurde (null = es gibt noch kein Thema)
  const [uebernehmen, setUebernehmen] = useState<{ ziel: Ziel | null } | null>(null)
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
  // PROJ-102: Alle gewählten Blöcke (bei Einzelauswahl genau einer, sonst keiner)
  const wahlOrte = useMemo<Ort[]>(() => {
    if (gewaehlt?.art !== 'block') return []
    const eins = { thema: gewaehlt.thema, block: gewaehlt.block }
    if (markiert.length > 1) {
      const m = ordneOrte(z.struktur, markiert)
      if (m.length > 1 && m.some((o) => o.thema === eins.thema && o.block === eins.block)) return m
    }
    return [eins]
  }, [gewaehlt, markiert, z.struktur])
  const viele = wahlOrte.length > 1
  if (markiert.length > 0 && !viele) setMarkiert([])
  const mehrMarken = viele ? wahlOrte.map((o) => sprungmarke(o)) : []
  // Das Formular ist offen, wenn es gewünscht ist, etwas gewählt ist und wir im Bearbeiten-Modus sind (nicht bei Mehrfachauswahl)
  const schubladeAktiv = schubladeOffen && !!gewaehlt && modus === 'bearbeiten' && !viele
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

  // ── PROJ-102: mehrere Blöcke, Verschieben, Kopieren und Einfügen ──────────
  // Alle Wege (Ziehen, Menü, Tasten, Zwischenablage) laufen durch dieselben reinen Funktionen
  // aus `werkzeugkiste-bloecke.ts` und sind **ein** Schritt für „Rückgängig“.
  function waehleOrte(orte: Ort[], primaer?: Ort) {
    // Nur ordnen: Nach dem Verschieben oder Einfügen gelten die neuen Stellen erst im nächsten Zustand,
    // ob es sie gibt, prüft die Ableitung `wahlOrte` beim Anzeigen
    const g = orte
      .filter((o) => Number.isInteger(o.thema) && Number.isInteger(o.block))
      .sort((x, y) => x.thema - y.thema || x.block - y.block)
      .filter((o, i, l) => i === 0 || o.thema !== l[i - 1].thema || o.block !== l[i - 1].block)
    if (g.length === 0) return
    const p = primaer ?? g[g.length - 1]
    setAuswahlState({ art: 'block', thema: p.thema, block: p.block })
    setMarkiert(g.length > 1 ? g : [])
    if (g.length > 1) setSchubladeOffen(false)
  }

  function loescheOrte(orte: Ort[], mitFrage: boolean) {
    if (z.gesperrt) return
    const g = ordneOrte(z.struktur, orte)
    if (g.length === 0) return
    if (mitFrage && g.length >= 5) {
      setLoeschenFrage(g)
      return
    }
    z.aendere((s) => loescheBloecke(s, g))
    setAuswahl(null)
    toast.success(g.length === 1 ? 'Block gelöscht' : `${blockZahl(g.length)} gelöscht`, {
      action: { label: 'Rückgängig', onClick: z.rueckgaengig },
    })
  }

  function loescheAuswahl() {
    if (viele) loescheOrte(wahlOrte, true)
    else if (wahlOrte[0]) loescheBlockAn(wahlOrte[0])
  }

  function dupliziereAuswahl() {
    if (z.gesperrt) return
    if (!viele) {
      if (wahlOrte[0]) dupliziereBlockAn(wahlOrte[0])
      return
    }
    const letzter = wahlOrte[wahlOrte.length - 1]
    const ziel: Ziel = { thema: letzter.thema, index: letzter.block + 1 }
    const kopien = bloeckeAn(z.struktur, wahlOrte)
    const r = fuegeBloeckeEin(z.struktur, ziel, kopien)
    z.aendere((s) => fuegeBloeckeEin(s, ziel, kopien).struktur)
    waehleOrte(r.orte)
  }

  function verschiebeAuswahlNach(ziel: Ziel) {
    if (z.gesperrt || wahlOrte.length === 0) return
    const orte = wahlOrte
    const r = verschiebeBloecke(z.struktur, orte, ziel)
    if (r.struktur === z.struktur) return
    z.aendere((s) => verschiebeBloecke(s, orte, ziel).struktur)
    waehleOrte(r.orte)
  }

  // Alt + Pfeil: eine Stelle weiter, auch über Themengrenzen
  function verschiebeEineStelle(richtung: 1 | -1) {
    if (z.gesperrt) return
    if (gewaehlt?.art === 'thema') {
      const von = gewaehlt.thema
      const nach = von + richtung
      if (nach < 0 || nach >= z.struktur.chapters.length) return
      z.aendere((s) => verschiebeThema(s, von, nach))
      setAuswahlRoh({ art: 'thema', thema: nach })
      return
    }
    const ziel = eineStelle(z.struktur, wahlOrte, richtung)
    if (ziel) verschiebeAuswahlNach(ziel)
  }

  function waehleMehr(ort: Ort, wie: 'umschalten' | 'bereich') {
    const basis: Ort[] = viele ? wahlOrte : gewaehlt?.art === 'block' ? [{ thema: gewaehlt.thema, block: gewaehlt.block }] : []
    if (wie === 'bereich') {
      const a = anker.current
      const von = a && z.struktur.chapters[a.thema]?.elements[a.block] ? a : (basis[0] ?? ort)
      waehleOrte(bereichOrte(z.struktur, von, ort), ort)
      return
    }
    const drin = basis.some((o) => o.thema === ort.thema && o.block === ort.block)
    const neu = drin ? basis.filter((o) => !(o.thema === ort.thema && o.block === ort.block)) : [...basis, ort]
    if (!drin) anker.current = ort
    if (neu.length === 0) setAuswahl(null)
    else waehleOrte(neu, drin ? neu[neu.length - 1] : ort)
  }

  function kopiereOrte(schneiden: boolean) {
    if (wahlOrte.length === 0 || (schneiden && z.gesperrt)) return
    const bloecke = bloeckeAn(z.struktur, wahlOrte)
    const r = kopiereBloecke(bloecke, daten.id, nutzer)
    if (r === 'zu-viele') {
      toast.error(`Bitte höchstens ${ZWISCHENABLAGE_MAX_BLOECKE} Blöcke auf einmal kopieren.`)
      return
    }
    if (r === 'zu-gross') {
      toast.error('Das ist zu viel auf einmal. Bitte kopiere weniger Blöcke.')
      return
    }
    if (!schneiden) {
      toast.success(`${blockZahl(bloecke.length)} kopiert`)
      return
    }
    const orte = wahlOrte
    z.aendere((s) => loescheBloecke(s, orte))
    setAuswahl(null)
    toast.success(`${blockZahl(bloecke.length)} ausgeschnitten`, { action: { label: 'Rückgängig', onClick: z.rueckgaengig } })
  }

  // Wohin eingefügt wird: hinter den (letzten) gewählten Block, sonst ans Ende des letzten Themas
  function einfuegeZiel(): Ziel | null {
    const letzter = wahlOrte[wahlOrte.length - 1]
    return einfuegeortAusAuswahl(letzter ? { art: 'block', thema: letzter.thema, block: letzter.block } : gewaehlt, z.struktur)
  }

  async function fuegeEin() {
    if (z.gesperrt) return
    const ziel = einfuegeZiel()
    if (!ziel) {
      toast.info('Lege zuerst ein Thema an.')
      return
    }
    let bloecke: Block[]
    let ohneBild = 0
    const ablage = liesZwischenablage(nutzer)
    if (ablage) {
      // Nur Blöcke, die das Material kennt, bekommen ihre Bilder kopiert
      bloecke = passendeBloecke(ablage.bloecke).passend
      // Aus einem anderen Material: Die Bilder bekommen eine eigene Kopie (Prüfung der Größe vor dem Kopieren)
      const pfade = ablage.material !== daten.id ? bildPfadeIn(bloecke) : []
      if (pfade.length > 0) {
        try {
          const r = await uebernehmeBilder(daten.id, ablage.material, pfade, v.groesse)
          bloecke = ersetzeBildPfade(bloecke, r.zuordnung)
          ohneBild = r.fehlend.length
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Das Einfügen hat nicht geklappt.')
          return
        }
      }
    } else {
      // PROJ-104: Ein kopiertes Bild (Screenshot) wird ein Bild-Block
      const bilder = await liesBilderAusZwischenablage()
      if (bilder.length > 0) {
        setBildAnfrage((x) => ({ nr: x.nr + 1, art: 'dateien', dateien: bilder, ziel: { art: 'einfuegen', ziel } }))
        return
      }
      // Nichts Eigenes kopiert: normaler Text aus der Zwischenablage des Systems wird ein Lehrtext
      let text = ''
      try {
        text = await navigator.clipboard.readText()
      } catch {
        // keine Erlaubnis oder kein Zugriff
      }
      const block = textAlsBlock(text)
      if (!block) {
        toast.info(`Die Zwischenablage ist leer. Kopiere zuerst Blöcke mit ${apple ? '⌘' : 'Strg+'}C.`)
        return
      }
      bloecke = [block]
    }
    const passend = bloecke
    const ausgelassen = (ablage ? ablage.bloecke.length : bloecke.length) - passend.length
    if (passend.length === 0) {
      toast.error(ausgelassen === 1 ? '1 Block passt nicht in dieses Material und wurde ausgelassen.' : `${ausgelassen} Blöcke passen nicht in dieses Material.`)
      return
    }
    const r = fuegeBloeckeEin(z.struktur, ziel, passend)
    z.aendere((s) => fuegeBloeckeEin(s, ziel, passend).struktur)
    waehleOrte(r.orte)
    setVollbreit(false)
    toast.success(`${blockZahl(passend.length)} eingefügt`)
    if (ausgelassen > 0) {
      toast.info(ausgelassen === 1 ? '1 Block passt nicht in dieses Material und wurde ausgelassen.' : `${ausgelassen} Blöcke passen nicht in dieses Material und wurden ausgelassen.`)
    }
    if (ohneBild > 0) toast.info(ohneBild === 1 ? '1 Bild war nicht mehr erreichbar und fehlt.' : `${ohneBild} Bilder waren nicht mehr erreichbar und fehlen.`)
  }

  // PROJ-108: „Aus Material übernehmen“ öffnen. Stelle nach der gemeinsamen Regel (oder die des Katalogs)
  function oeffneUebernehmen(ziel?: Ziel | null) {
    if (z.gesperrt) return
    setVollbreit(false)
    setUebernehmen({ ziel: ziel === undefined ? einfuegeortAusAuswahl(gewaehlt, z.struktur) : ziel })
  }

  // PROJ-108: Der Server hat Inhalte gelesen und Bilder kopiert; hier wird eingesetzt – ein Rückgängig-Schritt
  function uebernommen(r: UebernahmeErgebnis) {
    if (z.gesperrt) return
    const ziel = uebernehmen?.ziel ?? null
    const { themen, bloecke } = r
    if (themen.length === 0 && bloecke.length === 0) return
    const ergebnis = setzeUebernahmeEin(z.struktur, ziel, themen, bloecke)
    z.aendere((s) => setzeUebernahmeEin(s, ziel, themen, bloecke).struktur)
    if (ergebnis.orte.length > 0) waehleOrte(ergebnis.orte)
    else if (ergebnis.themaIndizes.length > 0) setAuswahl({ art: 'thema', thema: ergebnis.themaIndizes[0] })
    setVollbreit(false)
    const teile = [themen.length === 1 ? '1 Thema' : themen.length > 1 ? `${themen.length} Themen` : '', bloecke.length > 0 ? blockZahl(bloecke.length) : '']
    toast.success(`${teile.filter(Boolean).join(' und ')} übernommen${r.herkunft ? ` (aus: ${r.herkunft})` : ''}`, {
      action: { label: 'Rückgängig', onClick: z.rueckgaengig },
    })
    if (r.ausgelassen > 0) {
      toast.info(r.ausgelassen === 1 ? '1 Block passt nicht in dieses Material und wurde ausgelassen.' : `${r.ausgelassen} Blöcke passen nicht in dieses Material und wurden ausgelassen.`)
    }
    if (r.fehlend > 0) toast.info(r.fehlend === 1 ? '1 Bild war nicht mehr erreichbar und fehlt.' : `${r.fehlend} Bilder waren nicht mehr erreichbar und fehlen.`)
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
    // PROJ-104: Die Vorschau merkt sich das Ziel einer abgelegten Datei selbst
    if (w.art === 'dropZiel') return true
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
    // PROJ-103: Zwischen-/Endstand und Abbruch gehören zu einer laufenden Sitzung; die Seite ist dabei absichtlich „älter“
    if (w.art === 'schreibZwischen' || w.art === 'schreibEnde' || w.art === 'schreibAbbruch') {
      beiSchreiben(w)
      return true
    }
    // PROJ-114: Meldungen einer offenen Aufgabe (auch sie gehören zu einer Sitzung, nicht zur gerade gebauten Seite)
    if (w.art === 'aufgabeAenderung' || w.art === 'aufgabeEnde' || w.art === 'aufgabeAbbruch' || w.art === 'aufgabeAktion') {
      beiAufgabe(w)
      return true
    }
    // Alles mit Marke: Die Marken zählen Themen und Blöcke durch. PROJ-113: Die Seite muss nicht brandneu sein,
    // aber die angeklickte Stelle muss in der gezeigten Seite dieselbe sein wie jetzt im Entwurf (sonst träfe der
    // Klick einen anderen Block). So geht ein Klick auch während des Neubaus.
    if (!stelleStimmt(w.marke, z.struktur, v.gebautSchluessel)) return false
    const a = gueltigeAuswahl(auswahlAusMarke(w.marke), z.struktur)
    if (!a) return false
    switch (w.art) {
      case 'aufgabe': {
        if (a.art !== 'block') return false
        const b = z.struktur.chapters[a.thema]?.elements[a.block]
        anker.current = { thema: a.thema, block: a.block }
        if (!b || !oeffneAufgabe({ thema: a.thema, block: a.block }, eintragFuerBlock(b, w.eintrag, w.anzahl))) setAuswahlRoh(a)
        return true
      }
      case 'waehle':
        if (a.art === 'block') {
          anker.current = { thema: a.thema, block: a.block }
          // PROJ-114: Auch eine Aufgabe, die der Kern (noch) nicht zeigen kann, öffnet an Ort und Stelle
          if (oeffneAufgabe({ thema: a.thema, block: a.block }, null)) return true
        }
        setAuswahlRoh(a)
        return true
      case 'mehr':
        if (a.art === 'block') waehleMehr({ thema: a.thema, block: a.block }, w.wie)
        return true
      case 'kopiere':
        kopiereOrte(false)
        return true
      case 'lege': {
        if (z.gesperrt || wahlOrte.length === 0) return true
        if (w.wo === 'anfang' && a.art === 'thema') verschiebeAuswahlNach({ thema: a.thema, index: 0 })
        else if (a.art === 'block') verschiebeAuswahlNach({ thema: a.thema, index: a.block + (w.wo === 'nach' ? 1 : 0) })
        return true
      }
      case 'legeThema': {
        if (z.gesperrt || gewaehlt?.art !== 'thema') return true
        const von = gewaehlt.thema
        const vor = a.art === 'abschluss' ? z.struktur.chapters.length : a.art === 'thema' ? a.thema : -1
        const nach = von < vor ? vor - 1 : vor
        if (vor < 0 || nach === von) return true
        z.aendere((s) => verschiebeThema(s, von, nach))
        setAuswahlRoh({ art: 'thema', thema: nach })
        return true
      }
      case 'schreibe': {
        if (z.gesperrt || modus !== 'bearbeiten' || viele || schreibRef.current) return true
        const wert = schreibWert(a, w.teil, z.struktur)
        if (wert === null) return true
        if (w.teil === 'text' && !direktBearbeitbar(wert)) {
          // Gestaltung, die der Schreibmodus nicht verlustfrei kann: wie im Formular die HTML-Ansicht anbieten
          setAuswahl(a)
          setVollbreit(false)
          toast.info('Dieser Text lässt sich nur in der Schublade bearbeiten (HTML-Ansicht), damit keine Gestaltung verloren geht.')
          return true
        }
        // Schublade und Schreiben in der Seite laufen gleichzeitig: Die Schublade bleibt, wie sie ist, und zeigt den Text live
        setAuswahlRoh(a)
        const nr = ++schreibZaehler.current
        schreibRef.current = { nr, marke: w.marke, teil: w.teil, ort: a, start: wert }
        setSchreiben({ nr, marke: w.marke, teil: w.teil, html: w.teil === 'text' ? wert : undefined })
        return true
      }
      case 'breite': {
        if (z.gesperrt || a.art !== 'block') return true
        const b = z.struktur.chapters[a.thema]?.elements[a.block]
        if (!b || b.type !== 'image' || !hatBild(b)) return true
        const prozent = begrenzeBreite(w.prozent)
        // Mit „Text daneben“ ist höchstens die halbe Breite sinnvoll
        const grenze = b.text_neben === 'links' || b.text_neben === 'rechts' ? Math.min(prozent, 50) : prozent
        z.aendere((s) => {
          const alt = s.chapters[a.thema]?.elements[a.block]
          if (!alt || alt.type !== 'image') return s
          return setzeBlock(s, { thema: a.thema, block: a.block }, setzeBreite(alt, grenze))
        })
        return true
      }
      case 'bildAktion': {
        if (a.art !== 'block') return false
        const ort = { thema: a.thema, block: a.block }
        const b = z.struktur.chapters[a.thema]?.elements[a.block]
        if (!b || b.type !== 'image') return true
        if (w.aktion === 'alt') {
          setAuswahl(a)
          setVollbreit(false)
          return true
        }
        if (z.gesperrt) return true
        if (w.aktion === 'links' || w.aktion === 'mitte' || w.aktion === 'rechts') {
          z.aendere((s) => {
            const alt = s.chapters[ort.thema]?.elements[ort.block]
            return alt && alt.type === 'image'
              ? setzeBlock(s, ort, setzeAusrichtung(alt, w.aktion as 'links' | 'mitte' | 'rechts'))
              : s
          })
          return true
        }
        if (w.aktion !== 'austauschen' && !hatBild(b)) return true
        setBildAnfrage((x) => ({
          nr: x.nr + 1,
          art: w.aktion as 'austauschen' | 'zuschneiden' | 'beschriften' | 'drehenLinks' | 'drehenRechts',
          ort,
        }))
        return true
      }
      case 'bearbeite':
        if (a.art === 'block' && oeffneAufgabe({ thema: a.thema, block: a.block }, null)) return true
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
        const inAuswahl = viele && wahlOrte.some((o) => o.thema === ort.thema && o.block === ort.block)
        if (w.art === 'loesche') {
          if (inAuswahl) loescheOrte(wahlOrte, true)
          else loescheBlockAn(ort)
        } else if (w.art === 'dupliziere') {
          if (inAuswahl) dupliziereAuswahl()
          else dupliziereBlockAn(ort)
        } else {
          // Das Menü gilt für alle gewählten Blöcke, wenn der Block dazugehört
          if (!inAuswahl) setAuswahlRoh(a)
          setMenue({ x: w.x, y: w.y, ort })
        }
        return true
      }
    }
  }

  // PROJ-104: Dateien wurden auf die Vorschau gelegt. `ziel` ist die Stelle, die die Seite zuletzt gemeldet hat.
  function beiDateien(dateien: File[], ziel: DateiZielMarke | null) {
    if (z.gesperrt) return
    let dz: DateiZiel | null = null
    if (ziel) {
      const a = gueltigeAuswahl(auswahlAusMarke(ziel.marke), z.struktur)
      if (!a || !stelleStimmt(ziel.marke, z.struktur, v.gebautSchluessel)) {
        toast.info('Die Vorschau wird gerade aktualisiert. Bitte lege die Datei gleich noch einmal ab.')
        return
      }
      if (ziel.wo === 'auf' && a.art === 'block') dz = { art: 'auf', ort: { thema: a.thema, block: a.block } }
      else if (ziel.wo === 'anfang' && a.art === 'thema') dz = { art: 'einfuegen', ziel: { thema: a.thema, index: 0 } }
      else if (a.art === 'block')
        dz = { art: 'einfuegen', ziel: { thema: a.thema, index: a.block + (ziel.wo === 'vor' ? 0 : 1) } }
    }
    if (!dz) {
      const zl = einfuegeZiel()
      if (!zl) {
        toast.info('Lege zuerst ein Thema an.')
        return
      }
      dz = { art: 'einfuegen', ziel: zl }
    }
    const endgueltig = dz
    setBildAnfrage((x) => ({ nr: x.nr + 1, art: 'dateien', dateien, ziel: endgueltig }))
  }

  // PROJ-105: Mehrere gewählte Bilder zu einer Galerie zusammenfassen und wieder auflösen
  function zurGalerie() {
    if (z.gesperrt) return
    const r = fasseZurGalerieZusammen(z.struktur, wahlOrte)
    if (!r) {
      toast.info('Wähle mindestens zwei Bilder (höchstens 12), die schon ein Bild haben.')
      return
    }
    z.aendere((s) => fasseZurGalerieZusammen(s, wahlOrte)?.struktur ?? s)
    waehleOrte([r.ort])
    toast.success('Galerie angelegt', { action: { label: 'Rückgängig', onClick: z.rueckgaengig } })
  }
  function galerieAufloesen() {
    const ort = wahlOrte[0]
    if (z.gesperrt || !ort) return
    const r = loeseGalerieAuf(z.struktur, ort)
    if (!r) return
    z.aendere((s) => loeseGalerieAuf(s, ort)?.struktur ?? s)
    waehleOrte(r.orte)
    toast.success('Galerie aufgelöst', { action: { label: 'Rückgängig', onClick: z.rueckgaengig } })
  }

  // PROJ-103: Text aus der Seite übernehmen. Die Seite schreibt nur, die App reinigt und speichert.
  function beendeSitzung(vorbei: boolean) {
    schreibRef.current = null
    setSchreiben(null)
    if (vorbei) setSchreibBefehl((b) => ({ nr: (b?.nr ?? 0) + 1, art: 'vorbei' }))
  }
  function beiSchreiben(w: Extract<VorschauWunsch, { art: 'schreibZwischen' | 'schreibEnde' | 'schreibAbbruch' }>) {
    const sit = schreibRef.current
    if (!sit || sit.marke !== w.marke) return
    if (w.art === 'schreibAbbruch') {
      beendeSitzung(false)
      return
    }
    if (w.teil !== sit.teil) return
    let wert: string
    if (sit.teil === 'text') {
      const r = uebernimmSchreibtext(sit.start, w.html)
      if (!r.ok) {
        // Der getippte Text darf nie still verloren gehen: zum Kopieren anbieten
        const verloren = alsReinerText(w.html)
        toast.error(r.grund, {
          duration: 20_000,
          action: verloren
            ? { label: 'Text kopieren', onClick: () => void navigator.clipboard?.writeText(verloren).then(() => toast.success('Text kopiert')) }
            : undefined,
        })
        beendeSitzung(true)
        return
      }
      wert = r.html
    } else {
      wert = einfachText(w.html)
    }
    // Eine Sitzung ist im Verlauf immer ein einziger Schritt
    if (!z.gesperrt) z.aendere((s) => setzeSchreibWert(sit.ort, sit.teil, s, wert), `schreib-${sit.nr}`, true)
    if (w.art === 'schreibEnde') beendeSitzung(wert === sit.start)
  }

  function beendeSchreibenInSeite() {
    if (schreibRef.current) setSchreibBefehl((b) => ({ nr: (b?.nr ?? 0) + 1, art: 'beende' }))
  }

  // ── PROJ-114: Aufgabe an Ort und Stelle ──────────────────────────────
  /** Öffnet die Aufgabe in der Seite; `false` = geht hier nicht (Schreibschutz, anderer Typ …), der Aufrufer wählt dann wie bisher */
  function oeffneAufgabe(ort: Ort, eintrag: EintragOrt | null): boolean {
    if (z.gesperrt || modus !== 'bearbeiten' || viele || schreibRef.current) return false
    const b = z.struktur.chapters[ort.thema]?.elements[ort.block]
    if (!b || !hatBauplan(b.type)) return false
    const marke = sprungmarke(ort)
    setAuswahlRoh({ art: 'block', thema: ort.thema, block: ort.block })
    setSchubladeOffen(false)
    if (aktiveAufgabe.current === marke) return true
    const nr = ++aufgabeZaehler.current
    sitzungen.current.set(marke, { nr, marke, ort, typ: b.type, bekannt: JSON.stringify(b) })
    aktiveAufgabe.current = marke
    setAufgabe({ nr, marke, block: b, typName: typName(b.type), eintrag })
    return true
  }

  function schliesseAufgabe(marke: string, art: 'beende' | 'vorbei' | null) {
    // Bei „beende“ schickt die Seite noch ihren letzten Stand und dann „fertig“: so lange bleibt die Sitzung bekannt
    if (art !== 'beende') sitzungen.current.delete(marke)
    if (aktiveAufgabe.current !== marke) return
    aktiveAufgabe.current = null
    setAufgabe(null)
    if (art) setAufgabeBefehl((x) => ({ nr: (x?.nr ?? 0) + 1, art }))
  }

  function beiAufgabe(w: Extract<VorschauWunsch, { art: 'aufgabeAenderung' | 'aufgabeEnde' | 'aufgabeAbbruch' | 'aufgabeAktion' }>) {
    const sit = sitzungen.current.get(w.marke)
    if (!sit) return
    if (w.art === 'aufgabeEnde' || w.art === 'aufgabeAbbruch') {
      schliesseAufgabe(w.marke, null)
      return
    }
    if (w.art === 'aufgabeAktion') {
      const a: Auswahl = { art: 'block', thema: sit.ort.thema, block: sit.ort.block }
      if (w.aktion === 'loeschen') {
        schliesseAufgabe(w.marke, 'vorbei')
        loescheBlockAn(sit.ort)
      } else if (w.aktion === 'duplizieren') {
        schliesseAufgabe(w.marke, 'beende')
        dupliziereBlockAn(sit.ort)
      } else {
        // Typ wechseln und Rohfassung wohnen (noch) in der Schublade
        schliesseAufgabe(w.marke, 'beende')
        setAuswahl(a)
        setVollbreit(false)
      }
      return
    }
    if (z.gesperrt) return
    const alt = z.struktur.chapters[sit.ort.thema]?.elements[sit.ort.block]
    if (!alt || alt.type !== sit.typ) return
    const r = uebernimmAufgabe(alt, w.block)
    if (!r.ok) {
      toast.error(r.grund)
      return
    }
    const text = JSON.stringify(r.block)
    sit.bekannt = text
    if (text === JSON.stringify(alt)) return
    const ort = sit.ort
    z.aendere((s) => setzeBlock(s, ort, r.block), `aufgabe-${sit.nr}-${w.gruppe}`)
    const geloescht = LOESCH_TEXTE[w.gruppe]
    if (geloescht) toast.success(geloescht, { duration: 8000, action: { label: 'Rückgängig', onClick: z.rueckgaengig } })
  }

  // Rückgängig, Wiederholen, Toast oder Schublade haben die offene Aufgabe geändert: der Seite den neuen Stand zeigen
  useEffect(() => {
    const marke = aktiveAufgabe.current
    const sit = marke ? sitzungen.current.get(marke) : null
    if (!marke || !sit) return
    const b = z.struktur.chapters[sit.ort.thema]?.elements[sit.ort.block]
    if (!b || b.type !== sit.typ) {
      schliesseAufgabe(marke, 'vorbei')
      return
    }
    const text = JSON.stringify(b)
    if (text === sit.bekannt) return
    sit.bekannt = text
    setAufgabeBefehl((x) => ({ nr: (x?.nr ?? 0) + 1, art: 'stand', block: b }))
  }, [z.struktur])

  // Lage ändert sich (andere Auswahl, Ausprobieren, Dialog, Mehrfachauswahl, Schreibschutz): Aufgabe schließen
  useEffect(() => {
    const m = aktiveAufgabe.current
    if (!m) return
    if (modus !== 'bearbeiten' || marke !== m || dialog || viele || z.gesperrt) schliesseAufgabe(m, 'beende')
  }, [modus, marke, dialog, viele, z.gesperrt, aufgabe])

  // Lage ändert sich (andere Auswahl, Formular, Ausprobieren, Dialog): Schreiben beenden, die Seite meldet den Endstand
  useEffect(() => {
    const sit = schreibRef.current
    if (!sit) return
    if (modus !== 'bearbeiten' || marke !== sit.marke || dialog) setSchreibBefehl((b) => ({ nr: (b?.nr ?? 0) + 1, art: 'beende' }))
  }, [modus, marke, dialog, schreiben])

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
        if (t.alt) {
          verschiebeEineStelle(t.key === 'ArrowDown' ? 1 : -1)
          break
        }
        const n = nachbarAuswahl(gewaehlt, z.struktur, t.key === 'ArrowDown' ? 1 : -1)
        if (n) setAuswahlRoh(n)
        break
      }
      case 'Enter':
        if (gewaehlt?.art === 'block' && oeffneAufgabe({ thema: gewaehlt.thema, block: gewaehlt.block }, null)) break
        if (gewaehlt) {
          setSchubladeOffen(true)
          setVollbreit(false)
        }
        break
      case 'Delete':
      case 'Backspace':
        if (gewaehlt?.art === 'block') loescheAuswahl()
        else if (gewaehlt?.art === 'thema') frageThemaLoeschen(gewaehlt.thema)
        break
      case 'd':
        if (t.mod && gewaehlt?.art === 'block') dupliziereAuswahl()
        break
      case 'c':
        if (t.mod) kopiereOrte(false)
        break
      case 'x':
        if (t.mod) kopiereOrte(true)
        break
      case 'v':
        if (t.mod) void fuegeEin()
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
      if (e.defaultPrevented || modus !== 'bearbeiten') return
      const k = e.key
      const kl = k.toLowerCase()
      const mod = e.metaKey || e.ctrlKey
      const art =
        mod && !e.altKey && !e.shiftKey && ['d', 'c', 'x', 'v'].includes(kl)
          ? kl
          : !mod && !e.shiftKey && e.altKey && (k === 'ArrowUp' || k === 'ArrowDown')
            ? k
            : !mod && !e.altKey && !e.shiftKey && ['ArrowUp', 'ArrowDown', 'Enter', 'Delete', 'Backspace', 'Escape'].includes(k)
              ? k
              : null
      if (!art) return
      // Ohne Auswahl gilt nur „Einfügen“
      if (!gewaehlt && art !== 'v') return
      // Markierter Text soll sich normal kopieren lassen
      if ((art === 'c' || art === 'x') && window.getSelection()?.toString()) return
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
      beiTasteRef.current({ key: art, mod, shift: false, alt: e.altKey } as Taste)
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
          <DropdownMenuItem disabled={!!z.gesperrt} onSelect={() => oeffneUebernehmen()}>
            <FolderInput className="mr-2 size-4" aria-hidden /> Aus Material übernehmen
          </DropdownMenuItem>
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
            markiert={viele ? wahlOrte : []}
            onMehr={waehleMehr}
            onAusMaterial={oeffneUebernehmen}
          />
        </section>
        <section
          aria-label="Vorschau"
          hidden={!vorschauZeigen}
          className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100svh-7.5rem)]"
        >
          <EditorVorschau
            schreiben={schreiben}
            schreibBefehl={schreibBefehl}
            beiNeueSeite={() => {
              schreibRef.current = null
              setSchreiben(null)
              // Neue Seite: Eine offene Aufgabe ist dort nicht mehr offen (Änderungen sind schon gespeichert)
              sitzungen.current.clear()
              aktiveAufgabe.current = null
              setAufgabe(null)
            }}
            aufgabe={aufgabe}
            aufgabeBefehl={aufgabeBefehl}
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
            mehrMarken={mehrMarken}
            schubladeOffen={schubladeZeigen && schubladeAktiv}
            onDateien={beiDateien}
          />
        </section>
        {schubladeZeigen && schubladeAktiv && gewaehlt && (
          // Wer in die Schublade klickt oder tippt, übernimmt das Schreiben von der Seite (sonst schrieben zwei Stellen in denselben Text)
          <div className="contents" onPointerDownCapture={beendeSchreibenInSeite} onFocusCapture={beendeSchreibenInSeite}>
            <EditorSchublade
              auswahl={gewaehlt}
              struktur={z.struktur}
              aendere={z.aendere}
              rueckgaengig={z.rueckgaengig}
              materialId={daten.id}
              schliessen={schliesseSchublade}
              angedockt={!istMobil}
              gesperrt={!!z.gesperrt}
            />
          </div>
        )}
      </div>

      <BlockMenue
        anker={menue}
        onClose={() => setMenue(null)}
        struktur={z.struktur}
        aendere={z.aendere}
        rueckgaengig={z.rueckgaengig}
        einfuegenBei={(ort) => setEinfuegenAnfrage((x) => ({ nr: x.nr + 1, ort }))}
        orte={wahlOrte}
        onVerschiebe={verschiebeAuswahlNach}
        onKopiere={() => kopiereOrte(false)}
        onAusschneide={() => kopiereOrte(true)}
        onEinfuegen={() => void fuegeEin()}
        onDupliziere={dupliziereAuswahl}
        onGleiche={(imThema) => {
          const ort = wahlOrte[wahlOrte.length - 1]
          if (!ort) return
          const gleiche = gleicheTypOrte(z.struktur, ort, imThema)
          if (gleiche.length < 2) toast.info('Es gibt keinen weiteren Block dieser Art.')
          else waehleOrte(gleiche, ort)
        }}
        onAufheben={() => setAuswahl(null)}
        onLoesche={loescheAuswahl}
        onGalerie={zurGalerie}
        onGalerieAufloesen={galerieAufloesen}
        kannGalerie={kannZurGalerie(z.struktur, wahlOrte)}
      />
      <BildWerkzeuge
        materialId={daten.id}
        anfrage={bildAnfrage}
        struktur={z.struktur}
        aendere={z.aendere}
        gesperrt={!!z.gesperrt}
        beiNeuesBild={(orte) => waehleOrte(orte)}
      />

      <UebernehmenDialog
        offen={uebernehmen !== null}
        onOpenChange={(o) => !o && setUebernehmen(null)}
        zielId={daten.id}
        seitenGroesse={v.groesse}
        onUebernommen={uebernommen}
      />
      <AlertDialog open={!!loeschenFrage} onOpenChange={(o) => !o && setLoeschenFrage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{loeschenFrage ? `${blockZahl(loeschenFrage.length)} löschen?` : ''}</AlertDialogTitle>
            <AlertDialogDescription>Du kannst das gleich mit „Rückgängig“ zurücknehmen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
              onClick={() => {
                const orte = loeschenFrage
                setLoeschenFrage(null)
                if (orte) loescheOrte(orte, false)
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
