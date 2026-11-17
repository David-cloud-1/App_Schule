'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, FileText, Loader2, Search, Eye } from 'lucide-react'
import { AdminTabs, AdminTabsList, AdminTabsTrigger } from '@/components/admin/admin-tabs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import {
  WerkzeugFehler,
  baueUebernahmeVorschau,
  holeUebernahme,
  ladeMaterialien,
  ladeRegal,
  ladeSeitenText,
  ladeUebernahmeGliederung,
  type UebernahmeErgebnis,
} from '@/lib/werkzeugkiste-api'
import { findeWerkzeug } from '@/lib/werkzeugkiste'
import { istEditierbar } from '@/lib/werkzeugkiste-editor'
import {
  auswahlText,
  type Gliederung,
  type QuelleRef,
  type UebernahmeAuswahl,
} from '@/lib/werkzeugkiste-uebernahme'
import { cn } from '@/lib/utils'

/** Eine Quelle in der Liste: eigenes Material oder Eintrag im Regal */
interface Eintrag {
  ref: QuelleRef
  titel: string
  werkzeug: string
  von?: string
}

type Reiter = 'eigen' | 'regal'

/** Was die Vorschau gerade zeigt */
type Zeig = { art: 'thema'; thema: number } | { art: 'block'; thema: number; block: number } | { art: 'frage'; nr: number }

const LEERE_AUSWAHL: UebernahmeAuswahl = { themen: [], bloecke: [], fragen: [] }
const NICHT_GEFUNDEN_HINWEIS = 'Dieses Material gibt es nicht mehr oder du darfst es nicht mehr sehen.'

function nachricht(e: unknown) {
  return e instanceof WerkzeugFehler ? e.message : 'Das hat gerade nicht geklappt. Bitte versuche es gleich noch einmal.'
}

/**
 * „Aus Material übernehmen“ (PROJ-108). Zwei Reiter (eigene Materialien, Regal), dann die Gliederung
 * der gewählten Quelle mit Kontrollkästchen und einer Vorschau des angeklickten Themas oder Blocks.
 * Der Dialog nennt dem Server nur Quelle und Nummern; die Inhalte (und die Bilder) holt der Server.
 * Eingefügt wird von außen (`onUebernommen`), über die zentrale Einsetzen-Funktion des Editors.
 */
export function UebernehmenDialog({
  offen,
  onOpenChange,
  zielId,
  seitenGroesse,
  onUebernommen,
}: {
  offen: boolean
  onOpenChange: (offen: boolean) => void
  zielId: string
  seitenGroesse: number
  onUebernommen: (r: UebernahmeErgebnis) => void
}) {
  const [reiter, setReiter] = useState<Reiter>('eigen')
  const [suche, setSuche] = useState('')
  const [werkzeug, setWerkzeug] = useState('')
  const [liste, setListe] = useState<Eintrag[] | null>(null)
  const [listeFehler, setListeFehler] = useState<string | null>(null)
  const [quelle, setQuelle] = useState<Eintrag | null>(null)

  const [gliederung, setGliederung] = useState<Gliederung | null>(null)
  const [gliederungFehler, setGliederungFehler] = useState<string | null>(null)
  const [auswahl, setAuswahl] = useState<UebernahmeAuswahl>(LEERE_AUSWAHL)
  const [zeig, setZeig] = useState<Zeig | null>(null)
  const [vorschau, setVorschau] = useState<{ html: string | null; fehler: string | null; laedt: boolean }>({ html: null, fehler: null, laedt: false })
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const vorschauNr = useRef(0)
  // Zählt Sitzungen des Dialogs: Eine Antwort, die nach dem Schließen eintrifft, wird nie eingefügt
  const sitzung = useRef(0)
  const [neuLaden, setNeuLaden] = useState(0)

  // Beim Öffnen alles zurücksetzen (Zustand während des Renderns angleichen statt im Effekt)
  const [warOffen, setWarOffen] = useState(false)
  if (offen !== warOffen) {
    setWarOffen(offen)
    if (offen) {
      setReiter('eigen')
      setSuche('')
      setWerkzeug('')
      setListe(null)
      setListeFehler(null)
      setQuelle(null)
      setGliederung(null)
      setGliederungFehler(null)
      setAuswahl(LEERE_AUSWAHL)
      setZeig(null)
      setVorschau({ html: null, fehler: null, laedt: false })
      setFehler(null)
      vorschauNr.current += 1
    }
    sitzung.current += 1
  }

  // Liste der Quellen laden (mit kleiner Verzögerung beim Tippen)
  useEffect(() => {
    if (!offen || quelle) return
    let aktiv = true
    setListe(null)
    setListeFehler(null)
    const t = setTimeout(
      () => {
        const holen: Promise<Eintrag[]> =
          reiter === 'eigen'
            ? ladeMaterialien({ suche, werkzeug, seite: 1 }).then((l) =>
                l.eintraege
                  .filter((m) => m.art === 'material' && m.baukasten === 'bearbeiten')
                  .map((m) => ({ ref: { art: 'eigen' as const, id: m.id }, titel: m.titel, werkzeug: m.werkzeug })),
              )
            : ladeRegal({ suche, fach: '', werkzeug, sortierung: 'neueste', seite: 1 }).then((l) =>
                l.eintraege
                  // Eigene Materialien stehen im Reiter „Meine Materialien“
                  .filter((k) => !k.vonMir && istEditierbar({ werkzeug: k.werkzeug, status: 'fertig', format: k.format }))
                  .map((k) => ({ ref: { art: 'regal' as const, id: k.id }, titel: k.titel, werkzeug: k.werkzeug, von: k.besitzerName })),
              )
        holen
          .then((l) => aktiv && setListe(l))
          .catch((e) => aktiv && setListeFehler(nachricht(e)))
      },
      suche ? 300 : 0,
    )
    return () => {
      aktiv = false
      clearTimeout(t)
    }
  }, [offen, quelle, reiter, suche, werkzeug, neuLaden])

  // Gliederung der gewählten Quelle
  useEffect(() => {
    if (!quelle) return
    let aktiv = true
    ladeUebernahmeGliederung(zielId, quelle.ref)
      .then((g) => aktiv && setGliederung(g))
      .catch((e) => aktiv && setGliederungFehler(nachricht(e)))
    return () => {
      aktiv = false
    }
  }, [quelle, zielId])

  function waehleQuelle(q: Eintrag) {
    setQuelle(q)
    setGliederung(null)
    setGliederungFehler(null)
    setAuswahl(LEERE_AUSWAHL)
    setZeig(null)
    setVorschau({ html: null, fehler: null, laedt: false })
    setFehler(null)
  }

  function zurueck() {
    setQuelle(null)
    setGliederung(null)
    setGliederungFehler(null)
    setZeig(null)
    setVorschau({ html: null, fehler: null, laedt: false })
    setFehler(null)
  }

  // Vorschau erst beim Anklicken bauen (kein Bau für alles, E: sehr große Quellen)
  const zeigeVorschau = useCallback(
    (z: Zeig) => {
      if (!quelle) return
      setZeig(z)
      const nr = ++vorschauNr.current
      setVorschau({ html: null, fehler: null, laedt: true })
      const a: UebernahmeAuswahl =
        z.art === 'thema'
          ? { themen: [z.thema], bloecke: [], fragen: [] }
          : z.art === 'block'
            ? { themen: [], bloecke: [{ thema: z.thema, block: z.block }], fragen: [] }
            : { themen: [], bloecke: [], fragen: [z.nr] }
      baueUebernahmeVorschau(zielId, quelle.ref, a)
        .then((r) => ladeSeitenText(r.adresse))
        .then((html) => nr === vorschauNr.current && setVorschau({ html, fehler: null, laedt: false }))
        .catch((e) => nr === vorschauNr.current && setVorschau({ html: null, fehler: nachricht(e), laedt: false }))
    },
    [quelle, zielId],
  )

  const themaGewaehlt = (t: number) => auswahl.themen.includes(t)
  const blockGewaehlt = (t: number, b: number) => auswahl.bloecke.some((o) => o.thema === t && o.block === b)

  function schalteThema(t: number, an: boolean) {
    setAuswahl((a) => ({
      ...a,
      themen: an ? [...a.themen.filter((x) => x !== t), t] : a.themen.filter((x) => x !== t),
      // Einzelne Blöcke dieses Themas zählen dann nicht mehr extra
      bloecke: an ? a.bloecke.filter((o) => o.thema !== t) : a.bloecke,
    }))
  }
  function schalteBlock(t: number, b: number, an: boolean) {
    setAuswahl((a) => ({
      ...a,
      bloecke: an ? [...a.bloecke, { thema: t, block: b }] : a.bloecke.filter((o) => !(o.thema === t && o.block === b)),
    }))
  }
  function schalteFrage(n: number, an: boolean) {
    setAuswahl((a) => ({ ...a, fragen: an ? [...a.fragen, n] : a.fragen.filter((x) => x !== n) }))
  }

  const anzahlBloecke = auswahl.bloecke.length + auswahl.fragen.length
  const nichtsGewaehlt = auswahl.themen.length === 0 && anzahlBloecke === 0

  async function uebernehmen() {
    if (!quelle || nichtsGewaehlt || laeuft) return
    setLaeuft(true)
    setFehler(null)
    const meine = sitzung.current
    try {
      const r = await holeUebernahme(zielId, quelle.ref, auswahl, seitenGroesse)
      // Abgebrochen oder geschlossen, während der Server arbeitete: nichts einfügen
      if (meine !== sitzung.current) return
      onOpenChange(false)
      onUebernommen(r)
    } catch (e) {
      if (meine !== sitzung.current) return
      // Das Material kann inzwischen zurückgezogen sein: verständlicher Satz, nichts wurde eingefügt
      setFehler(e instanceof WerkzeugFehler && e.status === 404 ? NICHT_GEFUNDEN_HINWEIS : nachricht(e))
    } finally {
      setLaeuft(false)
    }
  }

  const werkzeuge = useMemo(
    () => ['skript', 'kreativ', 'differenzierung', 'arbeitsblatt', 'lernsituation', 'eigen'].map((id) => ({ id, name: findeWerkzeug(id)?.name ?? id })),
    [],
  )

  return (
    <Dialog open={offen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-svh max-h-svh w-full max-w-none flex-col gap-0 rounded-none border-ws-line bg-ws-surface p-0 text-ws-text lg:h-[88svh] lg:max-w-6xl lg:rounded-2xl">
        <DialogHeader className="space-y-1 border-b border-ws-line p-4 pr-14 text-left sm:p-6 sm:pr-16">
          <DialogTitle className="text-xl font-bold">Aus Material übernehmen</DialogTitle>
          <DialogDescription className="text-ws-muted">
            Hole Themen oder einzelne Blöcke aus deinen Materialien oder dem Regal. Du bekommst eine eigene Kopie, das Original bleibt unberührt.
          </DialogDescription>
        </DialogHeader>

        {!quelle ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6">
            <AdminTabs value={reiter} onValueChange={(v) => setReiter(v as Reiter)}>
              <AdminTabsList>
                <AdminTabsTrigger value="eigen">Meine Materialien</AdminTabsTrigger>
                <AdminTabsTrigger value="regal">Regal</AdminTabsTrigger>
              </AdminTabsList>
            </AdminTabs>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-muted" aria-hidden />
                <Input
                  type="search"
                  value={suche}
                  onChange={(e) => setSuche(e.target.value)}
                  placeholder="Nach Titel suchen"
                  aria-label="Nach Titel suchen"
                  className="min-h-11 pl-9"
                />
              </div>
              <select
                value={werkzeug}
                onChange={(e) => setWerkzeug(e.target.value)}
                aria-label="Nach Werkzeug filtern"
                className="min-h-11 rounded-md border border-ws-line bg-ws-surface px-3 text-sm text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
              >
                <option value="">Alle Werkzeuge</option>
                {werkzeuge.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto" role="region" aria-label="Materialien" aria-busy={liste === null && !listeFehler}>
              {listeFehler ? (
                <div role="alert" className="space-y-3 py-6 text-center text-sm text-ws-red">
                  <p>{listeFehler}</p>
                  <Button variant="outline" className={NEBENAKTION} onClick={() => setNeuLaden((n) => n + 1)}>
                    Erneut versuchen
                  </Button>
                </div>
              ) : liste === null ? (
                <p className="flex items-center gap-2 py-6 text-sm text-ws-muted" role="status">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Wird geladen …
                </p>
              ) : liste.length === 0 ? (
                <p className="max-w-prose py-8 text-center text-ws-muted" role="status">
                  {suche || werkzeug
                    ? 'Dazu gibt es nichts. Ändere die Suche oder den Filter.'
                    : reiter === 'eigen'
                      ? 'Du hast noch keine fertige Interaktive Seite. Erstelle sie unter „Werkzeuge“, dann kannst du Teile daraus übernehmen.'
                      : 'Im Regal liegt noch keine Interaktive Seite, die du übernehmen kannst. Material erstellst und teilst du unter „Werkzeuge“.'}
                </p>
              ) : (
                <ul className="divide-y divide-ws-line rounded-xl border border-ws-line">
                  {liste.map((e) => (
                    <li key={`${e.ref.art}-${e.ref.id}`}>
                      <button
                        type="button"
                        onClick={() => waehleQuelle(e)}
                        className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
                      >
                        <FileText className="size-5 shrink-0 text-ws-muted" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium" title={e.titel}>
                            {e.titel}
                          </span>
                          <span className="block truncate text-sm text-ws-muted">
                            {findeWerkzeug(e.werkzeug)?.name ?? e.werkzeug}
                            {e.von ? ` · ${e.von}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:overflow-hidden">
            <section aria-label="Gliederung" className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="size-11 shrink-0" onClick={zurueck} aria-label="Zurück zur Liste" title="Zurück zur Liste">
                  <ArrowLeft className="size-5" aria-hidden />
                </Button>
                <div className="min-w-0">
                  <p className="truncate font-semibold" title={quelle.titel}>
                    {quelle.titel}
                  </p>
                  {gliederung?.herkunft && <p className="truncate text-sm text-ws-muted">aus dem Regal · {quelle.von}</p>}
                </div>
              </div>

              {gliederungFehler ? (
                <p role="alert" className="text-sm text-ws-red">
                  {gliederungFehler}
                </p>
              ) : !gliederung ? (
                <p className="flex items-center gap-2 text-sm text-ws-muted" role="status">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Gliederung wird geladen …
                </p>
              ) : gliederung.themen.length === 0 && gliederung.fragen.length === 0 ? (
                <p className="text-sm text-ws-muted" role="status">
                  In diesem Material gibt es noch nichts zu übernehmen.
                </p>
              ) : (
                <ul className="space-y-3">
                  {gliederung.themen.map((t, ti) => (
                    <li key={ti} className="rounded-xl border border-ws-line">
                      <div className="flex items-center gap-1 px-2">
                        <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 px-2">
                          <Checkbox checked={themaGewaehlt(ti)} onCheckedChange={(c) => schalteThema(ti, c === true)} aria-label={`Ganzes Thema „${t.titel}“ übernehmen`} />
                          <span className="min-w-0 truncate font-semibold" title={t.titel}>
                            {t.titel}
                          </span>
                        </label>
                        <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={() => zeigeVorschau({ art: 'thema', thema: ti })} aria-label={`Vorschau von Thema „${t.titel}“`} title="Vorschau">
                          <Eye className="size-5" aria-hidden />
                        </Button>
                      </div>
                      <ul className="border-t border-ws-line">
                        {t.bloecke.map((b, bi) => {
                          const inThema = themaGewaehlt(ti)
                          return (
                            <li key={bi} className="flex items-center gap-1 px-2">
                              <label className={cn('flex min-h-11 flex-1 items-center gap-3 px-2', b.passt && !inThema ? 'cursor-pointer' : 'cursor-default')}>
                                <Checkbox
                                  checked={inThema || blockGewaehlt(ti, bi)}
                                  disabled={inThema || !b.passt}
                                  onCheckedChange={(c) => schalteBlock(ti, bi, c === true)}
                                  aria-label={`${b.name}: ${b.kurz || 'ohne Text'} übernehmen`}
                                />
                                <span className={cn('min-w-0 flex-1 text-sm', !b.passt && 'text-ws-faint')}>
                                  <span className="font-medium">{b.name}</span>
                                  {b.kurz && (
                                    <span className="block truncate text-ws-muted" title={b.kurz}>
                                      {b.kurz}
                                    </span>
                                  )}
                                  {!b.passt && <span className="block text-ws-faint">Wird ausgelassen: Dieser Typ ist hier nicht möglich.</span>}
                                </span>
                              </label>
                              {b.passt && (
                                <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={() => zeigeVorschau({ art: 'block', thema: ti, block: bi })} aria-label={`Vorschau: ${b.name}`} title="Vorschau">
                                  <Eye className="size-5" aria-hidden />
                                </Button>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  ))}
                  {gliederung.fragen.length > 0 && (
                    <li className="rounded-xl border border-ws-line">
                      <p className="px-4 py-2 font-semibold">Fragen der Lernzielkontrolle</p>
                      <ul className="border-t border-ws-line">
                        {gliederung.fragen.map((b, i) => (
                          <li key={i} className="flex items-center gap-1 px-2">
                            <label className={cn('flex min-h-11 flex-1 items-center gap-3 px-2', b.passt ? 'cursor-pointer' : 'cursor-default')}>
                              <Checkbox checked={auswahl.fragen.includes(i)} disabled={!b.passt} onCheckedChange={(c) => schalteFrage(i, c === true)} aria-label={`Frage ${i + 1}: ${b.name} übernehmen`} />
                              <span className="min-w-0 flex-1 text-sm">
                                <span className="font-medium">{b.name}</span>
                                {b.kurz && <span className="block truncate text-ws-muted">{b.kurz}</span>}
                              </span>
                            </label>
                            {b.passt && (
                              <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={() => zeigeVorschau({ art: 'frage', nr: i })} aria-label={`Vorschau: Frage ${i + 1}`} title="Vorschau">
                                <Eye className="size-5" aria-hidden />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="border-t border-ws-line px-4 py-2 text-sm text-ws-muted">Sie kommen als einzelne Aufgaben, nicht als zweite Lernzielkontrolle.</p>
                    </li>
                  )}
                </ul>
              )}
            </section>

            <section aria-label="Vorschau" className="flex min-h-72 flex-col gap-2 lg:min-h-0">
              {!zeig ? (
                <p className="m-auto max-w-xs text-center text-sm text-ws-muted">Tippe auf das Auge neben einem Thema oder Block, um ihn hier anzusehen.</p>
              ) : vorschau.laedt ? (
                <p className="m-auto flex items-center gap-2 text-sm text-ws-muted" role="status">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Vorschau wird gebaut …
                </p>
              ) : vorschau.fehler ? (
                <p role="alert" className="m-auto max-w-xs text-center text-sm text-ws-red">
                  {vorschau.fehler}
                </p>
              ) : (
                // Abgeschottet: Skripte ja (Aufgaben zum Ausprobieren), kein Zugriff auf die App
                <iframe srcDoc={vorschau.html ?? ''} sandbox="allow-scripts" title="Vorschau des Gewählten" className="min-h-0 w-full flex-1 rounded-xl border border-ws-line bg-white" />
              )}
            </section>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-ws-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0 text-sm" aria-live="polite">
            {fehler ? (
              <p role="alert" className="text-ws-red">
                {fehler}
              </p>
            ) : quelle && !nichtsGewaehlt ? (
              <p className="text-ws-muted">{auswahlText(auswahl.themen.length, anzahlBloecke)} gewählt</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className={NEBENAKTION} onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            {quelle && (
              <Button
                className="min-h-11 bg-ws-green px-5 text-ws-on-accent hover:bg-ws-green-hover"
                disabled={nichtsGewaehlt || laeuft || !gliederung}
                onClick={uebernehmen}
              >
                {laeuft && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                {nichtsGewaehlt ? 'Übernehmen' : `${auswahlText(auswahl.themen.length, anzahlBloecke)} übernehmen`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
