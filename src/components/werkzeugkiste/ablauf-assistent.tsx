'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, CircleHelp, Crosshair, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { KopierKnopf } from '@/components/werkzeugkiste/schritt-prompt'
import { ABLAUF_SCHRITTE } from '@/lib/werkzeugkiste'
import { ladeHilfeAngebot, speichereHilfeAngebot } from '@/lib/werkzeugkiste-api'
import type { HilfeAngebotAntwort } from '@/lib/werkzeugkiste-hilfe-angebot'
import {
  hatHilfe,
  HILFE_SCHRITT_NR,
  HILFE_UEBERGABE_SCHLUESSEL,
  hilfeProblem,
  hilfeSeite,
} from '@/lib/werkzeugkiste-hilfe'
import type { HilfeProblemId, HilfeStelle, HilfeVariante } from '@/lib/werkzeugkiste-hilfe-texte'
import { cn } from '@/lib/utils'

/** Wie lange die markierte Stelle leuchtet */
export const MARKIERUNG_MS = 2000
/** Klassen der Markierung (Tailwind sieht sie hier als Text) */
const MARKIERUNG = ['ring-2', 'ring-ws-green', 'ring-offset-2', 'ring-offset-ws-bg', 'rounded-2xl']

export type AngebotStand = 'laden' | 'offen' | 'beantwortet'

export interface HilfeSteuerung {
  /** Dieses Werkzeug hat fertige Hilfeseiten */
  verfuegbar: boolean
  offen: boolean
  setOffen: (offen: boolean) => void
  eingeklappt: boolean
  setEingeklappt: (e: boolean) => void
  angebot: AngebotStand
  beantworteAngebot: (a: HilfeAngebotAntwort) => void
}

/** Ab dieser Breite (Tailwind `xl`) ist die Hilfe von Anfang an offen */
const HILFE_BREIT_AB = 1280

/** Adresse des Hilfe-Knopfs: Beim Schließen geht der Fokus dorthin zurück */
export const HILFE_KNOPF_ID = 'wk-hilfe-knopf'

/**
 * Zustand des Assistenten (PROJ-87). Auf breiten Bildschirmen (ab 1280 px) ist er von
 * Anfang an offen, sonst nur, wenn die Lehrkraft ihn einschaltet (Knopf oder „Ja, bitte“).
 * Das Angebot wird einmal je Werkzeug gefragt; solange die Antwort lädt oder
 * die Abfrage scheitert, erscheint nichts. `uebergabe`: auf „Neues Material“
 * den Zustand für die nächste Seite merken (`schreiben`), im Ablauf einmal
 * übernehmen (`lesen`).
 */
export function useHilfe(werkzeugId: string, uebergabe?: 'schreiben' | 'lesen'): HilfeSteuerung {
  const verfuegbar = hatHilfe(werkzeugId)
  const [offen, setOffenIntern] = useState(() => {
    if (typeof window === 'undefined') return false
    // Auf breiten Bildschirmen (Seitenfeld, ab xl) läuft die Hilfe von Anfang an mit
    const breit = window.matchMedia?.(`(min-width: ${HILFE_BREIT_AB}px)`).matches ?? false
    if (uebergabe !== 'lesen') return breit
    try {
      const war = window.sessionStorage.getItem(HILFE_UEBERGABE_SCHLUESSEL)
      window.sessionStorage.removeItem(HILFE_UEBERGABE_SCHLUESSEL)
      return war === null ? breit : war === '1'
    } catch {
      return breit
    }
  })
  const [eingeklappt, setEingeklappt] = useState(false)
  const [angebot, setAngebot] = useState<AngebotStand>('laden')

  const setOffen = useCallback(
    (neu: boolean) => {
      setOffenIntern(neu)
      if (neu) setEingeklappt(false)
      if (uebergabe === 'schreiben') {
        try {
          window.sessionStorage.setItem(HILFE_UEBERGABE_SCHLUESSEL, neu ? '1' : '0')
        } catch {
          // ohne Speicher geht der Zustand beim Seitenwechsel verloren — nicht schlimm
        }
      }
    },
    [uebergabe],
  )

  useEffect(() => {
    if (!verfuegbar) return
    let aktiv = true
    ladeHilfeAngebot(werkzeugId)
      .then((a) => aktiv && setAngebot(a.beantwortet ? 'beantwortet' : 'offen'))
      .catch(() => aktiv && setAngebot('beantwortet')) // Fehler: lieber kein Angebot als einen Hinweis
    return () => {
      aktiv = false
    }
  }, [verfuegbar, werkzeugId])

  const beantworteAngebot = useCallback(
    (antwort: HilfeAngebotAntwort) => {
      setAngebot('beantwortet')
      if (antwort === 'ja') setOffen(true)
      // Im Hintergrund merken; scheitert es, kommt das Angebot beim nächsten Mal wieder
      speichereHilfeAngebot(werkzeugId, antwort).catch(() => undefined)
    },
    [werkzeugId, setOffen],
  )

  return { verfuegbar, offen, setOffen, eingeklappt, setEingeklappt, angebot, beantworteAngebot }
}

/** Was der Rahmen über den aktuellen Schritt weiß */
export interface HilfeKontext {
  werkzeug: string
  /** Hilfeseite zum aktuellen Schritt */
  variante: HilfeVariante
  /** Alle Hilfeseiten dieses Ablaufs in Reihenfolge */
  folge: HilfeVariante[]
  erledigt: boolean
  problem: HilfeProblemId | null
  /** Text für „Nachbesserungs-Auftrag kopieren“ */
  nachbesserung?: string | null
  /** Fortschritt der Teile, z. B. „2 von 3 Teilen“ */
  teileZeile?: string | null
}

/** Markiert die Stelle 2 Sekunden und scrollt hin; false, wenn es sie gerade nicht gibt */
export function zeigeStelle(stelle: HilfeStelle): boolean {
  const el = document.querySelector<HTMLElement>(`[data-hilfe="${stelle}"]`)
  if (!el) return false
  const ruhig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'center' })
  el.classList.add(...MARKIERUNG)
  window.setTimeout(() => el.classList.remove(...MARKIERUNG), MARKIERUNG_MS)
  return true
}

/** Knopf in der Kopfzeile des Ablaufs — nie grün (nur eine Hauptaktion pro Seite) */
export function HilfeKnopf({ steuerung }: { steuerung: HilfeSteuerung }) {
  if (!steuerung.verfuegbar) return null
  return (
    <Button
      id={HILFE_KNOPF_ID}
      variant="outline"
      onClick={() => steuerung.setOffen(!steuerung.offen)}
      aria-expanded={steuerung.offen}
      className="ml-auto min-h-11 shrink-0 rounded-xl border-ws-line bg-transparent px-3 text-ws-text hover:bg-ws-raised hover:text-ws-text focus-visible:ring-ws-green print:hidden"
    >
      <CircleHelp className="mr-2 size-4" aria-hidden />
      <span className="hidden sm:inline">Hilfe: Schritt für Schritt</span>
      <span className="sm:hidden">Hilfe</span>
    </Button>
  )
}

/** Kleine Karte beim allerersten Öffnen — blockiert nichts, ist kein Dialog */
export function HilfeAngebot({ steuerung }: { steuerung: HilfeSteuerung }) {
  if (!steuerung.verfuegbar || steuerung.angebot !== 'offen') return null
  const knopf = 'min-h-11 rounded-xl'
  return (
    <section
      aria-label="Angebot: Hilfe Schritt für Schritt"
      className="flex flex-col gap-3 rounded-2xl border border-ws-blue/30 bg-ws-blue/10 p-4 sm:flex-row sm:items-center sm:justify-between xl:hidden print:hidden"
    >
      <p className="font-medium text-ws-text">Neu hier? Ich führe dich Schritt für Schritt durch.</p>
      <div className="flex gap-2">
        <Button
          onClick={() => steuerung.beantworteAngebot('ja')}
          className={cn(knopf, 'bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green')}
        >
          Ja, bitte
        </Button>
        <Button
          variant="outline"
          onClick={() => steuerung.beantworteAngebot('nein')}
          className={cn(knopf, 'border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text')}
        >
          Nein, danke
        </Button>
      </div>
    </section>
  )
}

/** Klickt den Hauptknopf der Fußzeile des Formulars (der Lehrkraft die Arbeit abnehmen, nichts Automatisches) */
export function klickeWeiter(): boolean {
  const knoepfe = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-hilfe="weiter"] button'))
  const knopf = knoepfe[knoepfe.length - 1]
  if (!knopf || knopf.disabled) return false
  knopf.click()
  return true
}

/**
 * Der Assistent selbst: ab 1280 px ein Seitenfeld rechts, das die Formularspalte
 * nach links schiebt; darunter eine Karte im Seitenfluss direkt unter dem
 * Fortschritt. Er liegt nie über dem Formular, also verdeckt er auch keinen
 * Knopf. Er ist kein Dialog.
 */
export function HilfePanel({ steuerung, kontext }: { steuerung: HilfeSteuerung; kontext: HilfeKontext }) {
  const { offen, setOffen, eingeklappt, setEingeklappt } = steuerung
  const kopf = useRef<HTMLHeadingElement>(null)
  // Welche Seite die Lehrkraft gerade blättert; gilt nur für den Schritt, in dem sie sie gewählt hat
  const [blaettern, setBlaettern] = useState<{ fuer: HilfeVariante; seite: HilfeVariante } | null>(null)
  const anzeige = blaettern && blaettern.fuer === kontext.variante ? blaettern.seite : kontext.variante

  // Fokus: beim Öffnen in den Assistenten, beim Schließen zurück zum Knopf
  const warOffen = useRef(false)
  useEffect(() => {
    if (offen && !warOffen.current) kopf.current?.focus({ preventScroll: true })
    if (!offen && warOffen.current) document.getElementById(HILFE_KNOPF_ID)?.focus({ preventScroll: true })
    warOffen.current = offen
  }, [offen])

  // Esc schließt, solange kein Dialog darüber liegt
  useEffect(() => {
    if (!offen) return
    function taste(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return
      setOffen(false)
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [offen, setOffen])

  if (!steuerung.verfuegbar || !offen) return null

  const folge = kontext.folge
  const aktuellIdx = Math.max(0, folge.indexOf(kontext.variante))
  const anzeigeIdx = Math.max(0, folge.indexOf(anzeige))
  const istAktuell = anzeige === kontext.variante
  const seite = hilfeSeite(kontext.werkzeug, anzeige)
  const nr = HILFE_SCHRITT_NR[anzeige]
  const schrittName = ABLAUF_SCHRITTE.find((s) => s.nr === nr)?.label ?? ''
  // Frühere Seiten gelten als erledigt, spätere nicht, die aktuelle nach Stand des Ablaufs
  const erledigt = istAktuell ? kontext.erledigt : anzeigeIdx < aktuellIdx
  const problem = istAktuell && kontext.problem ? hilfeProblem(kontext.problem) : null
  const stelle = erledigt ? (seite.zeigeErledigt ?? seite.zeige) : seite.zeige
  const vorige = anzeigeIdx > 0 ? folge[anzeigeIdx - 1] : null
  const naechste = anzeigeIdx < folge.length - 1 ? folge[anzeigeIdx + 1] : null
  // Weiter im Ablauf: nur wenn dieser Schritt erledigt ist und es einen nächsten gibt
  const weiterNr = naechste ? HILFE_SCHRITT_NR[naechste] : null
  const kannWeiter = istAktuell && erledigt && !problem && weiterNr !== null && anzeige !== 'fertig'

  function zeig() {
    if (!stelle) return
    window.setTimeout(() => zeigeStelle(stelle), 50)
  }

  function weiter() {
    if (!klickeWeiter()) zeigeStelle('weiter')
  }

  return (
    <aside
      aria-label="Hilfe: Schritt für Schritt"
      className={cn(
        'rounded-2xl border border-ws-line bg-ws-surface p-4 shadow-sm',
        'xl:fixed xl:right-6 xl:top-24 xl:z-30 xl:w-80 xl:max-h-[calc(100svh-8rem)] xl:overflow-y-auto',
        'print:hidden',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p role="status" className="text-sm text-ws-muted">
            Schritt {nr} von {ABLAUF_SCHRITTE.length} · <span className="font-semibold text-ws-text">{schrittName}</span>
            {erledigt && <span className="sr-only">, erledigt</span>}
          </p>
          <h2 ref={kopf} tabIndex={-1} className="mt-1 text-base font-semibold leading-snug outline-none">
            {seite.ueberschrift}
          </h2>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEingeklappt(!eingeklappt)}
            aria-expanded={!eingeklappt}
            aria-label={eingeklappt ? 'Hilfe ausklappen' : 'Hilfe einklappen'}
            className="size-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text xl:hidden"
          >
            <ChevronDown className={cn('size-5 transition-transform duration-200', eingeklappt && 'rotate-180')} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOffen(false)}
            aria-label="Hilfe schließen"
            className="size-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className={cn('mt-2 space-y-3', eingeklappt && 'hidden xl:block')}>
        {problem ? (
          <div role="alert" className="space-y-3 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3">
            <p className="font-semibold text-ws-orange">{problem.was}</p>
            <p className="leading-relaxed text-ws-text">{problem.tun}</p>
            {problem.knopf === 'nachbesserung' && kontext.nachbesserung && (
              <KopierKnopf text={kontext.nachbesserung} label="Nachbesserungs-Auftrag kopieren" />
            )}
          </div>
        ) : (
          <>
            <p className="leading-relaxed text-ws-text">{seite.anweisung}</p>
            <p className="text-sm italic text-ws-muted">{seite.beispiel}</p>
            {kontext.teileZeile && anzeige === 'teile' && <p className="text-sm text-ws-muted">{kontext.teileZeile}</p>}
            {erledigt && (
              <p className="flex items-center gap-2 rounded-xl bg-ws-green/15 px-3 py-2 text-sm font-semibold text-ws-green">
                <Check className="size-4 shrink-0" aria-hidden />
                Erledigt
              </p>
            )}
            <p className={cn('text-sm', erledigt ? 'text-ws-muted' : 'font-medium text-ws-text')}>{seite.fertigWenn}</p>
          </>
        )}

        {kannWeiter ? (
          <Button
            onClick={weiter}
            className="min-h-11 w-full rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green"
          >
            Weiter zu Schritt {weiterNr}
          </Button>
        ) : (
          stelle &&
          !problem && (
            <Button
              variant="outline"
              onClick={zeig}
              className="min-h-11 w-full rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
            >
              <Crosshair className="mr-2 size-4" aria-hidden />
              Zeig mir die Stelle
            </Button>
          )
        )}

        {seite.mehrDazu && (
          <Collapsible>
            <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-1 rounded-xl text-sm text-ws-blue hover:text-ws-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
              Mehr dazu
              <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="pb-1 text-sm leading-relaxed text-ws-muted">{seite.mehrDazu}</CollapsibleContent>
          </Collapsible>
        )}

        {(vorige || naechste) && (
          <nav aria-label="Hilfeseiten" className="flex items-center justify-between gap-2 border-t border-ws-line pt-2 text-sm">
            {vorige ? (
              <Button
                variant="ghost"
                onClick={() => setBlaettern({ fuer: kontext.variante, seite: vorige })}
                className="min-h-11 rounded-xl px-2 text-ws-muted hover:bg-ws-raised hover:text-ws-text"
              >
                ‹ Hilfe zu Schritt {HILFE_SCHRITT_NR[vorige]}
              </Button>
            ) : (
              <span />
            )}
            {naechste ? (
              <Button
                variant="ghost"
                onClick={() => setBlaettern({ fuer: kontext.variante, seite: naechste })}
                className="min-h-11 rounded-xl px-2 text-ws-muted hover:bg-ws-raised hover:text-ws-text"
              >
                Hilfe zu Schritt {HILFE_SCHRITT_NR[naechste]} ›
              </Button>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </aside>
  )
}
