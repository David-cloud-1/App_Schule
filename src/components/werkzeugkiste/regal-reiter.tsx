'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Copy, Download, Loader2, Search, SearchX, ShieldAlert, UserRoundSearch, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { RegalModeration } from '@/components/werkzeugkiste/regal-moderation'
import { ablaufHref, findeWerkzeug } from '@/lib/werkzeugkiste'
import { ladeRegal, ladeRegalDatei, passeAn, WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { formatName, relativesDatum, werkzeugName } from '@/lib/werkzeugkiste-materialien'
import {
  geladenText,
  SUCHE_MAX,
  type RegalFilterwerte,
  type RegalKarte,
  type RegalListe,
  type RegalSortierung,
} from '@/lib/werkzeugkiste-regal'

const FELD = 'min-h-11 rounded-xl border-ws-line bg-ws-surface text-ws-text focus:ring-ws-green'
const MENUE = 'border-ws-line bg-ws-surface text-ws-text'
const SUCH_PAUSE_MS = 300
const ALLE = ''

const FEHLER_ALLGEMEIN = 'Das hat gerade nicht geklappt. Bitte versuche es erneut.'
const meldung = (e: unknown) => (e instanceof WerkzeugFehler ? e.message : FEHLER_ALLGEMEIN)

/**
 * Reiter „Regal des Kollegiums“ (PROJ-53): alles, was die angemeldete
 * Lehrkraft sehen darf (eigener Fachbereich, alle Lehrkräfte, namentlich
 * freigegeben, dazu die eigenen geteilten Materialien). Filter als Chips,
 * Suche, Sortierung, 3 Spalten auf dem Desktop, 1 auf dem Handy, ab 30
 * Einträgen „Mehr laden“. Zu sehen sind nur schmale Karten — Skript und
 * Antwort liefert der Server nie.
 */
export function RegalReiter() {
  const [eingabe, setEingabe] = useState('')
  const [suche, setSuche] = useState('')
  const [fach, setFach] = useState(ALLE)
  const [werkzeug, setWerkzeug] = useState(ALLE)
  const [sortierung, setSortierung] = useState<RegalSortierung>('neueste')

  const [liste, setListe] = useState<RegalListe | null>(null)
  const [filter, setFilter] = useState<RegalFilterwerte | null>(null)
  const [istModerator, setIstModerator] = useState(false)
  const [ansicht, setAnsicht] = useState<'regal' | 'moderation'>('regal')
  const [laedt, setLaedt] = useState(true)
  const [ladtMehr, setLadtMehr] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [mehrFehler, setMehrFehler] = useState<string | null>(null)
  const seite = useRef(1)
  /** Verwirft Antworten veralteter Abfragen (schnelles Tippen, Filterwechsel) */
  const abfrageNr = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setSuche(eingabe), SUCH_PAUSE_MS)
    return () => clearTimeout(t)
  }, [eingabe])

  const lade = useCallback(async () => {
    const nr = ++abfrageNr.current
    seite.current = 1
    setLaedt(true)
    setFehler(null)
    setMehrFehler(null)
    try {
      const daten = await ladeRegal({ suche, fach, werkzeug, sortierung, seite: 1 })
      if (nr !== abfrageNr.current) return
      setListe(daten)
      if (daten.filter) setFilter(daten.filter)
      if (daten.moderation) setIstModerator(true)
    } catch (e) {
      if (nr !== abfrageNr.current) return
      setFehler(meldung(e))
    } finally {
      if (nr === abfrageNr.current) setLaedt(false)
    }
  }, [suche, fach, werkzeug, sortierung])

  useEffect(() => {
    void lade()
  }, [lade])

  async function ladeMehr() {
    const nr = abfrageNr.current
    setLadtMehr(true)
    setMehrFehler(null)
    try {
      const daten = await ladeRegal({ suche, fach, werkzeug, sortierung, seite: seite.current + 1 })
      if (nr !== abfrageNr.current) return
      seite.current += 1
      setListe((alt) => (alt ? { ...daten, eintraege: [...alt.eintraege, ...daten.eintraege] } : daten))
    } catch (e) {
      if (nr === abfrageNr.current) setMehrFehler(meldung(e))
    } finally {
      setLadtMehr(false)
    }
  }

  function zuruecksetzen() {
    setEingabe('')
    setSuche('')
    setFach(ALLE)
    setWerkzeug(ALLE)
  }

  const gefiltert = suche.trim() !== '' || fach !== ALLE || werkzeug !== ALLE
  const komplettLeer = !laedt && !fehler && !!liste && liste.eintraege.length === 0 && !gefiltert

  const umschalter = istModerator && (
    <div role="group" aria-label="Ansicht" className="flex gap-2">
      {(
        [
          ['regal', 'Regal', UserRoundSearch],
          ['moderation', 'Moderation', ShieldAlert],
        ] as const
      ).map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          aria-pressed={ansicht === id}
          onClick={() => setAnsicht(id)}
          className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green ${
            ansicht === id ? 'border-ws-green bg-ws-green/15 text-ws-green' : 'border-ws-line text-ws-muted hover:bg-ws-raised hover:text-ws-text'
          }`}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  )

  if (istModerator && ansicht === 'moderation') {
    return (
      <div className="space-y-4">
        {umschalter}
        <RegalModeration />
      </div>
    )
  }

  if (!liste && laedt) return <AdminLoadingState variant="cards" rows={3} label="Das Regal wird geladen …" />
  if (!liste && fehler) return <AdminErrorState message={fehler} onRetry={() => void lade()} />

  if (komplettLeer) {
    return (
      <AdminEmptyState
        icon={UserRoundSearch}
        title="Noch nichts geteilt."
        description="Teile dein erstes Material aus Meine Materialien."
        action={
          <Button asChild variant="outline" className={`${NEBENAKTION} px-5`}>
            <Link href="?tab=materialien">Zu Meine Materialien</Link>
          </Button>
        }
      />
    )
  }

  const hatFilter = !!filter && (filter.faecher.length > 0 || filter.werkzeuge.length > 0)

  return (
    <div className="space-y-4">
      {umschalter}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-faint" aria-hidden />
          <Input
            type="search"
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            placeholder="Titel oder Notiz suchen"
            aria-label="Das Regal durchsuchen"
            maxLength={SUCHE_MAX}
            className="min-h-11 rounded-xl border-ws-line bg-ws-surface pl-9 text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
          />
        </div>
        <Select value={sortierung} onValueChange={(s) => setSortierung(s as RegalSortierung)}>
          <SelectTrigger aria-label="Sortierung" className={`${FELD} sm:w-56`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={MENUE}>
            <SelectItem value="neueste" className="min-h-11">
              Neueste zuerst
            </SelectItem>
            <SelectItem value="geladen" className="min-h-11">
              Am häufigsten geladen
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hatFilter && filter && (
        <div className="space-y-2">
          {filter.faecher.length > 0 && (
            <ChipReihe
              titel="Fach"
              wert={fach}
              setWert={setFach}
              optionen={filter.faecher.map((f) => ({ id: f.id, label: f.name }))}
            />
          )}
          {filter.werkzeuge.length > 0 && (
            <ChipReihe
              titel="Werkzeug"
              wert={werkzeug}
              setWert={setWerkzeug}
              optionen={filter.werkzeuge.map((w) => ({ id: w, label: werkzeugName(w) }))}
            />
          )}
        </div>
      )}

      {fehler ? (
        <AdminErrorState message={fehler} onRetry={() => void lade()} />
      ) : laedt ? (
        <AdminLoadingState variant="cards" rows={3} label="Das Regal wird geladen …" />
      ) : liste && liste.eintraege.length === 0 ? (
        <AdminEmptyState
          icon={SearchX}
          title="Nichts gefunden"
          description="Dazu gibt es kein Material im Regal. Prüfe die Schreibweise oder setze Suche und Filter zurück."
          action={
            <Button variant="outline" onClick={zuruecksetzen} className={`${NEBENAKTION} px-5`}>
              Zurücksetzen
            </Button>
          }
        />
      ) : (
        liste && (
          <>
            <p className="sr-only" aria-live="polite">
              {liste.gesamt} {liste.gesamt === 1 ? 'Material' : 'Materialien'} im Regal
            </p>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {liste.eintraege.map((k) => (
                <li key={k.id} className="flex">
                  <Karte karte={k} />
                </li>
              ))}
            </ul>
            {mehrFehler && (
              <p role="alert" className="text-center text-sm text-ws-red">
                {mehrFehler}
              </p>
            )}
            {liste.hatMehr && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => void ladeMehr()} disabled={ladtMehr} className={`${NEBENAKTION} px-6`}>
                  {ladtMehr && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                  Mehr laden
                </Button>
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}

/** Eine Reihe Filter-Chips mit „Alle“ vorn; genau einer ist gewählt */
function ChipReihe({
  titel,
  wert,
  setWert,
  optionen,
}: {
  titel: string
  wert: string
  setWert: (neu: string) => void
  optionen: { id: string; label: string }[]
}) {
  const chip = (aktiv: boolean) =>
    `min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green ${
      aktiv ? 'border-ws-green bg-ws-green/15 text-ws-green' : 'border-ws-line text-ws-muted hover:bg-ws-raised hover:text-ws-text'
    }`
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-sm text-ws-faint">{titel}</span>
      <div role="group" aria-label={`Nach ${titel} filtern`} className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" aria-pressed={wert === ALLE} onClick={() => setWert(ALLE)} className={chip(wert === ALLE)}>
          Alle
        </button>
        {optionen.map((o) => (
          <button key={o.id} type="button" aria-pressed={wert === o.id} onClick={() => setWert(o.id)} className={chip(wert === o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Karte({ karte: k }: { karte: RegalKarte }) {
  const [laedt, setLaedt] = useState(false)
  const [kopiert, setKopiert] = useState(false)
  const format = formatName(k.format)
  const kopf = [findeWerkzeug(k.werkzeug)?.name ?? k.werkzeug, format].filter(Boolean).join(' · ')

  async function herunterladen() {
    setLaedt(true)
    try {
      await ladeRegalDatei(k.id)
    } catch (e) {
      toast.error(meldung(e))
    } finally {
      setLaedt(false)
    }
  }

  /** Legt eine Kopie in „Meine Materialien“ an und öffnet sie bei Schritt 4 (das Original bleibt unverändert) */
  async function anpassen() {
    setKopiert(true)
    try {
      const { ablauf } = await passeAn(k.id)
      window.location.href = ablaufHref(ablauf.id, 4)
    } catch (e) {
      toast.error(meldung(e))
      setKopiert(false)
    }
  }

  return (
    <article className="flex w-full flex-col gap-3 rounded-2xl border border-ws-line bg-ws-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ws-muted">
        <span>{kopf}</span>
        {k.fachName && (
          <Badge className="rounded-full border border-ws-blue/30 bg-ws-blue/15 px-2.5 py-0.5 text-xs font-semibold text-ws-blue hover:bg-ws-blue/15">
            {k.fachName}
          </Badge>
        )}
        {k.mitMirGeteilt && (
          <Badge className="rounded-full border border-ws-green/30 bg-ws-green/15 px-2.5 py-0.5 text-xs font-semibold text-ws-green hover:bg-ws-green/15">
            <Users className="mr-1 size-3" aria-hidden />
            mit dir geteilt
          </Badge>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="line-clamp-2 break-words font-semibold text-ws-text" title={k.titel}>
          {k.titel}
        </h3>
        {k.notiz && <p className="line-clamp-3 break-words text-sm leading-relaxed text-ws-muted">{k.notiz}</p>}
      </div>

      <p className="text-sm text-ws-faint">
        {k.vonMir ? 'von dir' : `von ${k.besitzerName}`} · {relativesDatum(k.geteiltAm)} · {geladenText(k.geladen)}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        {k.hatDatei ? (
          <Button variant="outline" onClick={() => void herunterladen()} disabled={laedt || kopiert} className={`${NEBENAKTION} flex-1`}>
            {laedt ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : <Download className="mr-2 size-4" aria-hidden />}
            Herunterladen
            <span className="sr-only">: {k.titel}</span>
          </Button>
        ) : (
          <p className="text-sm text-ws-muted">Dieses Material besteht nur aus Texten, es gibt keine Datei zum Herunterladen.</p>
        )}
        {k.anpassbar && !k.vonMir && (
          <Button variant="outline" onClick={() => void anpassen()} disabled={laedt || kopiert} className={`${NEBENAKTION} flex-1`}>
            {kopiert ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : <Copy className="mr-2 size-4" aria-hidden />}
            Anpassen
            <span className="sr-only">: {k.titel}</span>
          </Button>
        )}
      </div>
    </article>
  )
}
