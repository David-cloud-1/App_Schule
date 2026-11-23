'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, Check, ChevronDown, FileText, History, Info, Printer, RotateCcw, TriangleAlert } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { AdminSegmented, SEGMENTED_MAX_OPTIONS } from '@/components/admin/admin-segmented'
import { AdminTabs, AdminTabsList, AdminTabsTrigger } from '@/components/admin/admin-tabs'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { OriginalAnsichtView } from '@/components/checklisten/original-ansicht'
import { ladeListe, setzeHaken, setzeVariante, startNeu } from '@/components/checklisten/checklisten-client'
import { findeCheckliste } from '@/lib/checklisten/listen'
import {
  berechneFortschritt,
  brauchtVariante,
  checklisteHref,
  datumDeutsch,
  findeVariante,
  fortschrittText,
  istFristAnnahme,
  sichtbareHinweise,
  sichtbareSchritte,
  standText,
  type Checkliste,
} from '@/lib/checklisten/liste'
import type { AnkerKarte, OriginalAnsicht } from '@/lib/checklisten/leitlinien-typen'
import type { Durchlauf, FruehererDurchlauf } from '@/lib/checklisten/katalog'
import { cn } from '@/lib/utils'

type Ansicht = 'checkliste' | 'original'

/**
 * Eine Checkliste mit dem Original daneben (PROJ-122). Haken werden sofort
 * gespeichert (gewünschter Zustand, nie „umschalten“) und springen bei einem
 * Fehler zurück. Ab 1024 px stehen Liste und Original nebeneinander, darunter
 * als Tabs.
 */
export function CheckListeSeite({
  listeId,
  originale,
  anker,
}: {
  listeId: string
  originale: OriginalAnsicht[]
  anker: AnkerKarte
}) {
  const liste = findeCheckliste(listeId)
  const [offen, setOffen] = useState<Durchlauf | null>(null)
  const [fruehere, setFruehere] = useState<FruehererDurchlauf[]>([])
  const [status, setStatus] = useState<'laedt' | 'fertig' | 'fehler'>('laedt')
  const [variante, setVarianteLokal] = useState<string | null>(null)
  const [haken, setHaken] = useState<string[]>([])
  const [beschaeftigt, setBeschaeftigt] = useState<ReadonlySet<string>>(new Set())
  const [ansicht, setAnsicht] = useState<Ansicht>('checkliste')
  const [markiert, setMarkiert] = useState<string | null>(null)
  const [neuDialog, setNeuDialog] = useState(false)
  const [neuLaeuft, setNeuLaeuft] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lade = useCallback(() => {
    setStatus((s) => (s === 'fertig' ? s : 'laedt'))
    ladeListe(listeId)
      .then((r) => {
        setOffen(r.offen)
        setFruehere(r.fruehere)
        setVarianteLokal(r.offen?.variante ?? null)
        setHaken(r.offen?.haken ?? [])
        setStatus('fertig')
      })
      .catch(() => setStatus((s) => (s === 'fertig' ? s : 'fehler')))
  }, [listeId])

  useEffect(() => {
    lade()
  }, [lade])

  // Zwei Geräte: beim Zurückkehren in den Tab den Stand frisch holen (kein Live-Abgleich nötig)
  useEffect(() => {
    const beiSichtbar = () => {
      if (document.visibilityState === 'visible' && beschaeftigt.size === 0) lade()
    }
    document.addEventListener('visibilitychange', beiSichtbar)
    return () => document.removeEventListener('visibilitychange', beiSichtbar)
  }, [lade, beschaeftigt])

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  if (!liste) return <AdminErrorState message="Diese Checkliste gibt es nicht." />

  const schritte = sichtbareSchritte(liste, variante)
  const hinweise = sichtbareHinweise(liste, variante)
  const fortschritt = berechneFortschritt(liste, variante, haken)
  const gewaehlt = findeVariante(liste, variante)
  const brauchtWahl = brauchtVariante(liste, variante)
  const geaendert = originale.filter((o) => o.geaendert)

  async function hakenAendern(schrittId: string, erledigt: boolean) {
    if (beschaeftigt.has(schrittId)) return // Doppelklick: kurze Sperre während des Speicherns
    const vorher = haken
    setBeschaeftigt((b) => new Set(b).add(schrittId))
    setHaken((h) => (erledigt ? (h.includes(schrittId) ? h : [...h, schrittId]) : h.filter((x) => x !== schrittId)))
    try {
      await setzeHaken(listeId, schrittId, erledigt, variante)
    } catch (e) {
      // Nicht stillschweigend verwerfen: Haken springt zurück und eine Meldung sagt, warum
      setHaken((h) => {
        const ohne = h.filter((x) => x !== schrittId)
        return vorher.includes(schrittId) ? [...ohne, schrittId] : ohne
      })
      toast.error(e instanceof Error ? e.message : 'Das hat nicht geklappt. Bitte versuche es erneut.')
    } finally {
      setBeschaeftigt((b) => {
        const n = new Set(b)
        n.delete(schrittId)
        return n
      })
    }
  }

  async function varianteWaehlen(neu: string) {
    const vorher = variante
    setVarianteLokal(neu)
    try {
      await setzeVariante(listeId, neu)
    } catch (e) {
      setVarianteLokal(vorher)
      toast.error(e instanceof Error ? e.message : 'Das hat nicht geklappt. Bitte versuche es erneut.')
    }
  }

  async function neuStarten() {
    setNeuLaeuft(true)
    try {
      await startNeu(listeId)
      setNeuDialog(false)
      setStatus('laedt')
      lade()
      toast.success('Neuer Durchlauf begonnen. Der bisherige ist gespeichert.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Das hat nicht geklappt. Bitte versuche es erneut.')
    } finally {
      setNeuLaeuft(false)
    }
  }

  function imOriginalAnsehen(schrittId: string) {
    const ziel = anker[schrittId]
    if (!ziel) return
    setAnsicht('original')
    setMarkiert(`${ziel.quelle}:${ziel.block}`)
    // Erst nach dem Umschalten (Handy: anderer Tab) zur Stelle scrollen
    setTimeout(() => {
      document
        .getElementById(`original-${ziel.quelle}-${ziel.block}`)
        ?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    }, 60)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMarkiert(null), 3000)
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <AdminPageHeader
        title={liste.titel}
        description={liste.beschreibung}
        breadcrumb={liste.titel}
        actions={
          <Button
            variant="outline"
            className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 size-4" aria-hidden />
            Drucken
          </Button>
        }
      >
        <p className="text-xs text-ws-faint">
          Für: {liste.fuerWen.join(', ')} · Leitlinie: {liste.quellen.map((q) => `${q.leitlinie} (${standText(q.stand)})`).join('; ')}
        </p>
      </AdminPageHeader>

      {geaendert.map((o) => (
        <div
          key={o.schluessel}
          role="alert"
          className="flex gap-2 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Die Leitlinie „{o.titel}“ wurde geändert{datumDeutsch(o.stand) ? ` (Stand ${datumDeutsch(o.stand)})` : ''}, seit diese Checkliste geprüft wurde. Bitte im Original prüfen.
          </span>
        </div>
      ))}

      {status === 'laedt' && <AdminLoadingState variant="list" rows={4} />}
      {status === 'fehler' && <AdminErrorState message="Die Checkliste konnte gerade nicht geladen werden." onRetry={lade} />}

      {status === 'fertig' && (
        <>
          <AdminTabs value={ansicht} onValueChange={(v) => setAnsicht(v as Ansicht)} className="lg:hidden print:hidden">
            <AdminTabsList aria-label="Ansicht">
              <AdminTabsTrigger value="checkliste">Checkliste</AdminTabsTrigger>
              <AdminTabsTrigger value="original">Original</AdminTabsTrigger>
            </AdminTabsList>
          </AdminTabs>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <section aria-label="Checkliste" className={cn('min-w-0 space-y-5', ansicht !== 'checkliste' && 'hidden lg:block lg:space-y-5')}>
              {liste.varianten && liste.varianten.length > 0 && (
                <div className="space-y-2">
                  <p id="varianten-frage" className="text-sm font-medium text-ws-text">
                    {liste.variantenFrage ?? 'Welcher Fall trifft zu?'}
                  </p>
                  {liste.varianten.length <= SEGMENTED_MAX_OPTIONS ? (
                    <AdminSegmented
                      value={variante ?? ''}
                      onChange={varianteWaehlen}
                      options={liste.varianten.map((v) => ({ value: v.id, label: v.label }))}
                      ariaLabel={liste.variantenFrage ?? 'Fall'}
                    />
                  ) : (
                    <Select value={variante ?? undefined} onValueChange={varianteWaehlen}>
                      <SelectTrigger
                        aria-labelledby="varianten-frage"
                        className="min-h-11 w-full max-w-sm rounded-xl border-ws-line bg-ws-surface text-ws-text focus:ring-ws-green"
                      >
                        <SelectValue placeholder="Bitte wählen …" />
                      </SelectTrigger>
                      <SelectContent>
                        {liste.varianten.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="min-h-11">
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {brauchtWahl && (
                <p className="rounded-xl border border-dashed border-ws-line bg-ws-surface/50 p-4 text-sm text-ws-muted">
                  Wähle oben den Fall aus. Danach siehst du die passenden Schritte.
                </p>
              )}

              {gewaehlt?.keinAntrag && (
                <p role="note" className="rounded-xl border border-ws-green/30 bg-ws-green/15 p-4 text-sm font-medium text-ws-green">
                  {gewaehlt.keinAntrag}
                </p>
              )}

              {hinweise.map((h) => (
                <div
                  key={h.id}
                  role="note"
                  className={cn(
                    'flex items-start gap-2 rounded-xl border p-3 text-sm',
                    h.art === 'warnung'
                      ? 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange'
                      : 'border-ws-blue/30 bg-ws-blue/15 text-ws-blue',
                  )}
                >
                  {h.art === 'warnung' ? (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  ) : (
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    {h.text}
                    {anker[h.id] && <ImOriginalKnopf onClick={() => imOriginalAnsehen(h.id)} />}
                  </span>
                </div>
              ))}

              {schritte.length > 0 && (
                <>
                  <div aria-live="polite" className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-ws-text">{fortschrittText(fortschritt)} erledigt</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Fortschritt"
                      aria-valuemin={0}
                      aria-valuemax={fortschritt.gesamt}
                      aria-valuenow={fortschritt.erledigt}
                      aria-valuetext={`${fortschrittText(fortschritt)} erledigt`}
                      className="h-2.5 overflow-hidden rounded-full bg-ws-raised"
                    >
                      <div
                        className="h-full rounded-full bg-ws-green transition-[width] duration-200 ease-out motion-reduce:transition-none"
                        style={{ width: `${(fortschritt.erledigt / fortschritt.gesamt) * 100}%` }}
                      />
                    </div>
                  </div>

                  <ol className="space-y-2">
                    {schritte.map((s, index) => {
                      const erledigt = haken.includes(s.id)
                      return (
                        <li key={s.id} className="rounded-xl border border-ws-line bg-ws-surface">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={erledigt}
                            aria-label={`Schritt ${index + 1}: ${s.text}, ${erledigt ? 'erledigt' : 'nicht erledigt'}`}
                            onClick={() => hakenAendern(s.id, !erledigt)}
                            className="flex min-h-11 w-full items-start gap-3 rounded-xl p-3 text-left transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
                          >
                            <span
                              aria-hidden
                              className={cn(
                                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-200',
                                erledigt ? 'border-ws-green bg-ws-green text-ws-on-accent' : 'border-ws-line bg-transparent',
                              )}
                            >
                              {erledigt && <Check className="size-4" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={cn('block text-base text-ws-text', erledigt && 'text-ws-muted line-through')}>
                                {s.text}
                              </span>
                              {s.zusatz && <span className="mt-0.5 block text-sm text-ws-muted">{s.zusatz}</span>}
                              {s.frist && (
                                <span className="mt-1 block text-sm font-medium text-ws-text">
                                  Frist: {s.frist}
                                  {istFristAnnahme(s, variante) && (
                                    <span className="ml-1 font-normal text-ws-orange">
                                      (Annahme, von der Schulleitung noch zu bestätigen)
                                    </span>
                                  )}
                                </span>
                              )}
                            </span>
                          </button>
                          {anker[s.id] && (
                            <div className="px-3 pb-2 pl-12 print:hidden">
                              <ImOriginalKnopf onClick={() => imOriginalAnsehen(s.id)} />
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ol>

                  {fortschritt.fertig && (
                    <div className="space-y-3 rounded-2xl border border-ws-green/30 bg-ws-green/15 p-5">
                      <p className="flex items-center gap-2 text-base font-semibold text-ws-green">
                        <Check className="size-5" aria-hidden />
                        Alles erledigt
                      </p>
                      <div className="flex flex-wrap gap-2 print:hidden">
                        {liste.weiter && (
                          <Button asChild className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
                            <Link href={checklisteHref(liste.weiter.id)}>
                              {liste.weiter.label}
                              <ArrowRight className="ml-2 size-4" aria-hidden />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => setNeuDialog(true)}
                          className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                        >
                          <RotateCcw className="mr-2 size-4" aria-hidden />
                          Neu starten
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!fortschritt.fertig && (offen !== null || haken.length > 0) && (
                <div className="print:hidden">
                  <Button
                    variant="ghost"
                    onClick={() => setNeuDialog(true)}
                    className="min-h-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
                  >
                    <RotateCcw className="mr-2 size-4" aria-hidden />
                    Neu starten
                  </Button>
                </div>
              )}

              {fruehere.length > 0 && (
                <Collapsible className="print:hidden">
                  <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 rounded-xl text-sm font-medium text-ws-muted hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
                    <History className="size-4" aria-hidden />
                    Frühere Durchläufe ({fruehere.length})
                    <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mt-2 space-y-2">
                      {fruehere.map((d) => (
                        <li key={d.id} className="rounded-xl border border-ws-line bg-ws-surface px-3 py-2 text-sm text-ws-muted">
                          <span className="font-medium text-ws-text">
                            {datumDeutsch(d.gestartet_am)} bis {datumDeutsch(d.archiviert_am)}
                          </span>
                          {' · '}
                          {liste.varianten?.find((v) => v.id === d.variante)?.label ?? 'ohne Auswahl'}
                          {' · '}
                          {d.anzahl_haken} {d.anzahl_haken === 1 ? 'Schritt' : 'Schritte'} abgehakt
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {liste.bemerkung && <p className="text-xs text-ws-faint">{liste.bemerkung}</p>}
            </section>

            <section
              aria-label="Original der Leitlinie"
              className={cn('min-w-0 print:hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2', ansicht !== 'original' && 'hidden lg:block')}
            >
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ws-faint max-lg:hidden">
                <FileText className="size-4" aria-hidden />
                Original
              </h2>
              <OriginalAnsichtView originale={originale} markiert={markiert} />
            </section>
          </div>
        </>
      )}

      <AlertDialog open={neuDialog} onOpenChange={setNeuDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neuen Durchlauf beginnen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Haken werden zurückgesetzt. Der bisherige Durchlauf bleibt mit Datum unter „Frühere Durchläufe“ gespeichert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={neuLaeuft}
              onClick={(e) => {
                e.preventDefault()
                void neuStarten()
              }}
              className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              Neu starten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ImOriginalKnopf({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ws-blue underline underline-offset-2 hover:text-ws-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green print:hidden"
    >
      <FileText className="size-4" aria-hidden />
      Im Original ansehen
    </button>
  )
}
