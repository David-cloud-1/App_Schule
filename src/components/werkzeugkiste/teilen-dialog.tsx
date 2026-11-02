'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { HAUPTAKTION, NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { LinkFeld } from '@/components/werkzeugkiste/link-fuer-alle'
import {
  ladeFreigabe,
  ladeFreigabeOptionen,
  speichereFreigabe,
  sucheLehrkraefte,
  WerkzeugFehler,
} from '@/lib/werkzeugkiste-api'
import type { LinkStand } from '@/lib/werkzeugkiste-links'
import {
  HINWEIS_OHNE_FACHBEREICH,
  HINWEIS_SKRIPT_PRIVAT,
  MAX_PERSONEN,
  NOTIZ_MAX,
  STUFEN,
  stufenText,
  teilenToast,
  type FreigabeOptionen,
  type FreigabePerson,
  type FreigabeStand,
  type MaterialRegal,
  type SichtbarkeitWahl,
} from '@/lib/werkzeugkiste-regal'

const FELD = 'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green'
const MENUE = 'border-ws-line bg-ws-surface text-ws-text'
const KEIN_FACH = 'kein'
const SUCH_PAUSE_MS = 300

const FEHLER_ALLGEMEIN = 'Das hat gerade nicht geklappt. Bitte versuche es erneut.'
const meldung = (e: unknown) => (e instanceof WerkzeugFehler ? e.message : FEHLER_ALLGEMEIN)

export interface TeilenZiel {
  id: string
  titel: string
  /** Interaktive Seite mit Datei: Der Dialog zeigt zusätzlich „Link für alle“ (PROJ-67) */
  linkMoeglich?: boolean
}

/**
 * „Teilen …“ (PROJ-53): Dialog, in dem die Lehrkraft für ein fertiges Material
 * bestimmt, wer es im Regal sieht — Nur ich, Mein Fachbereich, Alle Lehrkräfte
 * oder namentlich Ausgewählte. Der Dialog wird je Material neu aufgebaut
 * (lädt dann den aktuellen Stand), damit nie ein alter Stand überschrieben wird.
 */
export function TeilenDialog({
  ziel,
  schliessen,
  gespeichert,
  linkGeaendert,
}: {
  ziel: TeilenZiel | null
  schliessen: () => void
  /** `regal` ist der neue Vermerk für die Liste (leer = „Nur ich“) */
  gespeichert: (id: string, regal: MaterialRegal | null) => void
  /** Der öffentliche Link wurde erzeugt oder abgeschaltet (PROJ-67) */
  linkGeaendert?: (id: string, stand: LinkStand | null) => void
}) {
  return (
    <Dialog open={!!ziel} onOpenChange={(offen) => !offen && schliessen()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl border-ws-line bg-ws-surface text-ws-text sm:max-w-lg">
        {ziel && (
          <div className="space-y-6">
            <TeilenInhalt key={ziel.id} ziel={ziel} schliessen={schliessen} gespeichert={gespeichert} />
            {ziel.linkMoeglich && (
              // Außerhalb des Formulars: Die Knöpfe hier dürfen „Speichern“ nicht auslösen
              <section aria-labelledby="teilen-link-titel" className="space-y-3 border-t border-ws-line pt-5">
                <h3 id="teilen-link-titel" className="text-base font-semibold">
                  Öffentlicher Link
                </h3>
                <p className="text-sm text-ws-muted">Unabhängig vom Regal: für alle, die den Link haben, auch ohne Konto.</p>
                <LinkFeld key={ziel.id} ablaufId={ziel.id} geaendert={(s) => linkGeaendert?.(ziel.id, s)} />
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TeilenInhalt({
  ziel,
  schliessen,
  gespeichert,
}: {
  ziel: TeilenZiel
  schliessen: () => void
  gespeichert: (id: string, regal: MaterialRegal | null) => void
}) {
  const [optionen, setOptionen] = useState<FreigabeOptionen | null>(null)
  const [stand, setStand] = useState<FreigabeStand | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)

  const [wahl, setWahl] = useState<SichtbarkeitWahl>('privat')
  const [bereichIds, setBereichIds] = useState<string[]>([])
  const [personen, setPersonen] = useState<FreigabePerson[]>([])
  const [fachId, setFachId] = useState(KEIN_FACH)
  const [notiz, setNotiz] = useState('')

  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function lade() {
    setLaedt(true)
    setLadeFehler(null)
    try {
      const [o, f] = await Promise.all([ladeFreigabeOptionen(), ladeFreigabe(ziel.id)])
      setOptionen(o)
      setStand(f.freigabe)
      if (f.freigabe) {
        setWahl(f.freigabe.stufe)
        setBereichIds(f.freigabe.bereiche.map((b) => b.id))
        setPersonen(f.freigabe.personen)
        setFachId(f.freigabe.fachId ?? KEIN_FACH)
        setNotiz(f.freigabe.notiz ?? '')
      } else if (o.bereiche.length === 1) {
        // Nur ein Fachbereich: gleich vorwählen, sobald „Mein Fachbereich“ gewählt wird
        setBereichIds([o.bereiche[0].id])
      }
    } catch (e) {
      setLadeFehler(meldung(e))
    } finally {
      setLaedt(false)
    }
  }

  useEffect(() => {
    void lade()
    // Beim Öffnen einmal laden; der Dialog wird je Material neu eingehängt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const entnommen = !!stand?.entnommenAm
  const einBereich = optionen?.bereiche.length === 1 ? optionen.bereiche[0] : null
  const ohneBereich = !!optionen && optionen.bereiche.length === 0

  const fehltBereich = wahl === 'fachbereich' && bereichIds.length === 0
  const fehltPerson = wahl === 'ausgewaehlte' && personen.length === 0
  const zuViele = personen.length > MAX_PERSONEN
  const nichtsZuTun = wahl === 'privat' && !stand
  const gesperrt = speichert || laedt || !!ladeFehler || entnommen || fehltBereich || fehltPerson || zuViele || nichtsZuTun

  function waehleBereich(id: string, an: boolean) {
    setBereichIds((alt) => (an ? [...new Set([...alt, id])] : alt.filter((x) => x !== id)))
  }

  async function speichern(e: React.FormEvent) {
    e.preventDefault()
    if (gesperrt) return
    setSpeichert(true)
    setFehler(null)
    try {
      await speichereFreigabe(ziel.id, {
        stufe: wahl,
        fachId: wahl === 'privat' || fachId === KEIN_FACH ? null : fachId,
        notiz: wahl === 'privat' ? '' : notiz.trim(),
        bereiche: bereichIds,
        personen: personen.map((p) => p.id),
      })
      toast.success(teilenToast(wahl, personen.length))
      gespeichert(
        ziel.id,
        wahl === 'privat' ? null : { stufe: wahl, personen: personen.length, bereiche: bereichIds.length, entnommen: false },
      )
    } catch (err) {
      setFehler(meldung(err))
      setSpeichert(false)
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-5">
      <DialogHeader>
        <DialogTitle>Material teilen</DialogTitle>
        <DialogDescription className="break-words text-ws-muted" title={ziel.titel}>
          „{ziel.titel}“
        </DialogDescription>
      </DialogHeader>

      <p className="flex items-start gap-2 rounded-xl border border-ws-blue/30 bg-ws-blue/15 p-3 text-sm leading-relaxed text-ws-blue">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        {HINWEIS_SKRIPT_PRIVAT}
      </p>

      {laedt ? (
        <AdminLoadingState variant="form" label="Wird geladen …" />
      ) : ladeFehler ? (
        <AdminErrorState message={ladeFehler} onRetry={() => void lade()} />
      ) : entnommen ? (
        <div role="status" className="space-y-1 rounded-xl border border-ws-red/30 bg-ws-red/15 p-4 text-sm leading-relaxed text-ws-red">
          <p className="font-semibold">Vom Admin aus dem Regal genommen</p>
          {stand?.entnommenGrund && <p>Grund: {stand.entnommenGrund}</p>}
          <p>Das Material kann nicht erneut geteilt werden.</p>
        </div>
      ) : (
        <>
          <RadioGroup value={wahl} onValueChange={(w) => setWahl(w as SichtbarkeitWahl)} className="gap-2" aria-label="Wer darf das Material sehen?">
            {STUFEN.map((s) => {
              const aus = s.id === 'fachbereich' && ohneBereich
              return (
                <div key={s.id} className="space-y-3">
                  <Label
                    htmlFor={`teilen-${s.id}`}
                    className={`flex min-h-11 items-start gap-3 rounded-xl border p-3 ${
                      wahl === s.id ? 'border-ws-green bg-ws-green/10' : 'border-ws-line'
                    } ${aus ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <RadioGroupItem id={`teilen-${s.id}`} value={s.id} disabled={aus} className="mt-0.5" />
                    <span className="grid gap-0.5">
                      <span className="font-semibold">{s.label}</span>
                      <span className="text-sm font-normal text-ws-muted">
                        {aus ? HINWEIS_OHNE_FACHBEREICH : stufenText(s.id, s.id === 'fachbereich' ? einBereich?.name : undefined)}
                      </span>
                    </span>
                  </Label>

                  {s.id === 'fachbereich' && wahl === 'fachbereich' && optionen && optionen.bereiche.length > 1 && (
                    <fieldset className="space-y-1 pl-3">
                      <legend className="sr-only">Fachbereiche</legend>
                      {optionen.bereiche.map((b) => (
                        <Label key={b.id} htmlFor={`teilen-bereich-${b.id}`} className="flex min-h-11 cursor-pointer items-center gap-3">
                          <Checkbox
                            id={`teilen-bereich-${b.id}`}
                            checked={bereichIds.includes(b.id)}
                            onCheckedChange={(an) => waehleBereich(b.id, an === true)}
                          />
                          {b.name}
                        </Label>
                      ))}
                    </fieldset>
                  )}

                  {s.id === 'ausgewaehlte' && wahl === 'ausgewaehlte' && (
                    <PersonenWahl personen={personen} setPersonen={setPersonen} />
                  )}
                </div>
              )
            })}
          </RadioGroup>

          {wahl !== 'privat' && optionen && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teilen-fach">Fach (freiwillig)</Label>
                <Select value={fachId} onValueChange={setFachId}>
                  <SelectTrigger id="teilen-fach" className={FELD}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={MENUE}>
                    <SelectItem value={KEIN_FACH} className="min-h-11">
                      Kein Fach
                    </SelectItem>
                    {optionen.faecher.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="min-h-11">
                        {f.name}
                        {f.eigen ? ' · dein Fach' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teilen-notiz">Notiz (freiwillig)</Label>
                <Textarea
                  id="teilen-notiz"
                  value={notiz}
                  onChange={(e) => setNotiz(e.target.value)}
                  maxLength={NOTIZ_MAX}
                  rows={2}
                  placeholder="z. B. Für die 11. Klasse, ca. 2 Doppelstunden"
                  className="rounded-xl border-ws-line bg-ws-bg text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
                />
                <p className="text-right text-xs text-ws-faint" aria-live="polite">
                  {notiz.length} / {NOTIZ_MAX}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {fehler && (
        <p role="alert" className="text-sm text-ws-red">
          {fehler}
        </p>
      )}

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={schliessen} className={`${NEBENAKTION} px-5`}>
          {entnommen ? 'Schließen' : 'Abbrechen'}
        </Button>
        {!entnommen && (
          <Button type="submit" disabled={gesperrt} className={HAUPTAKTION}>
            {speichert && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
            Speichern
          </Button>
        )}
      </DialogFooter>
    </form>
  )
}

/** Suchfeld für Kolleginnen und Kollegen; die Ausgewählten stehen als Chips mit ✕ darunter */
function PersonenWahl({
  personen,
  setPersonen,
}: {
  personen: FreigabePerson[]
  setPersonen: (neu: FreigabePerson[] | ((alt: FreigabePerson[]) => FreigabePerson[])) => void
}) {
  const [eingabe, setEingabe] = useState('')
  const [treffer, setTreffer] = useState<{ id: string; name: string }[]>([])
  /** Zu welchem Suchbegriff die Treffer gehören (sonst zeigen wir „nichts gefunden“ zu früh) */
  const [gesuchtFuer, setGesuchtFuer] = useState('')
  const [sucheFehler, setSucheFehler] = useState<string | null>(null)

  const begriff = eingabe.trim()

  // Erst nach kurzer Pause fragen; die Abfrage startet im Zeitgeber, nicht im Effekt selbst
  useEffect(() => {
    if (begriff.length < 2) return
    let aktuell = true
    const t = setTimeout(() => {
      sucheLehrkraefte(begriff)
        .then((l) => {
          if (!aktuell) return
          setTreffer(l)
          setSucheFehler(null)
          setGesuchtFuer(begriff)
        })
        .catch((e) => {
          if (!aktuell) return
          setSucheFehler(meldung(e))
          setGesuchtFuer(begriff)
        })
    }, SUCH_PAUSE_MS)
    return () => {
      aktuell = false
      clearTimeout(t)
    }
  }, [begriff])

  const gewaehlt = new Set(personen.map((p) => p.id))
  // Treffer und Fehler zählen nur zum Begriff, zu dem sie gehören
  const aktuellGesucht = begriff.length >= 2 && gesuchtFuer === begriff
  const frei = aktuellGesucht ? treffer.filter((t) => !gewaehlt.has(t.id)) : []
  const voll = personen.length >= MAX_PERSONEN

  return (
    <div className="space-y-3 pl-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-faint" aria-hidden />
        <Input
          type="search"
          value={eingabe}
          onChange={(e) => setEingabe(e.target.value)}
          placeholder={voll ? `Höchstens ${MAX_PERSONEN} Personen` : 'Name der Kollegin oder des Kollegen'}
          aria-label="Lehrkräfte suchen"
          disabled={voll}
          maxLength={60}
          className={`${FELD} pl-9`}
        />
      </div>

      {aktuellGesucht && sucheFehler && (
        <p role="alert" className="text-sm text-ws-red">
          {sucheFehler}
        </p>
      )}
      {aktuellGesucht && !sucheFehler && frei.length === 0 && (
        <p className="text-sm text-ws-muted">Keine passende Lehrkraft gefunden.</p>
      )}
      {frei.length > 0 && (
        <ul className="max-h-44 overflow-y-auto rounded-xl border border-ws-line" aria-label="Suchergebnisse">
          {frei.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setPersonen((alt) => [...alt, { id: t.id, name: t.name, aktiv: true }])
                  setEingabe('')
                  setTreffer([])
                }}
                className="min-h-11 w-full px-3 text-left text-sm hover:bg-ws-raised focus-visible:bg-ws-raised focus-visible:outline-none"
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {personen.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Ausgewählte Personen">
          {personen.map((p) => (
            <li
              key={p.id}
              className={`flex min-h-11 items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm ${
                p.aktiv ? 'border-ws-line bg-ws-bg' : 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange'
              }`}
            >
              <span className="max-w-48 truncate" title={p.name}>
                {p.name}
              </span>
              {!p.aktiv && <span className="text-xs">kein Zugang mehr</span>}
              <button
                type="button"
                onClick={() => setPersonen((alt) => alt.filter((x) => x.id !== p.id))}
                aria-label={`${p.name} entfernen`}
                className="flex size-9 items-center justify-center rounded-full hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ws-faint">
        {personen.length} von {MAX_PERSONEN} Personen
      </p>
    </div>
  )
}
