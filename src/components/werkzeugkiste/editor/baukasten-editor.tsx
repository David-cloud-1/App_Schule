'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, CloudOff, Loader2, MoreHorizontal, Redo2, RotateCcw, Undo2, X } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { WERKZEUGKISTE_HREF } from '@/lib/werkzeugkiste'
import { ladeEditor, veroeffentlicheEntwurf, verwirfEntwurf } from '@/lib/werkzeugkiste-api'
import { befundeJeStelle, sprungmarke, type EditorDaten } from '@/lib/werkzeugkiste-editor'
import { HAUPTAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { EditorGliederung, type Auswahl } from '@/components/werkzeugkiste/editor/editor-gliederung'
import { EditorVorschau } from '@/components/werkzeugkiste/editor/editor-vorschau'
import { useEditorVorschau, useEditorZustand } from '@/components/werkzeugkiste/editor/use-editor-zustand'

const ZURUECK = `${WERKZEUGKISTE_HREF}?tab=materialien`

/**
 * Baukasten-Editor (PROJ-89): Gliederung links, Vorschau rechts (unter 1024 px
 * umschaltbar). Lädt das Material und übergibt an die eigentliche Arbeitsfläche.
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
  const [auswahl, setAuswahl] = useState<Auswahl>(null)
  const [ansicht, setAnsicht] = useState<'gliederung' | 'vorschau'>('gliederung')
  const [dialog, setDialog] = useState<'veroeffentlichen' | 'verwerfen' | 'schliessen' | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  // Solange es noch keine Vorschau-Befunde gibt, gelten die gespeicherten
  const befunde = v.befunde ?? daten.befunde
  const befundKarte = useMemo(() => befundeJeStelle(befunde), [befunde])
  const hatAenderungen = z.hatEntwurf() || z.speicherstand !== 'gespeichert'

  const marke =
    auswahl === null
      ? null
      : auswahl.art === 'deckblatt'
        ? null
        : auswahl.art === 'abschluss'
          ? sprungmarke('abschluss')
          : auswahl.art === 'thema'
            ? sprungmarke({ thema: auswahl.thema })
            : sprungmarke({ thema: auswahl.thema, block: auswahl.block })

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
      toast.success('Entwurf verworfen')
      neuLaden()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLaeuft(false)
    }
  }

  const tasten = apple ? '⌘' : 'Strg+'
  const kleinerKnopf = 'size-11 shrink-0 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text'
  const offeneHinweise = befunde?.length ?? 0

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
            <RotateCcw className="mr-2 size-4" aria-hidden /> Entwurf verwerfen
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

      <div className="grid flex-1 gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(22rem,1fr)_minmax(0,1.2fr)]">
        <section
          aria-label="Gliederung"
          // Schreibgeschützt: keine Eingaben mehr möglich, Inhalt bleibt lesbar
          inert={z.gesperrt ? true : undefined}
          aria-disabled={z.gesperrt ? true : undefined}
          className={cn('min-w-0', ansicht !== 'gliederung' && 'hidden lg:block', z.gesperrt && 'opacity-70')}
        >
          <EditorGliederung
            materialId={daten.id}
            struktur={z.struktur}
            aendere={z.aendere}
            rueckgaengig={z.rueckgaengig}
            auswahl={auswahl}
            setAuswahl={setAuswahl}
            befunde={befunde}
            befundKarte={befundKarte}
          />
        </section>
        <section
          aria-label="Vorschau"
          className={cn('min-w-0 lg:sticky lg:top-24 lg:h-[calc(100svh-7.5rem)]', ansicht !== 'vorschau' && 'hidden lg:block')}
        >
          <EditorVorschau html={v.html} laedt={v.laedt} fehler={v.fehler} marke={marke} neuLaden={v.neuBauen} />
        </section>
      </div>

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
                {z.struktur.chapters.length === 0 && <p className="text-ws-orange">Das Material hat keine Themen mehr.</p>}
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
            <AlertDialogTitle>Entwurf verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Änderungen seit dem letzten Veröffentlichen gehen verloren. Das Material ist danach wieder so, wie es
              veröffentlicht ist.
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
              Entwurf verwerfen
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
    </Huelle>
  )
}
