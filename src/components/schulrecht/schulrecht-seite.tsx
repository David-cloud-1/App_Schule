'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Bot, ChevronDown, FileText, Loader2, Scale, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { AdminEmptyState, AdminErrorState } from '@/components/admin/admin-states'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { TrefferKarte } from '@/components/schulrecht/treffer-karte'
import { VerweisFenster } from '@/components/schulrecht/verweis-fenster'
import { VorschriftenDurchblaettern } from '@/components/schulrecht/vorschriften-durchblaettern'
import { Hinweis } from '@/components/werkzeugkiste/schritt-skript'
import { holeFragePrompt, ladeThemen, sucheFundstellen, SchulrechtFehler, waermeAuf } from '@/lib/schulrecht-api'
import {
  BEISPIEL_FRAGEN,
  ERSTE_TREFFER,
  FALL_NEU_HREF,
  FALL_START_KEY,
  FRAGE_MAX_ZEICHEN,
  gruppiereNachQuelle,
  HAFTUNGSHINWEIS,
  istKurzeFrage,
  KEIN_TREFFER_TEXT,
  KI_HINWEIS,
  KURZE_FRAGE_HINWEIS,
  NICHT_ENTHALTEN_HINWEIS,
  speichereImTab,
  type FallStart,
  type Fundstelle,
  type NormVerweis,
  type Rechtsquelle,
  type SuchErgebnis,
} from '@/lib/schulrecht'

const NEBENAKTION =
  'min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text'
const LINK_TRIGGER =
  'group flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-medium text-ws-blue hover:text-ws-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green'
const BEISPIEL =
  'min-h-11 rounded-xl border border-ws-line bg-ws-surface px-4 py-2 text-left text-sm text-ws-text transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green'

type Zustand =
  | { art: 'leer' }
  | { art: 'laedt' }
  | { art: 'fehler'; text: string }
  | { art: 'fertig'; frage: string; ergebnis: SuchErgebnis }

/**
 * Seite „Schulrecht“ (PROJ-55, überarbeitet in PROJ-88): eine Frage in
 * Alltagssprache – auch mehrere Sätze – findet ohne KI die passenden Stellen.
 * Jeder Treffer zeigt Kurzfassung, passenden Absatz und den übrigen Wortlaut.
 * Nichts davon wird gespeichert; die Frage reist nur im Nachrichtenkörper (E4).
 */
export function SchulrechtSeite() {
  const router = useRouter()
  const [quellen, setQuellen] = useState<Rechtsquelle[] | null>(null)
  const [frage, setFrage] = useState('')
  const [abgewaehlt, setAbgewaehlt] = useState<Set<string>>(new Set())
  const [zustand, setZustand] = useState<Zustand>({ art: 'leer' })
  const [quellenHinweis, setQuellenHinweis] = useState(false)
  const [verweis, setVerweis] = useState<NormVerweis | null>(null)
  const ergebnisKopf = useRef<HTMLHeadingElement>(null)
  // Nur die jüngste Suche darf das Ergebnis setzen
  const laufNr = useRef(0)

  const ladeQuellen = useCallback(() => {
    // Ohne Quellenliste funktioniert die Suche trotzdem (über alle Quellen)
    ladeThemen()
      .then((t) => setQuellen(t.quellen))
      .catch(() => setQuellen([]))
  }, [])

  useEffect(() => {
    ladeQuellen()
    // Das Einbettungsmodell vorladen, damit die erste Suche nicht wartet
    void waermeAuf()
  }, [ladeQuellen])

  async function suche(text: string) {
    const f = text.trim()
    if (!f) return
    const gewaehlt = quellen?.length ? quellen.map((q) => q.kuerzel).filter((k) => !abgewaehlt.has(k)) : undefined
    if (gewaehlt && gewaehlt.length === 0) {
      setQuellenHinweis(true)
      return
    }
    setQuellenHinweis(false)
    const nr = ++laufNr.current
    setZustand({ art: 'laedt' })
    try {
      // Sind alle Quellen gewählt, wird nichts eingegrenzt
      const eingrenzen = gewaehlt && quellen && gewaehlt.length < quellen.length ? gewaehlt : undefined
      const ergebnis = await sucheFundstellen(f, eingrenzen)
      if (nr !== laufNr.current) return
      setZustand({ art: 'fertig', frage: f, ergebnis })
    } catch (e) {
      if (nr !== laufNr.current) return
      setZustand({ art: 'fehler', text: e instanceof SchulrechtFehler ? e.message : 'Die Suche hat gerade nicht geklappt.' })
    }
  }

  useEffect(() => {
    if (zustand.art === 'fertig' || zustand.art === 'fehler') ergebnisKopf.current?.focus({ preventScroll: true })
  }, [zustand.art])

  function beispiel(text: string) {
    setFrage(text)
    void suche(text)
  }

  function umschalten(kuerzel: string, an: boolean) {
    setAbgewaehlt((alt) => {
      const neu = new Set(alt)
      if (an) neu.delete(kuerzel)
      else neu.add(kuerzel)
      return neu
    })
    setQuellenHinweis(false)
  }

  function starteAktennotiz() {
    if (zustand.art !== 'fertig') return
    const start: FallStart = {
      frage: zustand.frage,
      fundstellen: zustand.ergebnis.fundstellen.slice(0, ERSTE_TREFFER).map((f) => ({ kuerzel: f.kuerzel, nr: f.nr })),
    }
    speichereImTab(FALL_START_KEY, start)
    router.push(FALL_NEU_HREF)
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Schulrecht" description="Frag wie im Lehrerzimmer – du bekommst die passenden Stellen mit Kurzfassung und Wortlaut, ohne KI." />

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          void suche(frage)
        }}
        className="space-y-3"
      >
        <Label htmlFor="sr-frage" className="text-base font-semibold">
          Was willst du wissen?
        </Label>
        <Textarea
          id="sr-frage"
          value={frage}
          onChange={(e) => setFrage(e.target.value.slice(0, FRAGE_MAX_ZEICHEN))}
          onKeyDown={(e) => {
            // Enter sucht, Umschalt+Enter macht eine neue Zeile
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void suche(frage)
            }
          }}
          placeholder="z. B. Ein Schüler fehlt immer bei angekündigten Tests und meldet sich telefonisch krank. Was darf ich verlangen?"
          rows={3}
          aria-describedby="sr-frage-hinweis"
          className="min-h-24 rounded-2xl border-ws-line bg-ws-surface px-4 py-3 text-base text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="sr-frage-hinweis" className="text-sm text-ws-muted">
            Du darfst ganze Sätze schreiben. Enter sucht, Umschalt + Enter macht eine neue Zeile.
            <span className="ml-1 text-ws-faint">
              ({frage.length}/{FRAGE_MAX_ZEICHEN})
            </span>
          </p>
          <Button
            type="submit"
            disabled={!frage.trim() || zustand.art === 'laedt'}
            className="min-h-12 shrink-0 rounded-2xl bg-ws-green px-6 text-base font-bold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green"
          >
            {zustand.art === 'laedt' ? <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> : <Search className="mr-2 size-5" aria-hidden />}
            Nachschlagen
          </Button>
        </div>

        {zustand.art === 'leer' && <Beispiele waehle={beispiel} />}

        {quellen && quellen.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className={LINK_TRIGGER}>
              Quellen eingrenzen
              {abgewaehlt.size > 0 && (
                <span className="text-ws-muted">
                  ({quellen.length - abgewaehlt.size} von {quellen.length})
                </span>
              )}
              <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ul className="grid gap-1 sm:grid-cols-2">
                {quellen.map((q) => (
                  <li key={q.kuerzel}>
                    <Label
                      htmlFor={`sr-quelle-${q.kuerzel}`}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-ws-raised"
                    >
                      <Checkbox
                        id={`sr-quelle-${q.kuerzel}`}
                        checked={!abgewaehlt.has(q.kuerzel)}
                        onCheckedChange={(v) => umschalten(q.kuerzel, v === true)}
                      />
                      <span className="min-w-0">
                        <span className="font-semibold">{q.kuerzel}</span>
                        <span className="ml-2 truncate text-sm font-normal text-ws-muted" title={q.titel}>
                          {q.titel}
                        </span>
                      </span>
                    </Label>
                  </li>
                ))}
              </ul>
              {quellenHinweis && (
                <p role="alert" className="pt-2 text-sm text-ws-red">
                  Wähle mindestens eine Rechtsquelle aus.
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </form>

      <section aria-label="Fundstellen" aria-live="polite" className="space-y-4">
        {zustand.art === 'laedt' && <Ladeanzeige />}
        {zustand.art === 'fehler' && <AdminErrorState message={zustand.text} onRetry={() => void suche(frage)} />}
        {zustand.art === 'fertig' && (
          <Ergebnis
            key={zustand.frage}
            frage={zustand.frage}
            ergebnis={zustand.ergebnis}
            kopf={ergebnisKopf}
            waehle={beispiel}
            aktennotiz={starteAktennotiz}
            oeffneVerweis={setVerweis}
          />
        )}
      </section>

      <div className="space-y-2 text-sm text-ws-muted">
        <p>{HAFTUNGSHINWEIS}</p>
        <p>{NICHT_ENTHALTEN_HINWEIS}</p>
      </div>

      {quellen && quellen.length > 0 && (
        <Collapsible className="rounded-2xl border border-ws-line bg-ws-surface/50 p-2">
          <CollapsibleTrigger className={`${LINK_TRIGGER} w-full px-3`}>
            <BookOpen className="size-4" aria-hidden />
            Vorschriften durchblättern
            <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-1 pb-1 pt-2">
            <VorschriftenDurchblaettern quellen={quellen} />
          </CollapsibleContent>
        </Collapsible>
      )}

      <VerweisFenster ziel={verweis} schliessen={() => setVerweis(null)} />
    </div>
  )
}

function Beispiele({ waehle }: { waehle: (frage: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-ws-muted">Zum Ausprobieren:</p>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {BEISPIEL_FRAGEN.map((b) => (
          <li key={b}>
            <button type="button" className={BEISPIEL} onClick={() => waehle(b)}>
              {b}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Ladeanzeige() {
  return (
    <div className="space-y-3" role="status" aria-label="Es wird nachgeschlagen">
      <p className="flex items-center gap-2 text-sm text-ws-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Es wird nachgeschlagen …
      </p>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-32 rounded-2xl bg-ws-raised" />
      ))}
    </div>
  )
}

function Ergebnis({
  frage,
  ergebnis,
  kopf,
  waehle,
  aktennotiz,
  oeffneVerweis,
}: {
  frage: string
  ergebnis: SuchErgebnis
  kopf: React.RefObject<HTMLHeadingElement | null>
  waehle: (frage: string) => void
  aktennotiz: () => void
  oeffneVerweis: (v: NormVerweis) => void
}) {
  const [alle, setAlle] = useState(false)
  const n = ergebnis.fundstellen.length

  if (n === 0) {
    return (
      <div className="space-y-4">
        <h2 ref={kopf} tabIndex={-1} className="sr-only outline-none">
          Keine Fundstellen
        </h2>
        <AdminEmptyState icon={Scale} title="Keine Fundstellen" description={`${KEIN_TREFFER_TEXT} ${NICHT_ENTHALTEN_HINWEIS}`} />
        <Beispiele waehle={waehle} />
      </div>
    )
  }

  const sichtbar = alle ? ergebnis.fundstellen : ergebnis.fundstellen.slice(0, ERSTE_TREFFER)
  const gruppen = gruppiereNachQuelle(sichtbar)

  return (
    <div className="space-y-4">
      <h2 ref={kopf} tabIndex={-1} className="text-lg font-bold outline-none">
        {sichtbar.length === 1 ? '1 passende Stelle' : `${sichtbar.length} passende Stellen`}
      </h2>
      {istKurzeFrage(frage) && <Hinweis>{KURZE_FRAGE_HINWEIS}</Hinweis>}

      {gruppen.map((g) => (
        <section key={g.kuerzel} aria-label={g.vorschrift} className="space-y-3">
          <h3 className="text-sm font-semibold text-ws-muted">
            {g.kuerzel} <span className="font-normal text-ws-faint">· {g.vorschrift}</span>
          </h3>
          <ul className="space-y-3">
            {g.fundstellen.map((f) => (
              <li key={`${f.kuerzel}-${f.nr}`}>
                <TrefferKarte fundstelle={f} oeffneVerweis={oeffneVerweis} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!alle && n > ERSTE_TREFFER && (
        <Button variant="outline" onClick={() => setAlle(true)} className={`${NEBENAKTION} w-full sm:w-auto`}>
          <ChevronDown className="mr-2 size-4" aria-hidden />
          Weitere Treffer anzeigen ({n - ERSTE_TREFFER})
        </Button>
      )}

      <div className="grid gap-3 border-t border-ws-line pt-4 md:grid-cols-2">
        <KiKarte frage={frage} fundstellen={sichtbar} />
        <div className="space-y-2 rounded-2xl border border-ws-line bg-ws-surface p-4">
          <p className="font-semibold text-ws-text">Aktennotiz zu einem Fall</p>
          <p className="text-sm text-ws-muted">Hält einen konkreten Fall mit Rechtsgrundlage als Word-Datei fest. Namen werden vorher ersetzt.</p>
          <Button variant="outline" onClick={aktennotiz} className={NEBENAKTION}>
            <FileText className="mr-2 size-4" aria-hidden />
            Aktennotiz erstellen
          </Button>
        </div>
      </div>
    </div>
  )
}

/** „Mit meiner KI beantworten“ (PROJ-88): schlanker Kopierknopf, ohne Namenserkennung (Entscheidung 2026-11-11) */
function KiKarte({ frage, fundstellen }: { frage: string; fundstellen: Fundstelle[] }) {
  const [laedt, setLaedt] = useState(false)

  async function kopiere() {
    setLaedt(true)
    try {
      const { prompt } = await holeFragePrompt(frage, fundstellen.map((f) => ({ kuerzel: f.kuerzel, nr: f.nr })))
      await navigator.clipboard.writeText(prompt)
      toast.success('Prompt kopiert. Füge ihn jetzt in deine KI ein.')
    } catch (e) {
      toast.error(e instanceof SchulrechtFehler ? e.message : 'Kopieren hat nicht geklappt. Bitte versuche es noch einmal.')
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-ws-line bg-ws-surface p-4">
      <p className="font-semibold text-ws-text">Mit meiner KI beantworten</p>
      <p className="text-sm text-ws-muted">
        Kopiert deine Frage und diese {fundstellen.length} Stellen im Wortlaut als Prompt. Die KI darf nur daraus zitieren.
      </p>
      <blockquote className="max-h-24 overflow-y-auto whitespace-pre-line rounded-xl border-l-4 border-ws-line bg-ws-raised/60 px-3 py-2 text-sm text-ws-text">
        {frage}
      </blockquote>
      <p className="text-sm font-medium text-ws-orange">{KI_HINWEIS}</p>
      <Button variant="outline" onClick={() => void kopiere()} disabled={laedt} className={NEBENAKTION}>
        {laedt ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : <Bot className="mr-2 size-4" aria-hidden />}
        Prompt kopieren
      </Button>
    </div>
  )
}
