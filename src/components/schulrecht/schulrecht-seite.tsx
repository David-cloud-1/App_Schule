'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ChevronDown, FileText, Loader2, Scale, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminEmptyState, AdminErrorState } from '@/components/admin/admin-states'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { FundstelleKarte } from '@/components/schulrecht/fundstelle-karte'
import { VorschriftenDurchblaettern } from '@/components/schulrecht/vorschriften-durchblaettern'
import { Hinweis } from '@/components/werkzeugkiste/schritt-skript'
import { ladeThemen, sucheFundstellen, SchulrechtFehler, waermeAuf } from '@/lib/schulrecht-api'
import {
  FALL_NEU_HREF,
  FALL_START_KEY,
  FRAGE_MAX_ZEICHEN,
  HAFTUNGSHINWEIS,
  istKurzeFrage,
  KEIN_TREFFER_TEXT,
  KURZE_FRAGE_HINWEIS,
  speichereImTab,
  type FallStart,
  type SuchErgebnis,
  type Thema,
  type ThemenAntwort,
} from '@/lib/schulrecht'

const NEBENAKTION =
  'min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text'
const LINK_TRIGGER =
  'group flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-medium text-ws-blue hover:text-ws-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green'
const CHIP =
  'min-h-11 rounded-full border border-ws-line bg-ws-surface px-4 text-sm font-medium text-ws-text transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green'

type Zustand =
  | { art: 'leer' }
  | { art: 'laedt' }
  | { art: 'fehler'; text: string }
  | { art: 'fertig'; frage: string; ergebnis: SuchErgebnis }

/**
 * Seite „Schulrecht“ (PROJ-55): Frage tippen oder Thema wählen, die
 * Paragraphen erscheinen ohne KI im Wortlaut. Nichts davon wird gespeichert;
 * die Frage reist nur im Nachrichtenkörper zum Server (E4).
 */
export function SchulrechtSeite() {
  const router = useRouter()
  const [themen, setThemen] = useState<ThemenAntwort | null>(null)
  const [themenFehler, setThemenFehler] = useState<string | null>(null)
  const [frage, setFrage] = useState('')
  const [abgewaehlt, setAbgewaehlt] = useState<Set<string>>(new Set())
  const [zustand, setZustand] = useState<Zustand>({ art: 'leer' })
  const [quellenHinweis, setQuellenHinweis] = useState(false)
  const ergebnisKopf = useRef<HTMLHeadingElement>(null)
  // Nur die jüngste Suche darf das Ergebnis setzen
  const laufNr = useRef(0)

  const ladeThemenListe = useCallback(() => {
    ladeThemen()
      .then(setThemen)
      .catch((e: unknown) => setThemenFehler(e instanceof SchulrechtFehler ? e.message : 'Die Themen konnten nicht geladen werden.'))
  }, [])

  useEffect(() => {
    ladeThemenListe()
    // Das Einbettungsmodell vorladen, damit die erste Suche nicht wartet
    void waermeAuf()
  }, [ladeThemenListe])

  async function suche(text: string) {
    const f = text.trim()
    if (!f) return
    const quellen = themen ? themen.quellen.map((q) => q.kuerzel).filter((k) => !abgewaehlt.has(k)) : undefined
    if (quellen && quellen.length === 0) {
      setQuellenHinweis(true)
      return
    }
    setQuellenHinweis(false)
    const nr = ++laufNr.current
    setZustand({ art: 'laedt' })
    try {
      // Sind alle Quellen gewählt, wird nichts eingegrenzt
      const eingrenzen = quellen && themen && quellen.length < themen.quellen.length ? quellen : undefined
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

  function waehleThema(t: Thema) {
    setFrage(t.frage)
    void suche(t.frage)
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
      fundstellen: zustand.ergebnis.fundstellen.map((f) => ({ kuerzel: f.kuerzel, nr: f.nr })),
    }
    speichereImTab(FALL_START_KEY, start)
    router.push(FALL_NEU_HREF)
  }

  const alleThemen = themen ? [...themen.start, ...themen.weitere] : []

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Schulrecht" description="Paragraphen zu Fragen aus dem Schulalltag – im Wortlaut, ohne KI." />

      <Hinweis>{HAFTUNGSHINWEIS}</Hinweis>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          void suche(frage)
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="sr-frage" className="text-base font-semibold">
            Was willst du wissen?
          </Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="sr-frage"
              value={frage}
              onChange={(e) => setFrage(e.target.value.slice(0, FRAGE_MAX_ZEICHEN))}
              placeholder="z. B. Muss ich einen Leistungsnachweis ankündigen?"
              autoComplete="off"
              enterKeyHint="search"
              className="min-h-14 flex-1 rounded-2xl border-ws-line bg-ws-surface px-4 text-base text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
            />
            <Button
              type="submit"
              disabled={!frage.trim() || zustand.art === 'laedt'}
              className="min-h-14 rounded-2xl bg-ws-green px-6 text-base font-bold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green"
            >
              {zustand.art === 'laedt' ? <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> : <Search className="mr-2 size-5" aria-hidden />}
              Nachschlagen
            </Button>
          </div>
        </div>

        <ThemenChips themen={themen} fehler={themenFehler} neuLaden={() => {
            setThemenFehler(null)
            ladeThemenListe()
          }} waehle={waehleThema} />

        {themen && (
          <Collapsible>
            <CollapsibleTrigger className={LINK_TRIGGER}>
              Quellen eingrenzen
              {abgewaehlt.size > 0 && <span className="text-ws-muted">({themen.quellen.length - abgewaehlt.size} von {themen.quellen.length})</span>}
              <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ul className="grid gap-1 sm:grid-cols-2">
                {themen.quellen.map((q) => (
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
            frage={zustand.frage}
            ergebnis={zustand.ergebnis}
            kopf={ergebnisKopf}
            themen={alleThemen.length ? themen!.start : []}
            waehle={waehleThema}
            aktennotiz={starteAktennotiz}
          />
        )}
      </section>

      {themen && themen.quellen.length > 0 && (
        <Collapsible className="rounded-2xl border border-ws-line bg-ws-surface/50 p-2">
          <CollapsibleTrigger className={`${LINK_TRIGGER} w-full px-3`}>
            <BookOpen className="size-4" aria-hidden />
            Vorschriften durchblättern
            <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-1 pb-1 pt-2">
            <VorschriftenDurchblaettern quellen={themen.quellen} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

function ThemenChips({
  themen,
  fehler,
  neuLaden,
  waehle,
}: {
  themen: ThemenAntwort | null
  fehler: string | null
  neuLaden: () => void
  waehle: (t: Thema) => void
}) {
  if (fehler) return <AdminErrorState message={fehler} onRetry={neuLaden} />
  if (!themen) {
    return (
      <div className="flex flex-wrap gap-2" role="status" aria-label="Themen werden geladen">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-11 w-28 rounded-full bg-ws-raised" />
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-ws-muted">Oder starte mit einem Thema:</p>
      <ul className="flex flex-wrap gap-2">
        {themen.start.map((t) => (
          <li key={t.id}>
            <button type="button" className={CHIP} onClick={() => waehle(t)}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>
      {themen.weitere.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className={LINK_TRIGGER}>
            Weitere Themen
            <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ul className="flex flex-wrap gap-2">
              {themen.weitere.map((t) => (
                <li key={t.id}>
                  <button type="button" className={CHIP} onClick={() => waehle(t)}>
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
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
        <Skeleton key={i} className="h-20 rounded-2xl bg-ws-raised" />
      ))}
    </div>
  )
}

function Ergebnis({
  frage,
  ergebnis,
  kopf,
  themen,
  waehle,
  aktennotiz,
}: {
  frage: string
  ergebnis: SuchErgebnis
  kopf: React.RefObject<HTMLHeadingElement | null>
  themen: Thema[]
  waehle: (t: Thema) => void
  aktennotiz: () => void
}) {
  const n = ergebnis.fundstellen.length

  if (n === 0) {
    return (
      <div className="space-y-4">
        <h2 ref={kopf} tabIndex={-1} className="sr-only outline-none">
          Keine Fundstellen
        </h2>
        <AdminEmptyState icon={Scale} title="Keine Fundstellen" description={KEIN_TREFFER_TEXT} />
        {themen.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-2">
            {themen.map((t) => (
              <li key={t.id}>
                <button type="button" className={CHIP} onClick={() => waehle(t)}>
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 ref={kopf} tabIndex={-1} className="text-lg font-bold outline-none">
        {n} {n === 1 ? 'Fundstelle' : 'Fundstellen'}
      </h2>
      {istKurzeFrage(frage) && <Hinweis>{KURZE_FRAGE_HINWEIS}</Hinweis>}
      {ergebnis.themenHinweis && <Hinweis>{ergebnis.themenHinweis}</Hinweis>}
      <ul className="space-y-3">
        {ergebnis.fundstellen.map((f, i) => (
          <li key={`${f.kuerzel}-${f.nr}`}>
            <FundstelleKarte fundstelle={f} startOffen={i === 0} />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 border-t border-ws-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-prose text-sm text-ws-muted">
          Du willst zu einem konkreten Fall eine Rechtsgrundlage festhalten? Die Aktennotiz entsteht mit deiner KI, die Namen
          werden vorher ersetzt.
        </p>
        <Button variant="outline" onClick={aktennotiz} className={`${NEBENAKTION} shrink-0`}>
          <FileText className="mr-2 size-4" aria-hidden />
          Aktennotiz zu einem Fall erstellen
        </Button>
      </div>
    </div>
  )
}
