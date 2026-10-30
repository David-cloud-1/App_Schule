'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CircleAlert,
  Download,
  Eye,
  FileDown,
  FilePenLine,
  Library,
  Loader2,
  MoreHorizontal,
  PencilLine,
  Play,
  Repeat,
  Search,
  SearchX,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { HAUPTAKTION, NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { VorschauDialog } from '@/components/werkzeugkiste/vorschau-dialog'
import { ablaufHref, neuerAblaufHref, WERKZEUGE } from '@/lib/werkzeugkiste'
import {
  antwortHref,
  benenneMaterialUm,
  downloadHref,
  kopiereFuerAnderesWerkzeug,
  ladeMaterialien,
  loescheAblauf,
  WerkzeugFehler,
} from '@/lib/werkzeugkiste-api'
import {
  anderesWerkzeugErlaubt,
  entwurfStand,
  formatiereSpeicher,
  loeschHinweis,
  relativesDatum,
  speicherStand,
  TITEL_MAX,
  ueberarbeitenErlaubt,
  untertitel,
  werkzeugName,
  type MaterialListe,
  type MaterialZeile,
} from '@/lib/werkzeugkiste-materialien'

const FELD = 'min-h-11 rounded-xl border-ws-line bg-ws-surface text-ws-text focus:ring-ws-green'
const MENUE = 'border-ws-line bg-ws-surface text-ws-text'
/** Wartezeit nach dem letzten Tippen im Suchfeld */
const SUCH_PAUSE_MS = 300
const ALLE = 'alle'

const FEHLER_ALLGEMEIN = 'Das hat gerade nicht geklappt. Bitte versuche es erneut.'
const meldung = (e: unknown) => (e instanceof WerkzeugFehler ? e.message : FEHLER_ALLGEMEIN)

/**
 * Reiter „Meine Materialien“ (PROJ-52, Paket 1). Zeigt Entwürfe (oben) und
 * fertige Materialien der angemeldeten Lehrkraft, mit Suche, Werkzeug-Filter
 * und „Mehr laden“ ab 50 Einträgen. Auf dem Handy wird jede Zeile zur Karte.
 *
 * `onLeer` meldet der Seite, ob die Ablage ganz leer ist — dann steht die
 * Hauptaktion nur im Leerzustand und nicht zusätzlich im Seitenkopf.
 */
export function MeineMaterialien({ onLeer }: { onLeer?: (leer: boolean) => void }) {
  const [eingabe, setEingabe] = useState('')
  const [suche, setSuche] = useState('')
  const [werkzeug, setWerkzeug] = useState(ALLE)

  const [liste, setListe] = useState<MaterialListe | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [ladtMehr, setLadtMehr] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [mehrFehler, setMehrFehler] = useState<string | null>(null)
  const seite = useRef(1)
  /** Verwirft Antworten veralteter Abfragen (schnelles Tippen, Filterwechsel) */
  const abfrageNr = useRef(0)

  const [vorschau, setVorschau] = useState<MaterialZeile | null>(null)
  const [umbenennen, setUmbenennen] = useState<MaterialZeile | null>(null)
  const [loeschen, setLoeschen] = useState<MaterialZeile | null>(null)

  // Suchfeld: erst nach kurzer Pause abfragen
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
      const daten = await ladeMaterialien({ suche, werkzeug: werkzeug === ALLE ? '' : werkzeug, seite: 1 })
      if (nr !== abfrageNr.current) return
      setListe(daten)
    } catch (e) {
      if (nr !== abfrageNr.current) return
      setFehler(meldung(e))
    } finally {
      if (nr === abfrageNr.current) setLaedt(false)
    }
  }, [suche, werkzeug])

  useEffect(() => {
    void lade()
  }, [lade])

  async function ladeMehr() {
    const nr = abfrageNr.current
    setLadtMehr(true)
    setMehrFehler(null)
    try {
      const daten = await ladeMaterialien({ suche, werkzeug: werkzeug === ALLE ? '' : werkzeug, seite: seite.current + 1 })
      if (nr !== abfrageNr.current) return
      seite.current += 1
      setListe((alt) => (alt ? { ...daten, eintraege: [...alt.eintraege, ...daten.eintraege] } : daten))
    } catch (e) {
      if (nr === abfrageNr.current) setMehrFehler(meldung(e))
    } finally {
      setLadtMehr(false)
    }
  }

  const gefiltert = suche.trim() !== '' || werkzeug !== ALLE
  const komplettLeer = !laedt && !fehler && !!liste && liste.eintraege.length === 0 && !gefiltert

  useEffect(() => {
    onLeer?.(komplettLeer)
  }, [komplettLeer, onLeer])

  function zuruecksetzen() {
    setEingabe('')
    setSuche('')
    setWerkzeug(ALLE)
  }

  function entferne(id: string) {
    setListe((alt) => (alt ? { ...alt, eintraege: alt.eintraege.filter((z) => z.id !== id), gesamt: Math.max(0, alt.gesamt - 1) } : alt))
  }

  function setzeTitel(id: string, titel: string) {
    setListe((alt) => (alt ? { ...alt, eintraege: alt.eintraege.map((z) => (z.id === id ? { ...z, titel } : z)) } : alt))
  }

  const speicher = liste ? speicherStand(liste.speicher) : null

  if (!liste && laedt) return <AdminLoadingState variant="list" rows={5} label="Materialien werden geladen …" />
  if (!liste && fehler) return <AdminErrorState message={fehler} onRetry={() => void lade()} />

  if (komplettLeer) {
    return (
      <AdminEmptyState
        icon={Library}
        title="Noch kein Material erstellt."
        description="Lade ein Skript hoch. Dein fertiges Material landet danach automatisch hier."
        action={
          <Button asChild className={HAUPTAKTION}>
            <Link href={neuerAblaufHref()}>
              <Upload className="mr-2 size-5" aria-hidden />
              Skript hochladen
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {speicher?.hinweis && liste && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-ws-orange/30 bg-ws-orange/10 p-4 text-sm">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-ws-orange" aria-hidden />
          <p className="leading-relaxed">
            {speicher.voll
              ? 'Dein Speicher ist voll. Neue Materialien kannst du erst wieder erstellen, wenn du Altes löschst.'
              : `Dein Speicher ist zu ${speicher.prozent} % voll (${formatiereSpeicher(liste.speicher.genutztBytes)} von ${formatiereSpeicher(liste.speicher.grenzeBytes)}). Lösche Altes, damit du weiter Material erstellen kannst.`}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-faint" aria-hidden />
          <Input
            type="search"
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            placeholder="Titel oder Skript suchen"
            aria-label="Materialien durchsuchen"
            maxLength={100}
            className="min-h-11 rounded-xl border-ws-line bg-ws-surface pl-9 text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
          />
        </div>
        <Select value={werkzeug} onValueChange={setWerkzeug}>
          <SelectTrigger aria-label="Nach Werkzeug filtern" className={`${FELD} sm:w-56`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={MENUE}>
            <SelectItem value={ALLE} className="min-h-11">
              Alle Werkzeuge
            </SelectItem>
            {WERKZEUGE.filter((w) => w.aktiv).map((w) => (
              <SelectItem key={w.id} value={w.id} className="min-h-11">
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {fehler ? (
        <AdminErrorState message={fehler} onRetry={() => void lade()} />
      ) : laedt ? (
        <AdminLoadingState variant="list" rows={4} label="Materialien werden geladen …" />
      ) : liste && liste.eintraege.length === 0 ? (
        <AdminEmptyState
          icon={SearchX}
          title="Nichts gefunden"
          description="Zu deiner Suche gibt es kein Material. Prüfe die Schreibweise oder setze die Suche zurück."
          action={
            <Button variant="outline" onClick={zuruecksetzen} className={`${NEBENAKTION} px-5`}>
              Suche zurücksetzen
            </Button>
          }
        />
      ) : (
        liste && (
          <>
            <p className="sr-only" aria-live="polite">
              {liste.gesamt} {liste.gesamt === 1 ? 'Eintrag' : 'Einträge'}
            </p>

            {/* Desktop und Tablet: Tabelle im Rahmen, erste Spalte steht */}
            <div className="ws-table-scroll ws-table-sticky hidden overflow-hidden rounded-2xl border border-ws-line bg-ws-surface md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-ws-line bg-ws-bg hover:bg-ws-bg">
                    <TableHead className="text-ws-muted">Titel</TableHead>
                    <TableHead className="text-ws-muted">Werkzeug</TableHead>
                    <TableHead className="text-ws-muted">Erstellt</TableHead>
                    <TableHead className="text-right text-ws-muted">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liste.eintraege.map((z) => (
                    <TableRow key={z.id} className="border-ws-line hover:bg-ws-bg/40">
                      <TableCell className="max-w-xs align-top">
                        <TitelZelle z={z} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top text-ws-muted">{werkzeugName(z.werkzeug)}</TableCell>
                      <TableCell className="whitespace-nowrap align-top text-ws-muted">{relativesDatum(z.erstelltAm)}</TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center justify-end gap-2">
                          <Hauptknopf z={z} />
                          <ZeilenMenue z={z} setVorschau={setVorschau} setUmbenennen={setUmbenennen} setLoeschen={setLoeschen} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Handy: jede Zeile eine Karte */}
            <ul className="space-y-3 md:hidden">
              {liste.eintraege.map((z) => (
                <li key={z.id} className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-4">
                  <TitelZelle z={z} />
                  <p className="text-sm text-ws-muted">
                    {werkzeugName(z.werkzeug)} · {relativesDatum(z.erstelltAm)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Hauptknopf z={z} voll />
                    <ZeilenMenue z={z} setVorschau={setVorschau} setUmbenennen={setUmbenennen} setLoeschen={setLoeschen} />
                  </div>
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

      {vorschau && (
        <VorschauDialog key={vorschau.id} ablaufId={vorschau.id} titel={vorschau.titel} offen onOpenChange={(offen) => !offen && setVorschau(null)} />
      )}
      <UmbenennenDialog
        key={umbenennen?.id ?? 'umbenennen'}
        zeile={umbenennen}
        schliessen={() => setUmbenennen(null)}
        gespeichert={(id, titel) => {
          setzeTitel(id, titel)
          setUmbenennen(null)
          toast.success('Titel geändert')
        }}
      />
      <LoeschenDialog
        key={loeschen?.id ?? 'loeschen'}
        zeile={loeschen}
        schliessen={() => setLoeschen(null)}
        geloescht={(id) => {
          entferne(id)
          setLoeschen(null)
          toast.success('Material gelöscht')
        }}
      />
    </div>
  )
}

/** Titel, darunter Format · aus Skript bzw. Stand des Entwurfs */
function TitelZelle({ z }: { z: MaterialZeile }) {
  const entwurf = z.art === 'entwurf'
  const frist = entwurf ? loeschHinweis(z.laeuftAbAm) : null
  const klein = entwurf ? entwurfStand(z.schritt) : untertitel(z)
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        {entwurf && (
          <Badge className="rounded-full border border-ws-blue/30 bg-ws-blue/15 px-2.5 py-0.5 text-xs font-semibold text-ws-blue hover:bg-ws-blue/15">
            Entwurf
          </Badge>
        )}
        <span className="min-w-0 truncate font-semibold text-ws-text" title={z.titel}>
          {z.titel}
        </span>
      </div>
      {klein && (
        <p className="truncate text-sm text-ws-muted" title={klein}>
          {klein}
        </p>
      )}
      {frist && <p className="text-sm font-medium text-ws-orange">{frist}</p>}
      {z.skriptEntfernt && <p className="text-xs text-ws-faint">Skript entfernt</p>}
    </div>
  )
}

/** Entwurf: Fortsetzen · Material: Herunterladen (bei reinen Texten „Öffnen“) */
function Hauptknopf({ z, voll }: { z: MaterialZeile; voll?: boolean }) {
  const breite = voll ? 'flex-1' : ''
  const gruen = `min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green ${breite}`
  if (z.art === 'entwurf') {
    return (
      <Button asChild className={gruen}>
        <Link href={ablaufHref(z.id, z.schritt)}>
          <Play className="mr-2 size-4" aria-hidden />
          Fortsetzen
          <span className="sr-only">: {z.titel}</span>
        </Link>
      </Button>
    )
  }
  if (!z.hatDatei) {
    return (
      <Button asChild variant="outline" className={`${NEBENAKTION} ${breite}`}>
        <Link href={ablaufHref(z.id, 5)}>
          <Eye className="mr-2 size-4" aria-hidden />
          Öffnen
          <span className="sr-only">: {z.titel}</span>
        </Link>
      </Button>
    )
  }
  return (
    <Button asChild variant="outline" className={`${NEBENAKTION} ${breite}`}>
      <a href={downloadHref(z.id)} download>
        <Download className="mr-2 size-4" aria-hidden />
        Herunterladen
        <span className="sr-only">: {z.titel}</span>
      </a>
    </Button>
  )
}

function ZeilenMenue({
  z,
  setVorschau,
  setUmbenennen,
  setLoeschen,
}: {
  z: MaterialZeile
  setVorschau: (z: MaterialZeile) => void
  setUmbenennen: (z: MaterialZeile) => void
  setLoeschen: (z: MaterialZeile) => void
}) {
  const [kopiert, setKopiert] = useState(false)
  const entwurf = z.art === 'entwurf'
  const ueberarbeiten = ueberarbeitenErlaubt(z)
  const anderes = anderesWerkzeugErlaubt(z)
  const punkt = 'min-h-11 cursor-pointer gap-2 focus:bg-ws-raised focus:text-ws-text'

  async function anderesWerkzeugStarten() {
    setKopiert(true)
    try {
      const { ablauf } = await kopiereFuerAnderesWerkzeug(z.id)
      window.location.href = ablaufHref(ablauf.id, 2)
    } catch (e) {
      toast.error(meldung(e))
      setKopiert(false)
    }
  }

  return (
    // modal={false}: Sonst bleibt nach dem Öffnen eines Dialogs aus dem Menü die Seite gesperrt
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={kopiert}
          aria-label={`Weitere Aktionen für ${z.titel}`}
          className="size-11 shrink-0 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
        >
          {kopiert ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <MoreHorizontal className="size-5" aria-hidden />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`${MENUE} min-w-64`}>
        {!entwurf && z.hatVorschau && (
          <DropdownMenuItem className={punkt} onSelect={() => setVorschau(z)}>
            <Eye className="size-4" aria-hidden />
            Vorschau ansehen
          </DropdownMenuItem>
        )}
        {!entwurf && (
          <DropdownMenuItem asChild={ueberarbeiten.erlaubt} disabled={!ueberarbeiten.erlaubt} className={`${punkt} items-start`}>
            {ueberarbeiten.erlaubt ? (
              <Link href={ablaufHref(z.id, 4)}>
                <PencilLine className="size-4" aria-hidden />
                Überarbeiten
              </Link>
            ) : (
              <>
                <PencilLine className="mt-0.5 size-4" aria-hidden />
                <span className="grid">
                  Überarbeiten
                  <span className="text-xs text-ws-faint">{ueberarbeiten.grund}</span>
                </span>
              </>
            )}
          </DropdownMenuItem>
        )}
        {!entwurf && (
          <DropdownMenuItem
            disabled={!anderes.erlaubt}
            className={`${punkt} items-start`}
            onSelect={() => void anderesWerkzeugStarten()}
          >
            <Repeat className="mt-0.5 size-4" aria-hidden />
            <span className="grid">
              Gleiches Skript, anderes Werkzeug
              {!anderes.erlaubt && <span className="text-xs text-ws-faint">{anderes.grund}</span>}
            </span>
          </DropdownMenuItem>
        )}
        {!entwurf && (
          <DropdownMenuItem className={punkt} onSelect={() => setUmbenennen(z)}>
            <FilePenLine className="size-4" aria-hidden />
            Umbenennen
          </DropdownMenuItem>
        )}
        {!entwurf && z.hatAntwort && (
          <DropdownMenuItem asChild className={punkt}>
            <a href={antwortHref(z.id)} download>
              <FileDown className="size-4" aria-hidden />
              KI-Antwort herunterladen
            </a>
          </DropdownMenuItem>
        )}
        {!entwurf && <DropdownMenuSeparator className="bg-ws-line" />}
        <DropdownMenuItem className={`${punkt} text-ws-red focus:text-ws-red`} onSelect={() => setLoeschen(z)}>
          <Trash2 className="size-4" aria-hidden />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UmbenennenDialog({
  zeile,
  schliessen,
  gespeichert,
}: {
  zeile: MaterialZeile | null
  schliessen: () => void
  gespeichert: (id: string, titel: string) => void
}) {
  // Der Dialog wird je Material neu eingehängt (key), startet also immer mit dem bisherigen Titel
  const [titel, setTitel] = useState(zeile?.titel ?? '')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const sauber = titel.trim()
  const gesperrt = speichert || sauber.length === 0 || sauber === zeile?.titel

  async function speichern(e: React.FormEvent) {
    e.preventDefault()
    if (!zeile || gesperrt) return
    setSpeichert(true)
    setFehler(null)
    try {
      await benenneMaterialUm(zeile.id, sauber)
      gespeichert(zeile.id, sauber)
    } catch (err) {
      setFehler(meldung(err))
      setSpeichert(false)
    }
  }

  return (
    <Dialog open={!!zeile} onOpenChange={(offen) => !offen && schliessen()}>
      <DialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
        <form onSubmit={speichern} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Material umbenennen</DialogTitle>
            <DialogDescription className="text-ws-muted">Der neue Titel erscheint in deiner Liste. Die Datei bleibt gleich.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="wk-material-titel">Titel</Label>
            <Input
              id="wk-material-titel"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              maxLength={TITEL_MAX}
              autoComplete="off"
              className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green"
            />
            {fehler && (
              <p role="alert" className="text-sm text-ws-red">
                {fehler}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={schliessen} className={`${NEBENAKTION} px-5`}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={gesperrt} className={HAUPTAKTION}>
              {speichert && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LoeschenDialog({
  zeile,
  schliessen,
  geloescht,
}: {
  zeile: MaterialZeile | null
  schliessen: () => void
  geloescht: (id: string) => void
}) {
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const entwurf = zeile?.art === 'entwurf'

  async function loesche() {
    if (!zeile) return
    setLaeuft(true)
    setFehler(null)
    try {
      await loescheAblauf(zeile.id)
      geloescht(zeile.id)
    } catch (e) {
      setFehler(meldung(e))
      setLaeuft(false)
    }
  }

  return (
    <AlertDialog open={!!zeile} onOpenChange={(offen) => !offen && !laeuft && schliessen()}>
      <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
        <AlertDialogHeader>
          <AlertDialogTitle>{entwurf ? 'Entwurf löschen?' : 'Material endgültig löschen?'}</AlertDialogTitle>
          <AlertDialogDescription className="text-ws-muted">
            {entwurf
              ? 'Das hochgeladene Skript und alle Eingaben werden gelöscht.'
              : `„${zeile?.titel ?? ''}“ wird mit allen Dateien gelöscht. Das lässt sich nicht rückgängig machen.`}
          </AlertDialogDescription>
          {fehler && (
            <p role="alert" className="text-sm text-ws-red">
              {fehler}
            </p>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={NEBENAKTION} disabled={laeuft}>
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void loesche()
            }}
            disabled={laeuft}
            className="min-h-11 rounded-xl bg-ws-red font-semibold text-ws-on-accent hover:bg-ws-red-hover"
          >
            {laeuft && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
